# BarberFlow

[![CI](https://github.com/JoaoVitorXdz/barberflow/actions/workflows/ci.yml/badge.svg)](https://github.com/JoaoVitorXdz/barberflow/actions/workflows/ci.yml)

Sistema de agendamento **multi-tenant** para barbearias. Cada barbearia gerencia seus
barbeiros, serviços e horários por um painel; os clientes consultam horários livres e
agendam online, sem ligar nem mandar mensagem.

O repositório tem uma API em NestJS e um front-end em Next.js (área do cliente e painel da
barbearia), com testes automatizados (incluindo um teste de concorrência contra banco real)
e integração contínua.

> Status: API, área do cliente e painel da barbearia prontos. Deploy e testes do
> front-end estão no [roadmap](#roadmap).

## Telas

| Início | Escolher o horário |
|---|---|
| ![Página inicial com o poste de barbeiro](docs/images/01-inicio.png) | ![Escolha de serviço, barbeiro, dia e horário](docs/images/02-agendar.png) |

| Meus agendamentos | Painel: agenda do dia |
|---|---|
| ![Agendamentos do cliente, com cancelamento](docs/images/03-meus-agendamentos.png) | ![Agenda do dia por barbeiro](docs/images/04-painel-agenda.png) |

| Painel: jornada e folgas de um barbeiro | Documentação da API (Swagger) |
|---|---|
| ![Jornada semanal e folgas](docs/images/05-painel-barbeiro.png) | ![Swagger UI](docs/images/06-swagger.png) |

## Identidade visual

O visual parte do universo da barbearia: o azulejo branco (fundo), a placa de esmalte azul
(texto, botões e cabeçalho), o poste de listras vermelhas e azuis (a faixa do cabeçalho e o
poste da página inicial) e o latão nos filetes. Os títulos usam a fonte Bevan, de letreiro,
e o texto usa a Barlow, inspirada em placas de sinalização. As cores ficam num único bloco
do `web/app/globals.css`, então trocar a paleta é rápido.

## O que o sistema faz

**Para o cliente:**
- Cadastro e login por barbearia
- Escolher serviço, barbeiro, dia e horário, vendo só os horários realmente livres
- Ver os próprios agendamentos e cancelar (o horário volta a ficar livre)
- Receber confirmação e lembrete (envio simulado, veja [Notificações](#notificações-assíncronas))

**Para a barbearia (painel):**
- **Agenda do dia** por barbeiro, com nome do cliente, valor previsto e cancelamento
- **Serviços:** criar, editar (nome, duração e preço) e ativar ou desativar
- **Barbeiros:** cadastrar, escolher quais serviços cada um realiza e ativar ou desativar
- **Jornada semanal** de cada barbeiro, com até dois períodos por dia
- **Folgas e bloqueios** de agenda, informados na hora da barbearia

**Acesso por papel:**

| Papel | O que faz |
|---|---|
| Cliente | Agenda, vê e cancela os próprios agendamentos |
| Barbeiro | Vê a própria agenda no painel (somente leitura) |
| Recepção | Vê a agenda completa e cancela agendamentos |
| Dono | Tudo isso, mais a gestão de serviços, barbeiros, jornadas e folgas |

## Destaques de engenharia

**Concorrência resolvida no banco, e provada por teste.** Dois clientes tentando o mesmo
horário ao mesmo tempo é o caso que quebra a maioria dos sistemas de agendamento.
Aqui, a garantia vem de uma *exclusion constraint* do PostgreSQL sobre `tstzrange`: o banco
impede, por si só, dois agendamentos ativos sobrepostos para o mesmo barbeiro. A API faz uma
pré-validação amigável, mas quem decide é o banco. Um teste e2e dispara 10 reservas
simultâneas do mesmo horário e verifica que exatamente uma passa; outro teste insere
direto no banco, sem passar pela API, para isolar a constraint. Na tela, o cliente que
perde a disputa vê "esse horário acabou de ser ocupado" e a grade é atualizada.

**Notificações que não se perdem.** A notificação é gravada na mesma transação do
agendamento; a fila (BullMQ) só cuida da entrega. Se o Redis cair, a reserva continua
funcionando, e um reconciliador entrega depois o que ficou pendente. Veja
[Notificações assíncronas](#notificações-assíncronas).

**Fuso horário tratado de ponta a ponta.** O banco guarda tudo em UTC (`timestamptz`). A
jornada é cadastrada em hora local da barbearia, e o cálculo de disponibilidade converte
corretamente entre os dois. Esse cálculo é uma **função pura** com testes unitários que
cobrem pausa de almoço, bloqueios, serviços que ultrapassariam o fim da jornada e
horários que cruzam a meia-noite em UTC. No painel, as folgas são digitadas na hora da
barbearia e convertidas para UTC no servidor, usando o fuso cadastrado da barbearia e
nunca o do navegador.

**Front-end seguro por construção.** O navegador conversa só com o Next.js; o servidor do
Next conversa com a API. O token de login fica num **cookie `httpOnly`**, que nenhum script
da página consegue ler, e a sessão vale só para a barbearia em que o login foi feito. As
telas do painel conferem o papel no servidor, e a API revalida a permissão em cada chamada.

**Isolamento entre barbearias.** O `tenantId` vem sempre do token, nunca do corpo da
requisição, e toda consulta filtra por ele. Tentar acessar dado de outra barbearia
devolve 404, sem revelar que o dado existe. Ao vincular serviços a um barbeiro, a API
confere que todos pertencem à mesma barbearia.

**Segurança básica na API.** Senhas com bcrypt, JWT com expiração, controle de acesso por
papel (RBAC), validação de entrada com lista de campos permitidos, SQL sempre
parametrizado e segredos fora do repositório.

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS |
| API | Node.js, TypeScript, NestJS |
| Banco | PostgreSQL 16 |
| Filas | Redis, BullMQ |
| Datas e fusos | luxon (API) e `Intl` (front-end) |
| Autenticação | JWT, bcryptjs, cookie httpOnly |
| Documentação | OpenAPI / Swagger UI |
| Testes | Jest (unitários e e2e), supertest |
| Infra | Docker Compose, GitHub Actions |

## Arquitetura

Monólito modular na API, com um front-end que faz o papel de intermediário (BFF).

```mermaid
flowchart LR
    Browser[Navegador] -->|páginas e server actions| Web[Next.js]
    Web -->|REST + JWT do cookie httpOnly| API[API NestJS]
    API --> PG[(PostgreSQL)]
    API -->|jobs| Redis[(Redis + BullMQ)]
    Redis --> Worker[Worker de notificações]
    Worker --> PG
```

Estrutura do repositório:

```
barberflow/
├── api/               API NestJS: módulos, testes unitários e e2e
├── web/               Front-end Next.js: área do cliente e painel
├── db/                Schema SQL
├── scripts/           Dados de demonstração
├── docs/images/       Capturas de tela
├── docker-compose.yml PostgreSQL e Redis para desenvolvimento
└── .github/workflows/ Integração contínua
```

Módulos da API: `auth`, `tenants`, `services`, `barbers`, `working-hours`, `time-blocks`,
`availability`, `appointments`, `notifications`, `database` e `health`.

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

## Front-end

**Área do cliente**

| Rota | O que faz |
|---|---|
| `/` | Informa o código da barbearia |
| `/b/[slug]` | Página da barbearia |
| `/b/[slug]/cadastro` e `/b/[slug]/entrar` | Cadastro e login (a equipe cai direto no painel) |
| `/b/[slug]/agendar` | Escolha de serviço, barbeiro, dia e horário |
| `/b/[slug]/meus-agendamentos` | Próximos agendamentos (com cancelamento) e histórico |

**Painel da barbearia**

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/b/[slug]/painel` | Equipe | Agenda do dia por barbeiro, com navegação entre dias e cancelamento |
| `/b/[slug]/painel/servicos` | Dono | Criar, editar e ativar ou desativar serviços |
| `/b/[slug]/painel/barbeiros` | Dono | Lista e cadastro de barbeiros |
| `/b/[slug]/painel/barbeiros/[barberId]` | Dono | Serviços, jornada semanal e folgas de um barbeiro |

O front usa Server Actions para falar com a API e Suspense para entregar a casca da página
antes dos dados, como pede o modelo de renderização do Next.js 16.

## API

A documentação interativa (Swagger UI) fica em `http://localhost:3000/docs` e a
especificação OpenAPI em `http://localhost:3000/docs-json`.

| Método | Rota | Quem pode |
|---|---|---|
| POST | `/auth/register-tenant` | Público |
| POST | `/auth/register-customer` | Público |
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| GET | `/tenants/:slug` | Público (nome, código e fuso da barbearia) |
| GET | `/health` | Público |
| GET | `/services` | Autenticado (cliente vê só os ativos) |
| POST | `/services` | Dono |
| PATCH | `/services/:id` | Dono |
| GET | `/barbers` | Autenticado |
| POST | `/barbers` | Dono |
| PATCH | `/barbers/:id` | Dono (nome, ativo e serviços que realiza) |
| GET | `/barbers/:id/working-hours` | Autenticado |
| PUT | `/barbers/:id/working-hours` | Dono |
| GET | `/barbers/:id/time-blocks` | Autenticado |
| POST | `/barbers/:id/time-blocks` | Dono |
| DELETE | `/barbers/:id/time-blocks/:blockId` | Dono |
| GET | `/availability` | Autenticado |
| POST | `/appointments` | Cliente, dono ou recepção |
| GET | `/appointments` | Autenticado (cada papel vê o que lhe cabe; aceita `date` ou `from`/`to`) |
| PATCH | `/appointments/:id/cancel` | Cliente (os próprios), dono ou recepção |

## Regras de negócio

- **Disponibilidade:** os horários são gerados a cada 30 minutos dentro de cada janela da
  jornada, e o serviço precisa terminar dentro da janela. Somem os horários que
  se sobrepõem a bloqueios ou agendamentos ativos, ou que já passaram.
- **Agendamento:** o cliente agenda para si; dono e recepção agendam informando o cliente.
  O preço do serviço é copiado para o agendamento, então mudar o preço depois não altera o histórico.
- **Bloqueios:** não é possível bloquear um período que já tem cliente agendado (409).
- **Cancelamento:** só agendamentos futuros e ativos; ao cancelar, o horário volta a ficar livre.
- **Desativar um serviço ou um barbeiro** o esconde dos clientes, sem apagar nada: os
  agendamentos já marcados continuam valendo.
- **Agenda do dia:** a API recebe a data (`date=AAAA-MM-DD`) e calcula os limites do dia
  no fuso da barbearia.

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

### 1. Banco e Redis

```bash
git clone https://github.com/JoaoVitorXdz/barberflow.git
cd barberflow

cp .env.example .env
docker compose up -d
```

O schema é criado automaticamente na primeira subida.

### 2. API

```bash
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

### 3. Dados de demonstração

Com a API rodando, em outro terminal, na raiz do projeto:

```bash
node scripts/seed-demo.mjs
```

O script cria a **Barbearia Demo** (código `barbearia-demo`) com três serviços, dois
barbeiros com jornada e um cliente de teste. Ele só roda contra uma API local.

| Papel | E-mail | Senha | Para que serve |
|---|---|---|---|
| Cliente | `cliente@demo.com` | `demo12345` | Agendar e cancelar |
| Dono | `dono@demo.com` | `demo12345` | Abre o painel completo |
| Barbeiro | `carlos@demo.com` | `demo12345` | Vê só a própria agenda |

> Credenciais de demonstração, só para o ambiente local.

### 4. Front-end

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3001`, informe `barbearia-demo` e entre. Como **cliente**, você cai
na página da barbearia; como **dono** ou **barbeiro**, no painel.

> No Windows (PowerShell), use `copy` no lugar de `cp`.

### Variáveis de ambiente

**API (`api/.env`)**

| Variável | Para que serve | Exemplo |
|---|---|---|
| `PORT` | Porta da API | `3000` |
| `DATABASE_URL` | Conexão com o PostgreSQL | `postgresql://barberflow:barberflow@localhost:5432/barberflow` |
| `JWT_SECRET` | Segredo que assina os tokens | (gerado como acima) |
| `JWT_EXPIRES_IN_SECONDS` | Validade do token | `3600` |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `NOTIFICATIONS_RECONCILE_INTERVAL_MS` | Intervalo do reconciliador; `0` desativa | `60000` |

**Front-end (`web/.env.local`)**

| Variável | Para que serve | Exemplo |
|---|---|---|
| `API_URL` | Endereço da API, usado só pelo servidor do Next | `http://localhost:3000` |

## Testes

Com o Docker rodando (o e2e precisa do PostgreSQL e do Redis).

**API**, dentro de `api`:

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

**Front-end**, dentro de `web`:

```bash
npm run lint
npm run build
```

## Integração contínua

A cada push e pull request, o GitHub Actions roda dois jobs em paralelo:

- **API:** sobe PostgreSQL e Redis em containers, aplica o schema, e roda lint, build,
  testes unitários e testes e2e.
- **Front-end:** instala as dependências, roda lint e build.

O workflow está em [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Decisões e trade-offs

| Tema | Decisão | Motivo |
|---|---|---|
| Multi-tenancy | Banco único com `tenant_id` em todas as tabelas | Simples de operar e barato; o isolamento é aplicado em toda consulta. Row Level Security fica como evolução |
| Conflito de horário | `EXCLUDE USING gist` sobre `tstzrange` | O banco garante a regra, mesmo sob concorrência |
| Notificações | Tabela no banco + fila BullMQ + reconciliador | O banco é a fonte da verdade e a fila é só entrega; falha do Redis nunca derruba uma reserva |
| Sessão no front | Cookie `httpOnly` + Next.js como intermediário | O token nunca chega ao JavaScript do navegador, e não é preciso configurar CORS |
| Painel | Mesmo app Next.js, rotas protegidas por papel | Evita um segundo projeto; a API continua sendo a autoridade sobre as permissões |
| Folgas no painel | Hora local da barbearia convertida para UTC no servidor | O navegador não sabe o fuso da barbearia; o servidor sabe |
| Acesso a dados | Driver `pg` com SQL escrito à mão | O núcleo do projeto depende de recursos de SQL (intervalos, constraint de exclusão) que um ORM esconderia |
| Datas | UTC no banco, fuso por barbearia | Evita bugs de fuso e de horário de verão |
| Arquitetura | Monólito modular, sem microsserviços | Menor complexidade; os módulos podem ser extraídos depois |
| Testes e2e | Banco e fila reais, sem mocks | O comportamento mais importante (concorrência, entrega assíncrona) só aparece com a infraestrutura de verdade |

## Limitações conhecidas

- O front-end ainda não tem testes automatizados (a API tem). Cobrir o fluxo de agendar
  com testes de ponta a ponta está no roadmap.
- O papel de recepção existe nas regras de acesso, mas ainda não há como cadastrar
  recepcionistas.
- Não existe fluxo para marcar um atendimento como concluído ou falta: no histórico do
  cliente, um agendamento passado e não cancelado aparece como "Realizado".
- O painel permite até dois períodos de trabalho por dia; a API aceita mais.
- O envio de e-mail é simulado (log); falta integrar um provedor real.
- O schema é aplicado por um script de inicialização; ainda não há ferramenta de migrations.
- O isolamento entre barbearias é aplicado pela aplicação; Row Level Security no banco ainda não foi adotado.

## Roadmap

- [x] Autenticação com JWT e papéis (dono, barbeiro, recepção, cliente)
- [x] Serviços, barbeiros, jornada e bloqueios de agenda
- [x] Cálculo de horários disponíveis (com testes unitários)
- [x] Agendamento, listagem e cancelamento
- [x] Teste e2e de concorrência
- [x] Notificações assíncronas (confirmação e lembrete) com Redis e BullMQ
- [x] Documentação OpenAPI e CI
- [x] Front-end do fluxo do cliente
- [x] Painel da barbearia (agenda, serviços, barbeiros, jornadas e folgas)
- [ ] Testes de ponta a ponta do front-end (Playwright)
- [ ] Deploy com link público
- [ ] Cadastro de recepcionistas
- [ ] Marcar atendimento como concluído ou falta
- [ ] Provedor real de e-mail
- [ ] Migrations versionadas
- [ ] Row Level Security no PostgreSQL
- [ ] Reagendamento e lista de espera