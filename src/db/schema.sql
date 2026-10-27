CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'readonly')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'CREATED',
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  zone TEXT NOT NULL,
  service_tier TEXT NOT NULL,
  quoted_rate_cents INTEGER NOT NULL,
  estimated_delivery TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id),
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key TEXT PRIMARY KEY,
  request_path TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES webhook_subscriptions(id),
  shipment_id TEXT NOT NULL REFERENCES shipments(id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

CREATE TABLE IF NOT EXISTS carriers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  zones TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL UNIQUE REFERENCES shipments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  line_items TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zone_postal_mappings (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  postal_prefix TEXT NOT NULL,
  zone TEXT NOT NULL,
  UNIQUE(country_code, postal_prefix)
);

CREATE INDEX IF NOT EXISTS idx_invoices_shipment ON invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_zone_postal_country ON zone_postal_mappings(country_code);
