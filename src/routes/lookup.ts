import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { validateTrackingNumber } from "../services/trackingValidator.js";
import { evaluateSla, getSlaDays } from "../services/slaCalculator.js";
import { normalizeCity } from "../services/addressNormalizer.js";
import { getShipmentByTracking } from "../services/shipmentService.js";
import type { ServiceTier, Zone } from "../types/index.js";

export async function lookupRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/lookup/tracking/:trackingNumber", async (request, reply) => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const result = validateTrackingNumber(trackingNumber);
    return reply.send({ result });
  });

  app.get("/lookup/sla", async (request, reply) => {
    const { zone, tier } = request.query as { zone?: Zone; tier?: ServiceTier };

    if (!zone || !tier) {
      return reply.status(400).send({ error: "zone and tier query params are required" });
    }

    return reply.send({ zone, tier, slaDays: getSlaDays(zone, tier) });
  });

  app.get("/lookup/sla/:trackingNumber", async (request, reply) => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const shipment = getShipmentByTracking(trackingNumber);

    if (!shipment) {
      return reply.status(404).send({ error: "Shipment not found" });
    }

    const evaluation = evaluateSla(
      shipment.created_at,
      shipment.estimated_delivery,
      shipment.status
    );

    return reply.send({ shipmentId: shipment.id, evaluation });
  });

  app.post("/lookup/normalize-city", async (request, reply) => {
    const { city } = request.body as { city?: string };

    if (!city) {
      return reply.status(400).send({ error: "city is required" });
    }

    return reply.send({ result: normalizeCity(city) });
  });
}
