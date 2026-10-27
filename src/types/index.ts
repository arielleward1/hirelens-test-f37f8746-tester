export type ShipmentStatus =
  | "CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type ServiceTier = "STANDARD" | "EXPRESS" | "OVERNIGHT";

export type Zone = "LOCAL" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL";

export interface ApiKey {
  id: string;
  key_hash: string;
  name: string;
  role: "admin" | "operator" | "readonly";
  expires_at: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  tracking_number: string;
  status: ShipmentStatus;
  origin_city: string;
  destination_city: string;
  weight_kg: number;
  zone: Zone;
  service_tier: ServiceTier;
  quoted_rate_cents: number;
  estimated_delivery: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location: string;
  note: string | null;
  created_at: string;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string;
  active: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  shipment_id: string;
  event_type: string;
  payload: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}

export interface RateQuoteRequest {
  weightKg: number;
  zone: Zone;
  serviceTier: ServiceTier;
}

export interface RateQuote {
  weightKg: number;
  zone: Zone;
  serviceTier: ServiceTier;
  baseRateCents: number;
  tierMultiplier: number;
  totalCents: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
