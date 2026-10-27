import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Idempotency", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("replays identical POST when Idempotency-Key is reused", async () => {
    const payload = {
      originCity: "Cologne",
      destinationCity: "Düsseldorf",
      weightKg: 1,
      zone: "LOCAL",
      serviceTier: "STANDARD",
    };

    const key = "idem-test-key-001";

    const first = await request(app.server)
      .post("/shipments")
      .set({ ...authHeader(API_KEYS.admin), "Idempotency-Key": key })
      .send(payload);

    expect(first.status).toBe(201);
    const firstId = first.body.shipment.id;

    const second = await request(app.server)
      .post("/shipments")
      .set({ ...authHeader(API_KEYS.admin), "Idempotency-Key": key })
      .send(payload);

    expect(second.status).toBe(201);
    expect(second.headers["x-idempotent-replay"]).toBe("true");
    expect(second.body.shipment.id).toBe(firstId);
  });

  it("creates separate shipments for different idempotency keys", async () => {
    const payload = {
      originCity: "Stuttgart",
      destinationCity: "Karlsruhe",
      weightKg: 1,
      zone: "LOCAL",
      serviceTier: "STANDARD",
    };

    const first = await request(app.server)
      .post("/shipments")
      .set({ ...authHeader(API_KEYS.admin), "Idempotency-Key": "key-a" })
      .send(payload);

    const second = await request(app.server)
      .post("/shipments")
      .set({ ...authHeader(API_KEYS.admin), "Idempotency-Key": "key-b" })
      .send(payload);

    expect(first.body.shipment.id).not.toBe(second.body.shipment.id);
  });
});
