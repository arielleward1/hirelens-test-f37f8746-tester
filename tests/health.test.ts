import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { API_KEYS, authHeader } from "./setup.js";
import type { FastifyInstance } from "fastify";

describe("Health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns health status without auth", async () => {
    const res = await request(app.server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("shipfast-logistics-api");
  });

  it("adds request id header on authenticated routes", async () => {
    const res = await request(app.server)
      .get("/shipments")
      .set(authHeader(API_KEYS.admin));

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });
});
