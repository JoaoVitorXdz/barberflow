import { Injectable, Logger } from '@nestjs/common';
import type { NotificationSender, OutgoingMessage } from './notification-sender';

@Injectable()
export class ConsoleNotificationSender implements NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  async send(message: OutgoingMessage): Promise<void> {
    this.logger.log(
      `[E-MAIL SIMULADO] para ${message.to} | ${message.subject} | ${message.body}`,
    );
  }
}