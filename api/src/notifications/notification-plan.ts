export type NotificationKind = 'confirmation' | 'reminder';

export interface PlannedNotification {
  kind: NotificationKind;
  scheduledFor: Date;
}

const REMINDER_LEAD_MINUTES = 120;

export function planNotifications(
  startsAt: Date,
  now: Date,
  reminderLeadMinutes: number = REMINDER_LEAD_MINUTES,
): PlannedNotification[] {
  const plan: PlannedNotification[] = [
    { kind: 'confirmation', scheduledFor: now },
  ];

  const reminderAt = new Date(startsAt.getTime() - reminderLeadMinutes * 60_000);
  if (reminderAt.getTime() > now.getTime()) {
    plan.push({ kind: 'reminder', scheduledFor: reminderAt });
  }

  return plan;
}