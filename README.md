# ShipFast Logistics API — Backend Technical Interview

This is a **temporary repository** used during a live technical interview. You have inherited a **partially implemented** logistics/shipment API that is close to MVP but not production-ready. Together we will review, fix, and complete it until the full test suite passes.

---

## Overview

ShipFast is a REST API for a shipping logistics platform. It supports:

- **API key authentication** with role-based access (`admin`, `operator`, `readonly`)
- **Shipment lifecycle** — create, track, update status, cancel
- **Rate quoting** — zone + weight + service tier pricing
- **Idempotent creation** — `Idempotency-Key` header on `POST /shipments`
- **Webhooks** — notify external systems on status changes with HMAC signatures and retry logic

The stack is **Node.js 22+ · TypeScript · Fastify · SQLite (`node:sqlite`) · Vitest**.

> **Note:** Uses the built-in `node:sqlite` module (Node 22+). No native addon compilation required.

---

## Getting Started

```bash
npm install
npm test
```

Some tests are expected to **fail** on first run. During the interview we will work through the failures until **`npm test`** passes.

Copy environment variables if needed:

```bash
cp .env.example .env
```

Start the dev server (optional):

```bash
npm run dev
```

Reset the database:

```bash
npm run db:reset
```

---

## Test API Keys (seeded automatically in tests)

| Role     | Key                              |
|----------|----------------------------------|
| admin    | `sk_live_admin_test_key_001`     |
| operator | `sk_live_operator_test_key_002`  |
| readonly | `sk_live_readonly_test_key_003`  |
| expired  | `sk_live_expired_test_key_004`   |

Use the `Authorization: Bearer <key>` header on all endpoints except `/health`.

---

## Focus Areas

These are the areas we are likely to cover in the interview. Exact scope depends on time and discussion.

### 1. Understand the codebase

Read through `src/`, `tests/`, and search for `TODO` and `BUG` comments. Skim the product specs below.

### 2. Fix authentication

- Reject **expired** API keys with a clear error message
- Confirm role checks work for protected routes

### 3. Fix rate calculation

The rate engine in `src/services/rateCalculator.ts` does not match the product spec. Fix it and ensure quoted rates on new shipments are correct.

### 4. Fix shipment state machine

Implement valid status transition enforcement. Invalid transitions must return **409 Conflict**.

Allowed transitions:

```
CREATED          → PICKED_UP, CANCELLED
PICKED_UP        → IN_TRANSIT, CANCELLED
IN_TRANSIT       → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY → DELIVERED
DELIVERED        → (terminal)
CANCELLED        → (terminal)
```

### 5. Implement idempotency

`POST /shipments` must honor the `Idempotency-Key` header:

- First request: create shipment, store response
- Duplicate request with same key: return stored response with `X-Idempotent-Replay: true`

See `src/middleware/idempotency.ts`.

### 6. Fix pagination

`GET /shipments` returns incorrect `total` count. Fix the off-by-one bug.

### 7. Implement webhook delivery

Complete `processPendingWebhooks()` in `src/services/webhookService.ts`:

- POST JSON payload to subscriber URL
- Include header `X-ShipFast-Signature: sha256=<hmac>` (use `signPayload()`)
- Use `globalThis.__webhookFetch` instead of real `fetch` (required for tests)
- On HTTP 2xx: mark delivery `delivered`
- On failure: increment `attempts`; after 3 attempts mark `failed`; otherwise leave `pending` for retry

---

## Product Specs

### Rate calculation

Rates are in **cents** (integer). Formula:

```
baseCharge = zoneBaseRateCents × weightKg
totalCents = round(baseCharge × tierMultiplier)
```

Zone base rates (cents per kg):

| Zone           | Rate |
|----------------|------|
| LOCAL          | 500  |
| REGIONAL       | 900  |
| NATIONAL       | 1400 |
| INTERNATIONAL  | 3200 |

Tier multipliers:

| Tier      | Multiplier |
|-----------|------------|
| STANDARD  | 1.0        |
| EXPRESS   | 1.5        |
| OVERNIGHT | 2.25       |

**Example:** LOCAL, 2 kg, EXPRESS → `500 × 2 × 1.5 = 1500` cents

