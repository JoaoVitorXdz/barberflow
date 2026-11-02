import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConsoleNotificationSender } from './console-notification-sender';
import { NOTIFICATION_SENDER } from './notification-sender';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    { provide: NOTIFICATION_SENDER, useClass: ConsoleNotificationSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}