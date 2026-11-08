import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from './notifications.service';

const DEFAULT_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationsReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsReconciler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(
      this.config.get<string>('NOTIFICATIONS_RECONCILE_INTERVAL_MS') ??
        DEFAULT_INTERVAL_MS,
    );
    if (intervalMs <= 0) {
      this.logger.log('Reconciliador de notificações desativado');
      return;
    }
    this.timer = setInterval(() => void this.reconcile(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // Devolve quantas notificações pendentes foram (re)apresentadas à fila.
  async reconcile(): Promise<number> {
    if (this.running) {
      return 0; // evita execuções sobrepostas
    }
    this.running = true;

    try {
      const result = await this.db.query<{ id: string; scheduledFor: Date }>(
        `SELECT id, scheduled_for AS "scheduledFor"
           FROM notifications
          WHERE status = 'pending'
            AND scheduled_for <= now() + interval '1 day'
          ORDER BY scheduled_for
          LIMIT 200`,
      );
      if (result.rows.length === 0) {
        return 0;
      }

      // Idempotente: jobs que já estão na fila (mesmo id) são ignorados.
      await this.notifications.enqueue(result.rows);
      return result.rows.length;
    } catch (error) {
      this.logger.warn(`Reconciliação falhou: ${(error as Error).message}`);
      return 0;
    } finally {
      this.running = false;
    }
  }
}