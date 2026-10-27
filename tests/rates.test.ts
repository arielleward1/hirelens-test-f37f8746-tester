import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Rate Calculator", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("calculates LOCAL STANDARD rate correctly", async () => {
    const res = await request(app.server)
      .post("/rates/quote")
      .set(authHeader(API_KEYS.admin))
      .send({ weightKg: 2, zone: "LOCAL", serviceTier: "STANDARD" });

    expect(res.status).toBe(200);
    expect(res.body.quote.totalCents).toBe(1000);
  });

  it("applies EXPRESS tier multiplier", async () => {
    const res = await request(app.server)
      .post("/rates/quote")
      .set(authHeader(API_KEYS.admin))
      .send({ weightKg: 2, zone: "LOCAL", serviceTier: "EXPRESS" });

    expect(res.status).toBe(200);
    expect(res.body.quote.totalCents).toBe(1500);
  });

  it("calculates NATIONAL OVERNIGHT rate correctly", async () => {
    const res = await request(app.server)
      .post("/rates/quote")
      .set(authHeader(API_KEYS.admin))
      .send({ weightKg: 3, zone: "NATIONAL", serviceTier: "OVERNIGHT" });

    expect(res.status).toBe(200);
    expect(res.body.quote.totalCents).toBe(9450);
  });

  it("rejects weight below minimum", async () => {
    const res = await request(app.server)
      .post("/rates/quote")
      .set(authHeader(API_KEYS.admin))
      .send({ weightKg: 0.05, zone: "LOCAL", serviceTier: "STANDARD" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weight/i);
  });

  it("rejects weight above maximum", async () => {
    const res = await request(app.server)
      .post("/rates/quote")
      .set(authHeader(API_KEYS.admin))
      .send({ weightKg: 600, zone: "LOCAL", serviceTier: "STANDARD" });

    expect(res.status).toBe(400);
  });

  it("stores quoted rate on shipment creation", async () => {
    const res = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send({
        originCity: "Hamburg",
        destinationCity: "Frankfurt",
        weightKg: 2,
        zone: "LOCAL",
        serviceTier: "EXPRESS",
      });

    expect(res.status).toBe(201);
    expect(res.body.shipment.quoted_rate_cents).toBe(1500);
  });
});
