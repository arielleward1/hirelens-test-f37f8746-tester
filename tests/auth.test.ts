import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Authentication", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects requests without Authorization header", async () => {
    const res = await request(app.server).get("/shipments");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authorization/i);
  });

  it("rejects invalid API keys", async () => {
    const res = await request(app.server)
      .get("/shipments")
      .set(authHeader("sk_live_invalid_key"));
    expect(res.status).toBe(401);
  });

  it("rejects expired API keys", async () => {
    const res = await request(app.server)
      .get("/shipments")
      .set(authHeader(API_KEYS.expired));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("allows valid admin key", async () => {
    const res = await request(app.server)
      .get("/shipments")
      .set(authHeader(API_KEYS.admin));
    expect(res.status).toBe(200);
  });

  it("blocks readonly role from creating shipments", async () => {
    const res = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.readonly))
      .send({
        originCity: "Berlin",
        destinationCity: "Munich",
        weightKg: 2,
        zone: "REGIONAL",
        serviceTier: "STANDARD",
      });
    expect(res.status).toBe(403);
  });

  it("allows operator role to create shipments", async () => {
    const res = await request(app.server)
      .post("/shipments")
      .set(authHeader(API_KEYS.operator))
      .send({
        originCity: "Berlin",
        destinationCity: "Munich",
        weightKg: 2,
        zone: "REGIONAL",
        serviceTier: "STANDARD",
      });
    expect(res.status).toBe(201);
  });
});
