import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { getDailyVolume, getShipmentSummary } from "../services/reportingService.js";

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/reports/summary", async (_request, reply) => {
    const summary = getShipmentSummary();
    return reply.send({ summary });
  });

  app.get("/reports/volume", async (request, reply) => {
    const { days } = request.query as { days?: string };
    const parsedDays = days ? Number(days) : 7;
    const volume = getDailyVolume(Number.isFinite(parsedDays) ? parsedDays : 7);
    return reply.send({ volume });
  });
}
