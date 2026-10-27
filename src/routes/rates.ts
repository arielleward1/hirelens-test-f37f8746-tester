import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { rateQuoteSchema } from "../schemas/index.js";
import { calculateRate } from "../services/rateCalculator.js";

export async function rateRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.post("/rates/quote", async (request, reply) => {
    const body = rateQuoteSchema.parse(request.body);

    try {
      const quote = calculateRate(body);
      return reply.send({ quote });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rate calculation failed";
      return reply.status(400).send({ error: message });
    }
  });
}
