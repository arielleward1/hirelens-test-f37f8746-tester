import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Reports", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns shipment summary", async () => {
    await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.admin))
      .send({
        originCity: "Berlin",
        destinationCity: "Munich",
        weightKg: 2,
        zone: "NATIONAL",
        serviceTier: "STANDARD",
      });

    const res = await request(app.server)
      .get("/reports/summary")
      .set(authHeader(API_KEYS.readonly));

    expect(res.status).toBe(200);
    expect(res.body.summary.totalShipments).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.summary.byStatus)).toBe(true);
  });

  it("returns daily volume report", async () => {
    const res = await request(app.server)
      .get("/reports/volume?days=30")
      .set(authHeader(API_KEYS.admin));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.volume)).toBe(true);
  });
});
