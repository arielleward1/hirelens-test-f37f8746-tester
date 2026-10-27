import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { getCarrierByCode, getCarriersForZone, listCarriers, recommendCarrier } from "../services/carrierService.js";
import type { CarrierCode } from "../lib/constants.js";
import type { Zone } from "../types/index.js";

export async function carrierRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/carriers", async (_request, reply) => {
    const carriers = listCarriers();
    return reply.send({ carriers });
  });

  app.get("/carriers/zone/:zone", async (request, reply) => {
    const { zone } = request.params as { zone: Zone };
    const carriers = getCarriersForZone(zone);
    return reply.send({ zone, carriers });
  });

  app.get("/carriers/recommend/:zone", async (request, reply) => {
    const { zone } = request.params as { zone: Zone };
    const carrier = recommendCarrier(zone);

    if (!carrier) {
      return reply.status(404).send({ error: "No carrier available for zone" });
    }

    return reply.send({ zone, carrier });
  });

  app.get("/carriers/:code", async (request, reply) => {
    const { code } = request.params as { code: CarrierCode };
    const carrier = getCarrierByCode(code);

    if (!carrier) {
      return reply.status(404).send({ error: "Carrier not found" });
    }

    return reply.send({ carrier });
  });
}
