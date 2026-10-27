import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { getAllMetrics, resetMetrics } from "../services/metricsService.js";
import { getOutboxSize } from "../services/notificationService.js";

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/analytics/metrics", async (_request, reply) => {
    return reply.send({
      metrics: getAllMetrics(),
      notificationOutboxSize: getOutboxSize(),
    });
  });

  app.post("/analytics/metrics/reset", async (_request, reply) => {
    resetMetrics();
    return reply.send({ reset: true });
  });
}
