export interface OutgoingMessage {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationSender {
  send(message: OutgoingMessage): Promise<void>;
}

export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');