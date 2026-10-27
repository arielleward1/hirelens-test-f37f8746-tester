import type { FastifyInstance } from "fastify";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { createWebhookSchema } from "../schemas/index.js";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  processPendingWebhooks,
} from "../services/webhookService.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/webhooks", async (_request, reply) => {
    const subscriptions = listWebhookSubscriptions();
    return reply.send({ subscriptions });
  });

  app.post(
    "/webhooks",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const body = createWebhookSchema.parse(request.body);
      const subscription = createWebhookSubscription(body.url, body.events, body.secret);
      return reply.status(201).send({ subscription });
    }
  );

  app.post(
    "/webhooks/process",
    { preHandler: requireRole("admin") },
    async (_request, reply) => {
      const result = await processPendingWebhooks();
      return reply.send(result);
    }
  );
}
