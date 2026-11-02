import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { NOTIFICATION_SENDER } from './notification-sender';
import type { NotificationSender } from './notification-sender';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
} from './notifications.constants';

interface NotificationContext {
  id: string;
  kind: string;
  status: string;
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  barbershopName: string;
  timezone: string;
  startsAt: Date;
}

function buildMessage(
  context: NotificationContext,
): { subject: string; body: string } {
  const startsAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: context.timezone,
  }).format(context.startsAt);

  return {
    subject: `Agendamento em ${context.barbershopName}`,
    body: [
      `Olá, ${context.customerName}!`,
      '',
      `Detalhes do seu agendamento em ${context.barbershopName}:`,
      `Serviço: ${context.serviceName}`,
      `Barbeiro: ${context.barberName}`,
      `Data e horário: ${startsAt}`,
    ].join('\n'),
  };
}

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId } = job.data;

    const result = await this.db.query<NotificationContext>(
      `SELECT n.id, n.kind, n.status,
              u.name AS "customerName", u.email AS "customerEmail",
              b.display_name AS "barberName",
              s.name AS "serviceName",
              t.name AS "barbershopName", t.timezone,
              lower(a.period) AS "startsAt"
         FROM notifications n
         JOIN appointments a ON a.id = n.appointment_id
         JOIN users u ON u.id = a.customer_id
         JOIN barbers b ON b.id = a.barber_id
         JOIN services s ON s.id = a.service_id
         JOIN tenants t ON t.id = n.tenant_id
        WHERE n.id = $1`,
      [notificationId],
    );

    const context = result.rows[0];
    // Já enviada, ou removida porque o agendamento foi cancelado.
    if (!context || context.status !== 'pending') {
      return;
    }

    const { subject, body } = buildMessage(context);
    await this.sender.send({ to: context.customerEmail, subject, body });

    await this.db.query(
      `UPDATE notifications
          SET status = 'sent', sent_at = now(), attempts = attempts + 1
        WHERE id = $1`,
      [notificationId],
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<NotificationJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const finalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `Notificação ${job.data.notificationId} falhou (tentativa ${job.attemptsMade}): ${error.message}`,
    );

    try {
      await this.db.query(
        `UPDATE notifications
            SET attempts = attempts + 1,
                status = CASE WHEN $2::boolean
                              THEN 'failed'::notification_status
                              ELSE status END
          WHERE id = $1`,
        [job.data.notificationId, finalAttempt],
      );
    } catch (dbError) {
      this.logger.error(
        `Não foi possível registrar a falha: ${(dbError as Error).message}`,
      );
    }
  }
}