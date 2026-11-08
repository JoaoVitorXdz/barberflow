# BarberFlow

[![CI](https://github.com/JoaoVitorXdz/barberflow/actions/workflows/ci.yml/badge.svg)](https://github.com/JoaoVitorXdz/barberflow/actions/workflows/ci.yml)

API de agendamento **multi-tenant** para barbearias. Cada barbearia gerencia seus
barbeiros, serviços e horários; os clientes consultam horários livres e agendam online,
sem ligar nem mandar mensagem.

> Status: back-end completo e testado (autenticação, agendamento, notificações,
> documentação e CI). Deploy e front-end estão no [roadmap](#roadmap).

## O que o sistema faz

- Cadastro de barbearia (tenant) e de clientes, com login e JWT
- Cadastro de serviços (duração e preço) e de barbeiros, vinculados aos serviços que realizam
- Jornada semanal por barbeiro, com pausas (vários intervalos no mesmo dia)
- Bloqueios de agenda (folga, atestado)
- Consulta de **horários disponíveis** por barbeiro, serviço e data
- Agendamento, listagem e cancelamento, com controle de acesso por papel
- **Notificações assíncronas**: confirmação na hora e lembrete 2 horas antes

## Destaques de engenharia

**Concorrência resolvida no banco, e provada por teste.** Dois clientes tentando o mesmo
horário ao mesmo tempo é o caso que quebra a maioria dos sistemas de agendamento.
Aqui, a garantia vem de uma *exclusion constraint* do PostgreSQL sobre `tstzrange`: o banco
impede, por si só, dois agendamentos ativos sobrepostos para o mesmo barbeiro. A API faz uma
pré-validação amigável, mas quem decide é o banco. Um teste e2e dispara 10 reservas
simultâneas do mesmo horário e verifica que exatamente uma passa; outro teste insere
direto no banco, sem passar pela API, para isolar a constraint.

**Notificações que não se perdem.** A notificação é gravada na mesma transação do
agendamento; a fila (BullMQ) só cuida da entrega. Se o Redis cair, a reserva continua
funcionando, e um reconciliador entrega depois o que ficou pendente. Veja
[Notificações assíncronas](#notificações-assíncronas).

**Isolamento entre barbearias.** O `tenantId` vem sempre do token, nunca do corpo da
requisição, e toda consulta filtra por ele. Tentar acessar dado de outra barbearia
devolve 404, sem revelar que o dado existe.

**Fuso horário tratado de ponta a ponta.** O banco guarda tudo em UTC (`timestamptz`). A
jornada é cadastrada em hora local da barbearia, e o cálculo de disponibilidade converte
corretamente entre os dois. Esse cálculo é uma **função pura** com testes unitários que
cobrem pausa de almoço, bloqueios, serviços que ultrapassariam o fim da jornada e
horários que cruzam a meia-noite em UTC.

**Segurança básica.** Senhas com bcrypt, JWT com expiração, controle de acesso por papel
(RBAC), validação de entrada com lista de campos permitidos, SQL sempre parametrizado e
segredos fora do repositório.

## Stack

| Camada | Tecnologia |
|---|---|
| API | Node.js, TypeScript, NestJS |
| Banco | PostgreSQL 16 |
| Filas | Redis, BullMQ |
| Datas e fusos | luxon |
| Autenticação | JWT, bcryptjs |
| Documentação | OpenAPI / Swagger UI |
| Testes | Jest (unitários e e2e), supertest |
| Infra | Docker Compose, GitHub Actions |

## Arquitetura

Monólito modular: um único deploy, com módulos de fronteiras claras.

```mermaid
flowchart LR
    Client[Cliente / Front-end] -->|REST + JWT| API[API NestJS]
    API --> PG[(PostgreSQL)]
    API -->|jobs| Redis[(Redis + BullMQ)]
    Redis --> Worker[Worker de notificações]
    Worker --> PG
```

Módulos: `auth`, `services`, `barbers`, `working-hours`, `time-blocks`, `availability`,
`appointments`, `notifications`, `database` e `health`.

## Modelo de dados

```mermaid
erDiagram
    TENANTS ||--o{ USERS : tem
    TENANTS ||--o{ BARBERS : tem
    TENANTS ||--o{ SERVICES : oferece
    USERS ||--o| BARBERS : perfil
    BARBERS ||--o{ WORKING_HOURS : jornada
    BARBERS ||--o{ TIME_BLOCKS : bloqueios
    BARBERS }o--o{ SERVICES : realiza
    BARBERS ||--o{ APPOINTMENTS : atende
    USERS ||--o{ APPOINTMENTS : cliente
    SERVICES ||--o{ APPOINTMENTS : servico
    APPOINTMENTS ||--o{ NOTIFICATIONS : gera
```

O schema completo está em [`db/001_init.sql`](db/001_init.sql).

## API

A documentação interativa (Swagger UI) fica em `http://localhost:3000/docs` e a
especificação OpenAPI em `http://localhost:3000/docs-json`.

| Método | Rota | Quem pode |
|---|---|---|
| POST | `/auth/register-tenant` | Público |
| POST | `/auth/register-customer` | Público |
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| GET | `/health` | Público |
| GET | `/services` | Autenticado (cliente vê só os ativos) |
| POST | `/services` | Dono |
| PATCH | `/services/:id` | Dono |
| GET | `/barbers` | Autenticado |
| POST | `/barbers` | Dono |
| GET | `/barbers/:id/working-hours` | Autenticado |
| PUT | `/barbers/:id/working-hours` | Dono |
| GET | `/barbers/:id/time-blocks` | Autenticado |
| POST | `/barbers/:id/time-blocks` | Dono |
| DELETE | `/barbers/:id/time-blocks/:blockId` | Dono |
| GET | `/availability` | Autenticado |
| POST | `/appointments` | Cliente, dono ou recepção |
| GET | `/appointments` | Autenticado (cada papel vê o que lhe cabe) |
| PATCH | `/appointments/:id/cancel` | Cliente (os próprios), dono ou recepção |

## Regras de negócio

- **Disponibilidade:** os horários são gerados a cada 30 minutos dentro de cada janela da
  jornada, e o serviço precisa terminar dentro da janela. Somem os horários que
  se sobrepõem a bloqueios ou agendamentos ativos, ou que já passaram.
- **Agendamento:** o cliente agenda para si; dono e recepção agendam informando o cliente.
  O preço do serviço é copiado para o agendamento, então mudar o preço depois não altera o histórico.
- **Bloqueios:** não é possível bloquear um período que já tem cliente agendado (409).
- **Cancelamento:** só agendamentos futuros e ativos; ao cancelar, o horário volta a ficar livre.

## Notificações assíncronas

Ao agendar, o cliente recebe uma **confirmação** na hora e um **lembrete 2 horas antes**.
Cancelar o agendamento remove o lembrete pendente.

- As notificações são gravadas na tabela `notifications` **na mesma transação** do
  agendamento, então nunca existe agendamento sem suas notificações (nem o contrário).
- Depois do commit, cada uma vira um job no **BullMQ**, com o id da notificação como
  id do job (o que impede duplicatas) e com atraso até a hora de enviar. Falhas de envio
  são repetidas até 5 vezes, com espera crescente.
- Se o Redis estiver fora do ar, **a reserva não falha**: a notificação segue pendente
  no banco, e um **reconciliador** (a cada minuto) a coloca na fila quando o Redis volta.
  A entrega é, portanto, *pelo menos uma vez*.
- O envio é **simulado** (escrito no log) atrás da interface `NotificationSender`;
  trocar por um provedor real de e-mail é escrever uma classe nova.

## Como rodar

Pré-requisitos: **Node.js 24 ou superior** e **Docker**.

```bash
git clone https://github.com/JoaoVitorXdz/barberflow.git
cd barberflow

# 1. Banco e Redis (o schema é criado automaticamente na primeira subida)
cp .env.example .env
docker compose up -d

# 2. API
cd api
cp .env.example .env
npm install
```

Gere um segredo para o JWT e coloque-o em `api/.env` na variável `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Suba a API:

```bash
npm run start:dev
```

A API responde em `http://localhost:3000` e a documentação em `http://localhost:3000/docs`.

> No Windows (PowerShell), use `copy .env.example .env` no lugar de `cp`.

### Variáveis de ambiente (`api/.env`)

| Variável | Para que serve | Exemplo |
|---|---|---|
| `PORT` | Porta da API | `3000` |
| `DATABASE_URL` | Conexão com o PostgreSQL | `postgresql://barberflow:barberflow@localhost:5432/barberflow` |
| `JWT_SECRET` | Segredo que assina os tokens | (gerado como acima) |
| `JWT_EXPIRES_IN_SECONDS` | Validade do token | `3600` |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `NOTIFICATIONS_RECONCILE_INTERVAL_MS` | Intervalo do reconciliador; `0` desativa | `60000` |

## Testes

Com o Docker rodando (o e2e precisa do PostgreSQL e do Redis), dentro da pasta `api`:

```bash
# Unitários
npm test

# E2E: concorrência (10 reservas simultâneas) e notificações assíncronas
npm run test:e2e

# Lint e build
npm run lint
npm run build
```

Os testes e2e criam barbearias com slug único e apagam os próprios dados ao final.

## Integração contínua

A cada push e pull request, o GitHub Actions sobe PostgreSQL e Redis em containers,
aplica o schema, e roda lint, build, testes unitários e testes e2e. O workflow está em
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Decisões e trade-offs

| Tema | Decisão | Motivo |
|---|---|---|
| Multi-tenancy | Banco único com `tenant_id` em todas as tabelas | Simples de operar e barato; o isolamento é aplicado em toda consulta. Row Level Security fica como evolução |
| Conflito de horário | `EXCLUDE USING gist` sobre `tstzrange` | O banco garante a regra, mesmo sob concorrência |
| Notificações | Tabela no banco + fila BullMQ + reconciliador | O banco é a fonte da verdade e a fila é só entrega; falha do Redis nunca derruba uma reserva |
| Acesso a dados | Driver `pg` com SQL escrito à mão | O núcleo do projeto depende de recursos de SQL (intervalos, constraint de exclusão) que um ORM esconderia |
| Datas | UTC no banco, fuso por barbearia | Evita bugs de fuso e de horário de verão |
| Arquitetura | Monólito modular, sem microsserviços | Menor complexidade; os módulos podem ser extraídos depois |
| Testes e2e | Banco e fila reais, sem mocks | O comportamento mais importante (concorrência, entrega assíncrona) só aparece com a infraestrutura de verdade |

## Limitações conhecidas

- O envio de e-mail é simulado (log); falta integrar um provedor real.
- O schema é aplicado por um script de inicialização; ainda não há ferramenta de migrations.
- O isolamento entre barbearias é aplicado pela aplicação; Row Level Security no banco ainda não foi adotado.

## Roadmap

- [x] Autenticação com JWT e papéis (dono, barbeiro, recepção, cliente)
- [x] Serviços, barbeiros, jornada e bloqueios de agenda
- [x] Cálculo de horários disponíveis (com testes unitários)
- [x] Agendamento, listagem e cancelamento
- [x] Teste e2e de concorrência
- [x] Documentação OpenAPI e CI
- [x] Notificações assíncronas (confirmação e lembrete) com Redis e BullMQ
- [ ] Deploy com link público
- [ ] Front-end do fluxo do cliente
- [ ] Provedor real de e-mail
- [ ] Migrations versionadas
- [ ] Row Level Security no PostgreSQL
- [ ] Reagendamento e lista de espera