Weight must be between **0.1** and **500** kg.

### Estimated delivery

`estimateDeliveryDate()` adds transit days based on zone and tier (already defined in code). The result must match the spec encoded in tests.

---

## Project Structure

```
src/
  app.ts                    # Fastify app wiring
  index.ts                  # Entry point
  db/                       # SQLite schema, seed, reset
  lib/                      # Shared constants and error types
  middleware/
    auth.ts                 # API key auth (FIX REQUIRED)
    idempotency.ts          # Idempotency-Key handling (FIX REQUIRED)
    requestContext.ts       # Request ID propagation
    timing.ts               # Response timing + metrics
    rateLimit.ts            # Optional rate limiter (not in failing tests)
  routes/
    health.ts
    shipments.ts            # FIX REQUIRED
    rates.ts
    webhooks.ts             # FIX REQUIRED (via service)
    carriers.ts             # Carrier directory (working)
    invoices.ts             # Invoice generation (working)
    reports.ts              # Reporting (working)
    zones.ts                # Zone lookup (working)
    analytics.ts            # Metrics endpoint (working)
    lookup.ts               # Tracking/SLA lookup (working)
  services/
    rateCalculator.ts       # Pricing engine (FIX REQUIRED)
    shipmentService.ts      # Shipment CRUD + state (FIX REQUIRED)
    webhookService.ts       # Webhook queue + delivery (FIX REQUIRED)
    addressNormalizer.ts    # City normalization (working)
    carrierService.ts       # Carrier data (working)
    invoiceService.ts       # Invoicing (working)
    reportingService.ts     # Analytics queries (working)
    zoneLookupService.ts    # Postal → zone mapping (working)
    slaCalculator.ts        # SLA evaluation (working)
    trackingValidator.ts    # Tracking validation (working)
    notificationService.ts  # Email queue stub (working)
    cacheService.ts         # In-memory cache (working)
    metricsService.ts       # Request counters (working)
    geocodingService.ts     # Distance estimation (working)
    labelPrinter.ts         # Label/ZPL helper (working, not in core flow)
  utils/                    # Pure helper functions (working)
  schemas/                  # Zod validation
  types/
tests/
  auth.test.ts              # FIX REQUIRED
  rates.test.ts             # FIX REQUIRED
  shipments.test.ts         # FIX REQUIRED
  idempotency.test.ts       # FIX REQUIRED
  webhooks.test.ts          # FIX REQUIRED
  carriers.test.ts          # decoy (passing)
  invoices.test.ts          # decoy (passing)
  reports.test.ts           # decoy (passing)
  zones.test.ts             # decoy (passing)
  lookup.test.ts            # decoy (passing)
  analytics.test.ts         # decoy (passing)
  health.test.ts            # decoy (passing)
  ...and more unit tests
```

> **Note:** Many files and tests are fully working decoys to reflect a realistic codebase. Only the modules marked **FIX REQUIRED** need changes to pass the full suite.

---

## API Quick Reference

| Method | Path                          | Auth Roles        | Description              |
|--------|-------------------------------|-------------------|--------------------------|
| GET    | `/health`                     | none              | Health check             |
| POST   | `/rates/quote`                | any valid key     | Get rate quote           |
| GET    | `/shipments`                  | any valid key     | List shipments (paginated)|
| POST   | `/shipments`                  | admin, operator   | Create shipment          |
| GET    | `/shipments/:id`              | any valid key     | Get shipment             |
| GET    | `/shipments/track/:trackingNumber` | any valid key | Track with events        |
| PATCH  | `/shipments/:id/status`       | admin, operator   | Update status            |
| POST   | `/shipments/:id/cancel`       | admin, operator   | Cancel shipment          |
| GET    | `/webhooks`                   | any valid key     | List subscriptions       |
| POST   | `/webhooks`                   | admin             | Register webhook         |
| POST   | `/webhooks/process`           | admin             | Process pending deliveries|

---

## Interview Notes

- This is a **live pairing session**, not a take-home assignment — no need to submit a PR or write `SOLUTION.md` beforehand
- Feel free to ask clarifying questions as you go
- You may use Fastify, Zod, and Node.js docs freely
- We care about how you navigate an existing codebase, reason about bugs, and communicate trade-offs
