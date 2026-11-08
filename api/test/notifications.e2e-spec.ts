import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { NOTIFICATIONS_QUEUE } from '../src/notifications/notifications.constants';
import { NotificationsReconciler } from '../src/notifications/notifications.reconciler';

const PASSWORD = 'senha12345';

// Repete a verificação até ela devolver um valor, ou estoura o tempo.
async function waitFor<T>(
  check: () => Promise<T | null | undefined>,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error('tempo esgotado esperando a condição');
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

describe('Notificações assíncronas (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let queue: Queue;
  let reconciler: NotificationsReconciler;

  const slug = `e2e-notif-${Date.now()}`;
  let customerAuth = '';
  let appointmentId = '';
  let reminderId = '';

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // O teste chama o reconciliador à mão; o relógio dele fica desligado.
    process.env.NOTIFICATIONS_RECONCILE_INTERVAL_MS = '0';

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
    await app.listen(0);

    db = app.get(DatabaseService);
    queue = app.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE));
    reconciler = app.get(NotificationsReconciler);

    const registro = await api()
      .post('/auth/register-tenant')
      .send({
        barbershopName: 'Barbearia Notificações',
        slug,
        ownerName: 'Dono E2E',
        email: 'dono@e2e.com',
        password: PASSWORD,
      })
      .expect(201);
    const ownerAuth = `Bearer ${registro.body.accessToken}`;

    const servico = await api()
      .post('/services')
      .set('Authorization', ownerAuth)
      .send({ name: 'Corte', durationMinutes: 30, priceCents: 5000 })
      .expect(201);
    const serviceId = servico.body.id as string;

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
    const barberId = barbeiro.body.id as string;

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

    const cliente = await api()
      .post('/auth/register-customer')
      .send({
        tenantSlug: slug,
        name: 'Cliente Notificações',
        email: 'cliente@e2e.com',
        password: PASSWORD,
      })
      .expect(201);
    customerAuth = `Bearer ${cliente.body.accessToken}`;

    // Daqui a uma semana: o lembrete (2 h antes) fica bem no futuro.
    const date = DateTime.now()
      .setZone('America/Recife')
      .plus({ days: 7 })
      .toISODate() as string;
    const disponibilidade = await api()
      .get('/availability')
      .query({ barberId, serviceId, date })
      .set('Authorization', customerAuth)
      .expect(200);

    const reserva = await api()
      .post('/appointments')
      .set('Authorization', customerAuth)
      .send({
        barberId,
        serviceId,
        startsAt: disponibilidade.body.slots[0].startsAt,
      })
      .expect(201);
    appointmentId = reserva.body.id;
  }, 60_000);

  afterAll(async () => {
    if (db) {
      const notificacoes = await db.query<{ id: string }>(
        `SELECT n.id FROM notifications n
           JOIN tenants t ON t.id = n.tenant_id
          WHERE t.slug = $1`,
        [slug],
      );
      for (const row of notificacoes.rows) {
        await queue.remove(row.id);
      }
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

  it('entrega a confirmação de forma assíncrona e agenda o lembrete', async () => {
    const confirmacao = await waitFor(async () => {
      const result = await db.query<{
        status: string;
        attempts: number;
        sent_at: Date | null;
      }>(
        `SELECT status, attempts, sent_at FROM notifications
          WHERE appointment_id = $1 AND kind = 'confirmation'`,
        [appointmentId],
      );
      return result.rows[0]?.status === 'sent' ? result.rows[0] : null;
    });
    expect(confirmacao.attempts).toBe(1);
    expect(confirmacao.sent_at).not.toBeNull();

    const lembrete = await db.query<{ id: string; status: string }>(
      `SELECT id, status FROM notifications
        WHERE appointment_id = $1 AND kind = 'reminder'`,
      [appointmentId],
    );
    expect(lembrete.rows).toHaveLength(1);
    expect(lembrete.rows[0].status).toBe('pending');
    reminderId = lembrete.rows[0].id;

    const job = await queue.getJob(reminderId);
    expect(job).toBeDefined();
    expect(await job?.getState()).toBe('delayed');
  }, 30_000);

  it('o reconciliador entrega notificações pendentes que ficaram sem job na fila', async () => {
    // Simula um enqueue que falhou (ex.: Redis fora do ar): a linha existe, o job não.
    const inserida = await db.query<{ id: string }>(
      `INSERT INTO notifications (tenant_id, appointment_id, channel, kind, scheduled_for)
       SELECT tenant_id, id, 'email', 'confirmation', now()
         FROM appointments WHERE id = $1
       RETURNING id`,
      [appointmentId],
    );
    const orfaId = inserida.rows[0].id;
    expect(await queue.getJob(orfaId)).toBeUndefined();

    await reconciler.reconcile();

    await waitFor(async () => {
      const result = await db.query<{ status: string }>(
        `SELECT status FROM notifications WHERE id = $1`,
        [orfaId],
      );
      return result.rows[0]?.status === 'sent' ? true : null;
    });
  }, 30_000);

  it('cancelar remove o lembrete do banco e da fila', async () => {
    await api()
      .patch(`/appointments/${appointmentId}/cancel`)
      .set('Authorization', customerAuth)
      .expect(200);

    const pendentes = await db.query(
      `SELECT 1 FROM notifications
        WHERE appointment_id = $1 AND status = 'pending'`,
      [appointmentId],
    );
    expect(pendentes.rows).toHaveLength(0);
    expect(await queue.getJob(reminderId)).toBeUndefined();
  }, 30_000);
});