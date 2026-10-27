import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { calculateRate, estimateDeliveryDate } from "./rateCalculator.js";
import { enqueueStatusChangeWebhooks } from "./webhookService.js";
import type {
  PaginatedResult,
  ServiceTier,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
  Zone,
} from "../types/index.js";

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function generateTrackingNumber(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `SF${Date.now().toString(36).toUpperCase()}${suffix}`;
}

export interface CreateShipmentInput {
  originCity: string;
  destinationCity: string;
  weightKg: number;
  zone: Zone;
  serviceTier: ServiceTier;
  idempotencyKey?: string;
}

export function createShipment(input: CreateShipmentInput): Shipment {
  const db = getDb();
  const quote = calculateRate({
    weightKg: input.weightKg,
    zone: input.zone,
    serviceTier: input.serviceTier,
  });

  const id = uuidv4();
  const trackingNumber = generateTrackingNumber();
  const estimatedDelivery = estimateDeliveryDate(input.zone, input.serviceTier);

  db.prepare(
    `INSERT INTO shipments (
      id, tracking_number, status, origin_city, destination_city,
      weight_kg, zone, service_tier, quoted_rate_cents, estimated_delivery, idempotency_key
    ) VALUES (?, ?, 'CREATED', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    trackingNumber,
    input.originCity,
    input.destinationCity,
    input.weightKg,
    input.zone,
    input.serviceTier,
    quote.totalCents,
    estimatedDelivery,
    input.idempotencyKey ?? null
  );

  const eventId = uuidv4();
  db.prepare(
    `INSERT INTO shipment_events (id, shipment_id, status, location, note)
     VALUES (?, ?, 'CREATED', ?, 'Shipment created')`
  ).run(eventId, id, input.originCity);

  return getShipmentById(id)!;
}

export function getShipmentById(id: string): Shipment | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM shipments WHERE id = ?").get(id) as Shipment | undefined) ??
    null
  );
}

export function getShipmentByTracking(trackingNumber: string): Shipment | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM shipments WHERE tracking_number = ?")
      .get(trackingNumber) as Shipment | undefined) ?? null
  );
}

export function listShipments(
  page: number,
  pageSize: number,
  status?: ShipmentStatus
): PaginatedResult<Shipment> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let countSql = "SELECT COUNT(*) as total FROM shipments";
  let dataSql = "SELECT * FROM shipments";
  const params: unknown[] = [];

  if (status) {
    countSql += " WHERE status = ?";
    dataSql += " WHERE status = ?";
    params.push(status);
  }

  dataSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

  const totalRow = db.prepare(countSql).get(...params) as { total: number };
  const data = db.prepare(dataSql).all(...params, pageSize, offset) as Shipment[];

  // BUG: off-by-one — reports one fewer than actual total
  const total = Math.max(0, totalRow.total - 1);
  const totalPages = Math.ceil(total / pageSize);

  return { data, page, pageSize, total, totalPages };
}

export function getShipmentEvents(shipmentId: string): ShipmentEvent[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY created_at ASC"
    )
    .all(shipmentId) as ShipmentEvent[];
}

export function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
  location: string,
  note?: string
): Shipment {
  const db = getDb();
  const shipment = getShipmentById(shipmentId);

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  // BUG: missing transition validation — allows any status change
  db.prepare(
    `UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newStatus, shipmentId);

  const eventId = uuidv4();
  db.prepare(
    `INSERT INTO shipment_events (id, shipment_id, status, location, note)
     VALUES (?, ?, ?, ?, ?)`
  ).run(eventId, shipmentId, newStatus, location, note ?? null);

  const updated = getShipmentById(shipmentId)!;
  enqueueStatusChangeWebhooks(updated);
  return updated;
}

export function isValidTransition(
  current: ShipmentStatus,
  next: ShipmentStatus
): boolean {
  return VALID_TRANSITIONS[current].includes(next);
}

export function cancelShipment(shipmentId: string, reason: string): Shipment {
  return updateShipmentStatus(shipmentId, "CANCELLED", "System", reason);
}
