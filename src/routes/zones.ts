import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { listZoneMappings, resolveZoneByPostal } from "../services/zoneLookupService.js";

export async function zoneRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/zones/mappings", async (request, reply) => {
    const { country } = request.query as { country?: string };
    const mappings = listZoneMappings(country);
    return reply.send({ mappings });
  });

  app.get("/zones/resolve", async (request, reply) => {
    const { country, postal } = request.query as { country?: string; postal?: string };

    if (!country || !postal) {
      return reply.status(400).send({ error: "country and postal query params are required" });
    }

    const zone = resolveZoneByPostal(country, postal);

    if (!zone) {
      return reply.status(404).send({ error: "Zone not found for postal code" });
    }

    return reply.send({ country, postal, zone });
  });
}
