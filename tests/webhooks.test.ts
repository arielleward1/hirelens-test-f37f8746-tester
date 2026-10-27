import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createHmac } from "node:crypto";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Webhooks", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a webhook subscription (admin only)", async () => {
    const res = await request(app.server)
      .post("/webhooks")
      .set(authHeader(API_KEYS.admin))
      .send({
        url: "https://example.com/webhooks/shipfast",
        events: ["shipment.status_changed"],
        secret: "whsec_test_secret_123456",
      });

    expect(res.status).toBe(201);
    expect(res.body.subscription.url).toBe("https://example.com/webhooks/shipfast");
  });

  it("blocks non-admin from registering webhooks", async () => {
    const res = await request(app.server)
      .post("/webhooks")
      .set(authHeader(API_KEYS.operator))
      .send({
        url: "https://example.com/hook",
        events: ["shipment.status_changed"],
        secret: "whsec_test_secret_123456",
      });

    expect(res.status).toBe(403);
  });

  it("enqueues delivery on status change and delivers with HMAC signature", async () => {
    const secret = "whsec_delivery_test_secret";
    const url = "https://hooks.example.com/status";
    const deliveries: Array<{ url: string; headers: Record<string, string>; body: string }> =
      [];

    globalThis.__webhookFetch = async (fetchUrl, init) => {
      deliveries.push({
        url: fetchUrl,
        headers: init.headers,
        body: init.body,
      });
      return { status: 200, body: "ok" };
    };

    await request(app.server)
      .post("/webhooks")
      .set(authHeader(API_KEYS.admin))
      .send({
        url,
        events: ["shipment.status_changed"],
        secret,
      });

    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send({
        originCity: "Berlin",
        destinationCity: "Hamburg",
        weightKg: 1,
        zone: "REGIONAL",
        serviceTier: "STANDARD",
      });

    const shipmentId = created.body.shipment.id;

    await request(app.server)
      .patch(`/shipments/${shipmentId}/status`)
      .set(authHeader(API_KEYS.operator))
      .send({ status: "PICKED_UP", location: "Berlin Hub" });

    const processRes = await request(app.server)
      .post("/webhooks/process")
      .set(authHeader(API_KEYS.admin));

    expect(processRes.status).toBe(200);
    expect(processRes.body.delivered).toBeGreaterThanOrEqual(1);

    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    const delivery = deliveries[0];
    expect(delivery.url).toBe(url);

    const expectedSig = createHmac("sha256", secret)
      .update(delivery.body)
      .digest("hex");
    expect(delivery.headers["x-shipfast-signature"]).toBe(`sha256=${expectedSig}`);

    const payload = JSON.parse(delivery.body);
    expect(payload.event).toBe("shipment.status_changed");
    expect(payload.shipmentId).toBe(shipmentId);
    expect(payload.status).toBe("PICKED_UP");
  });

  it("retries failed deliveries up to 3 attempts then marks failed", async () => {
    const secret = "whsec_retry_test_secret_12";
    let attempts = 0;

    globalThis.__webhookFetch = async () => {
      attempts++;
      return { status: 500, body: "error" };
    };

    await request(app.server)
      .post("/webhooks")
      .set(authHeader(API_KEYS.admin))
      .send({
        url: "https://hooks.example.com/retry",
        events: ["shipment.status_changed"],
        secret,
      });

    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send({
        originCity: "Dresden",
        destinationCity: "Leipzig",
        weightKg: 1,
        zone: "LOCAL",
        serviceTier: "STANDARD",
      });

    await request(app.server)
      .patch(`/shipments/${created.body.shipment.id}/status`)
      .set(authHeader(API_KEYS.admin))
      .send({ status: "PICKED_UP", location: "Dresden Hub" });

    for (let i = 0; i < 3; i++) {
      await request(app.server)
        .post("/webhooks/process")
        .set(authHeader(API_KEYS.admin));
    }

    expect(attempts).toBe(3);

    const final = await request(app.server)
      .post("/webhooks/process")
      .set(authHeader(API_KEYS.admin));

    expect(final.body.processed).toBe(0);
  });
});
