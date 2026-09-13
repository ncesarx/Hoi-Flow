export type SendNotificationInput = {
  recipient: string;
  text: string;
  idempotencyKey: string;
};

export type NotificationSender = {
  send(input: SendNotificationInput): Promise<{ providerMessageId: string }>;
};

export function notificationRetryDelay(attempt: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}
