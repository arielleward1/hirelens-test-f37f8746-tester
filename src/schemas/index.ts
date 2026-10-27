import { z } from "zod";

export const zoneSchema = z.enum(["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"]);
export const serviceTierSchema = z.enum(["STANDARD", "EXPRESS", "OVERNIGHT"]);
export const shipmentStatusSchema = z.enum([
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const createShipmentSchema = z.object({
  originCity: z.string().min(1).max(100),
  destinationCity: z.string().min(1).max(100),
  weightKg: z.number().positive(),
  zone: zoneSchema,
  serviceTier: serviceTierSchema,
});

export const rateQuoteSchema = z.object({
  weightKg: z.number().positive(),
  zone: zoneSchema,
  serviceTier: serviceTierSchema,
});

export const updateStatusSchema = z.object({
  status: shipmentStatusSchema,
  location: z.string().min(1).max(200),
  note: z.string().max(500).optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: shipmentStatusSchema.optional(),
});
