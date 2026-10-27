import Fastify from "fastify";
import cors from "@fastify/cors";
import { requestContextMiddleware } from "./middleware/requestContext.js";
import { timingMiddleware } from "./middleware/timing.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { carrierRoutes } from "./routes/carriers.js";
import { healthRoutes } from "./routes/health.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { lookupRoutes } from "./routes/lookup.js";
import { rateRoutes } from "./routes/rates.js";
import { reportRoutes } from "./routes/reports.js";
import { shipmentRoutes } from "./routes/shipments.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { zoneRoutes } from "./routes/zones.js";

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  await app.register(cors, { origin: true });
  app.addHook("onRequest", requestContextMiddleware);
  app.addHook("onRequest", timingMiddleware);

  app.setErrorHandler((error, _request, reply) => {
    if (error.name === "ZodError") {
      return reply.status(400).send({ error: "Validation failed", details: error.message });
    }

    app.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  await app.register(healthRoutes);
  await app.register(rateRoutes);
  await app.register(shipmentRoutes);
  await app.register(webhookRoutes);
  await app.register(carrierRoutes);
  await app.register(invoiceRoutes);
  await app.register(reportRoutes);
  await app.register(zoneRoutes);
  await app.register(analyticsRoutes);
  await app.register(lookupRoutes);

  return app;
}
