import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { getShipmentById } from "./shipmentService.js";

export interface InvoiceLineItem {
  description: string;
  amountCents: number;
}

export interface Invoice {
  id: string;
  shipment_id: string;
  invoice_number: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  line_items: string;
  created_at: string;
}

const TAX_RATE_BPS = 1900; // 19% VAT

export function generateInvoiceNumber(): string {
  const suffix = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`.toUpperCase();
  return `INV-${suffix}`;
}

export function calculateTax(subtotalCents: number): number {
  return Math.round((subtotalCents * TAX_RATE_BPS) / 10_000);
}

export function createInvoiceForShipment(shipmentId: string): Invoice {
  const shipment = getShipmentById(shipmentId);
  if (!shipment) {
    throw new Error("Shipment not found");
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM invoices WHERE shipment_id = ?")
    .get(shipmentId) as Invoice | undefined;

  if (existing) {
    return existing;
  }

  const lineItems: InvoiceLineItem[] = [
    {
      description: `Shipping ${shipment.origin_city} → ${shipment.destination_city}`,
      amountCents: shipment.quoted_rate_cents,
    },
    {
      description: `Service tier: ${shipment.service_tier}`,
      amountCents: 0,
    },
  ];

  const subtotalCents = shipment.quoted_rate_cents;
  const taxCents = calculateTax(subtotalCents);
  const totalCents = subtotalCents + taxCents;

  const id = uuidv4();
  const invoiceNumber = generateInvoiceNumber();

  db.prepare(
    `INSERT INTO invoices (
      id, shipment_id, invoice_number, subtotal_cents, tax_cents,
      total_cents, currency, line_items
    ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?)`
  ).run(
    id,
    shipmentId,
    invoiceNumber,
    subtotalCents,
    taxCents,
    totalCents,
    JSON.stringify(lineItems)
  );

  return db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Invoice;
}

export function getInvoiceByShipment(shipmentId: string): Invoice | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM invoices WHERE shipment_id = ?")
      .get(shipmentId) as Invoice | undefined) ?? null
  );
}
