import { createHmac } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import type { Shipment, WebhookDelivery, WebhookSubscription } from "../types/index.js";

const MAX_ATTEMPTS = 3;

export function createWebhookSubscription(
  url: string,
  events: string[],
  secret: string
): WebhookSubscription {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO webhook_subscriptions (id, url, secret, events, active)
     VALUES (?, ?, ?, ?, 1)`
  ).run(id, url, secret, events.join(","));

  return db
    .prepare("SELECT * FROM webhook_subscriptions WHERE id = ?")
    .get(id) as WebhookSubscription;
}

export function listWebhookSubscriptions(): WebhookSubscription[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM webhook_subscriptions WHERE active = 1")
    .all() as WebhookSubscription[];
}

export function enqueueStatusChangeWebhooks(shipment: Shipment): void {
  const db = getDb();
  const subscriptions = listWebhookSubscriptions();

  for (const sub of subscriptions) {
    const events = sub.events.split(",");
    if (!events.includes("shipment.status_changed")) {
      continue;
    }

    const payload = JSON.stringify({
      event: "shipment.status_changed",
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      status: shipment.status,
      timestamp: new Date().toISOString(),
    });

    db.prepare(
      `INSERT INTO webhook_deliveries (
        id, subscription_id, shipment_id, event_type, payload, status, attempts
      ) VALUES (?, ?, ?, 'shipment.status_changed', ?, 'pending', 0)`
    ).run(uuidv4(), sub.id, shipment.id, payload);
  }
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Process pending webhook deliveries.
 *
 * TODO: Implement delivery with retry logic:
 * - POST payload to subscription URL with header X-ShipFast-Signature: sha256=<hmac>
 * - On HTTP 2xx: mark delivery as 'delivered', set delivered_at
 * - On failure: increment attempts; if attempts >= MAX_ATTEMPTS mark 'failed', else keep 'pending'
 *
 * For this assessment, use globalThis.__webhookFetch (see tests/setup.ts) instead of real fetch.
 */
export async function processPendingWebhooks(): Promise<{
  processed: number;
  delivered: number;
  failed: number;
}> {
  // STUB: does not deliver anything
  return { processed: 0, delivered: 0, failed: 0 };
}

export function getDeliveriesForShipment(shipmentId: string): WebhookDelivery[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM webhook_deliveries WHERE shipment_id = ? ORDER BY created_at ASC")
    .all(shipmentId) as WebhookDelivery[];
}

export function getPendingDeliveries(): WebhookDelivery[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM webhook_deliveries
       WHERE status = 'pending' AND attempts < ?
       ORDER BY created_at ASC`
    )
    .all(MAX_ATTEMPTS) as WebhookDelivery[];
}

export { MAX_ATTEMPTS };
