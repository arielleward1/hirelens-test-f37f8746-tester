export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, string>;
}

export interface NotificationResult {
  queued: boolean;
  messageId: string;
}

const outbox: NotificationResult[] = [];

export function queueEmailNotification(payload: NotificationPayload): NotificationResult {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = { queued: true, messageId };
  outbox.push(result);

  if (process.env.NODE_ENV !== "test") {
    console.log(`[notification] queued email to ${payload.to}: ${payload.subject}`);
  }

  return result;
}

export function getOutboxSize(): number {
  return outbox.length;
}

export function clearOutbox(): void {
  outbox.length = 0;
}

export function notifyShipmentCreated(
  email: string,
  trackingNumber: string
): NotificationResult {
  return queueEmailNotification({
    to: email,
    subject: `Shipment created: ${trackingNumber}`,
    body: `Your shipment ${trackingNumber} has been created.`,
    metadata: { trackingNumber },
  });
}
