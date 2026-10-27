import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

const sampleShipment = {
  originCity: "Berlin",
  destinationCity: "Munich",
  weightKg: 2.5,
  zone: "REGIONAL",
  serviceTier: "STANDARD",
};

describe("Shipments", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a shipment with CREATED status and tracking number", async () => {
    const res = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    expect(res.status).toBe(201);
    expect(res.body.shipment.status).toBe("CREATED");
    expect(res.body.shipment.tracking_number).toMatch(/^SF/);
    expect(res.body.shipment.origin_city).toBe("Berlin");
  });

  it("retrieves shipment by id", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    const res = await request(app.server)
      .get(`/shipments/${created.body.shipment.id}`)
      .set(authHeader(API_KEYS.admin));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.shipment.id);
  });

  it("tracks shipment with event history", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    const trackingNumber = created.body.shipment.tracking_number;

    const res = await request(app.server)
      .get(`/shipments/track/${trackingNumber}`)
      .set(authHeader(API_KEYS.readonly));

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].status).toBe("CREATED");
  });

  it("follows valid status transitions", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.operator))
      .send(sampleShipment);

    const id = created.body.shipment.id;

    const steps = [
      { status: "PICKED_UP", location: "Berlin Hub" },
      { status: "IN_TRANSIT", location: "Leipzig DC" },
      { status: "OUT_FOR_DELIVERY", location: "Munich Local" },
      { status: "DELIVERED", location: "Munich" },
    ] as const;

    for (const step of steps) {
      const res = await request(app.server)
        .patch(`/shipments/${id}/status`)
        .set(authHeader(API_KEYS.operator))
        .send(step);

      expect(res.status).toBe(200);
      expect(res.body.shipment.status).toBe(step.status);
    }
  });

  it("rejects invalid status transitions", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.operator))
      .send(sampleShipment);

    const id = created.body.shipment.id;

    const res = await request(app.server)
      .patch(`/shipments/${id}/status`)
      .set(authHeader(API_KEYS.operator))
      .send({ status: "DELIVERED", location: "Munich" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/invalid status transition/i);
  });

  it("allows cancellation from CREATED", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    const res = await request(app.server)
      .post(`/shipments/${created.body.shipment.id}/cancel`)
      .set(authHeader(API_KEYS.admin))
      .send({ reason: "Customer request" });

    expect(res.status).toBe(200);
    expect(res.body.shipment.status).toBe("CANCELLED");
  });

  it("blocks cancellation after IN_TRANSIT", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    const id = created.body.shipment.id;

    await request(app.server)
      .patch(`/shipments/${id}/status`)
      .set(authHeader(API_KEYS.admin))
      .send({ status: "PICKED_UP", location: "Berlin Hub" });

    await request(app.server)
      .patch(`/shipments/${id}/status`)
      .set(authHeader(API_KEYS.admin))
      .send({ status: "IN_TRANSIT", location: "Leipzig DC" });

    const res = await request(app.server)
      .post(`/shipments/${id}/cancel`)
      .set(authHeader(API_KEYS.admin))
      .send({ reason: "Too late" });

    expect(res.status).toBe(409);
  });

  it("paginates shipment list with correct total count", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.server)
        .post("/shipments")
        .set(authHeader(API_KEYS.admin))
        .send({ ...sampleShipment, originCity: `City${i}` });
    }

    const res = await request(app.server)
      .get("/shipments?page=1&pageSize=2")
      .set(authHeader(API_KEYS.admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
  });

  it("filters shipments by status", async () => {
    const created = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send(sampleShipment);

    await request(app.server)
      .post(`/shipments/${created.body.shipment.id}/cancel`)
      .set(authHeader(API_KEYS.admin))
      .send({ reason: "Test" });

    await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send({ ...sampleShipment, originCity: "Hamburg" });

    const res = await request(app.server)
      .get("/shipments?status=CANCELLED")
      .set(authHeader(API_KEYS.admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].status).toBe("CANCELLED");
  });
});
