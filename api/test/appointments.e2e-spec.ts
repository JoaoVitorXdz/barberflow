import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DateTime } from 'luxon';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

const CLIENTES = 10;
const PASSWORD = 'senha12345';

describe('Agendamentos sob concorrência (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  const slug = `e2e-${Date.now()}`;
  let ownerAuth = '';
  let tenantId = '';
  let barberId = '';
  let serviceId = '';
  let customerTokens: string[] = [];
  let customerIds: string[] = [];
  let slots: { startsAt: string; endsAt: string }[] = [];

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(DatabaseService);

    // Uma barbearia nova, montada só pela API.
    const registro = await api()
      .post('/auth/register-tenant')
      .send({
        barbershopName: 'Barbearia E2E',
        slug,
        ownerName: 'Dono E2E',
        email: 'dono@e2e.com',
        password: PASSWORD,
      })
      .expect(201);
    ownerAuth = `Bearer ${registro.body.accessToken}`;

    const servico = await api()
      .post('/services')
      .set('Authorization', ownerAuth)
      .send({ name: 'Corte', durationMinutes: 30, priceCents: 5000 })
      .expect(201);
    serviceId = servico.body.id;

    const barbeiro = await api()
      .post('/barbers')
      .set('Authorization', ownerAuth)
      .send({
        name: 'Barbeiro E2E',
        email: 'barbeiro@e2e.com',
        password: PASSWORD,
        serviceIds: [serviceId],
      })
      .expect(201);
    barberId = barbeiro.body.id;

    // Jornada todos os dias, para o teste não depender do dia da semana.
    await api()
      .put(`/barbers/${barberId}/working-hours`)
      .set('Authorization', ownerAuth)
      .send({
        entries: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startTime: '09:00',
          endTime: '18:00',
        })),
      })
      .expect(200);

    const tenant = await db.query<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug],
    );
    tenantId = tenant.rows[0].id;

    const clientes = await Promise.all(
      Array.from({ length: CLIENTES }, (_, i) =>
        api()
          .post('/auth/register-customer')
          .send({
            tenantSlug: slug,
            name: `Cliente ${i}`,
            email: `cliente${i}@e2e.com`,
            password: PASSWORD,
          })
          .expect(201),
      ),
    );
    customerTokens = clientes.map((res) => res.body.accessToken as string);

    const ids = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE tenant_id = $1 AND role = 'customer'`,
      [tenantId],
    );
    customerIds = ids.rows.map((row) => row.id);

    // Um dia daqui a uma semana, sempre no futuro.
    const date = DateTime.now()
      .setZone('America/Recife')
      .plus({ days: 7 })
      .toISODate() as string;
    const disponibilidade = await api()
      .get('/availability')
      .query({ barberId, serviceId, date })
      .set('Authorization', ownerAuth)
      .expect(200);
    slots = disponibilidade.body.slots;
  }, 60_000);

  afterAll(async () => {
    if (db) {
      await db.query(
        `DELETE FROM appointments
          WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = $1)`,
        [slug],
      );
      await db.query('DELETE FROM tenants WHERE slug = $1', [slug]);
    }
    if (app) {
      await app.close();
    }
  });

  it('10 clientes disputando o mesmo horário pela API: exatamente 1 consegue', async () => {
    const startsAt = slots[0].startsAt;

    const respostas = await Promise.all(
      customerTokens.map((token) =>
        api()
          .post('/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({ barberId, serviceId, startsAt }),
      ),
    );

    const statuses = respostas.map((res) => res.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(CLIENTES - 1);

    const salvos = await db.query<{ total: string }>(
      `SELECT count(*) AS total
         FROM appointments
        WHERE tenant_id = $1 AND status = 'scheduled'
          AND lower(period) = $2::timestamptz`,
      [tenantId, startsAt],
    );
    expect(Number(salvos.rows[0].total)).toBe(1);
  }, 30_000);

  it('o banco rejeita sobreposição mesmo sem a pré-validação da API', async () => {
    const inicio = new Date(slots[1].startsAt).toISOString();
    const fim = new Date(slots[1].endsAt).toISOString();

    const resultados = await Promise.allSettled(
      customerIds.map((customerId) =>
        db.query(
          `INSERT INTO appointments
             (tenant_id, barber_id, customer_id, service_id, period, price_cents)
           VALUES ($1, $2, $3, $4, tstzrange($5::timestamptz, $6::timestamptz), 5000)`,
          [tenantId, barberId, customerId, serviceId, inicio, fim],
        ),
      ),
    );

    const aceitos = resultados.filter((r) => r.status === 'fulfilled');
    const rejeitados = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(aceitos).toHaveLength(1);
    expect(rejeitados).toHaveLength(CLIENTES - 1);
    for (const rejeitado of rejeitados) {
      // 23P01 = conflito de exclusão; 40P01 = deadlock detectado na disputa.
      expect(['23P01', '40P01']).toContain(
        (rejeitado.reason as { code?: string }).code,
      );
    }
  }, 30_000);
});