import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { PoolClient } from 'pg';
import { planNotifications } from './notification-plan';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
} from './notifications.constants';

export interface ScheduledNotification {
  id: string;
  scheduledFor: Date;
}

const ENQUEUE_TIMEOUT_MS = 2_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotificationJobData>,
  ) {}

  // Grava as notificações na MESMA transação do agendamento.
  async createForAppointment(
    client: PoolClient,
    tenantId: string,
    appointmentId: string,
    startsAt: Date,
  ): Promise<ScheduledNotification[]> {
    const scheduled: ScheduledNotification[] = [];

    for (const item of planNotifications(startsAt, new Date())) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO notifications
           (tenant_id, appointment_id, channel, kind, scheduled_for)
         VALUES ($1, $2, 'email', $3, $4::timestamptz)
         RETURNING id`,
        [tenantId, appointmentId, item.kind, item.scheduledFor.toISOString()],
      );
      scheduled.push({ id: result.rows[0].id, scheduledFor: item.scheduledFor });
    }
    return scheduled;
  }

  // Depois do commit: coloca na fila. Falha aqui NÃO derruba o agendamento.
    // Depois do commit: coloca na fila. Falha aqui NÃO derruba o agendamento.
  async enqueue(scheduled: ScheduledNotification[]): Promise<void> {
    for (const item of scheduled) {
      try {
        await this.withTimeout(
          this.queue.add(
            'send',
            { notificationId: item.id },
            {
              jobId: item.id,
              delay: Math.max(0, item.scheduledFor.getTime() - Date.now()),
              attempts: 5,
              backoff: { type: 'exponential', delay: 5_000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          ),
        );
      } catch (error) {
        // Redis indisponível: as próximas também falhariam (e cada uma esperaria
        // o tempo limite). Elas seguem pendentes no banco e o reconciliador cuida delas.
        this.logger.warn(
          `Não foi possível enfileirar a notificação ${item.id}; ela e as próximas seguem pendentes no banco: ${(error as Error).message}`,
        );
        return;
      }
    }
  }

  // No cancelamento: apaga as pendentes (dentro da transação do cancelamento).
  async removePending(
    client: PoolClient,
    appointmentId: string,
  ): Promise<string[]> {
    const result = await client.query<{ id: string }>(
      `DELETE FROM notifications
        WHERE appointment_id = $1 AND status = 'pending'
        RETURNING id`,
      [appointmentId],
    );
    return result.rows.map((row) => row.id);
  }

  // Depois do commit do cancelamento: tira os jobs da fila.
  async dequeue(notificationIds: string[]): Promise<void> {
    for (const id of notificationIds) {
      try {
        await this.withTimeout(this.queue.remove(id));
      } catch (error) {
        this.logger.warn(
          `Não foi possível remover o job ${id} da fila: ${(error as Error).message}`,
        );
      }
    }
  }

  // Se o Redis estiver fora do ar, o BullMQ ficaria esperando para sempre.
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('tempo esgotado ao falar com o Redis')),
        ENQUEUE_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}