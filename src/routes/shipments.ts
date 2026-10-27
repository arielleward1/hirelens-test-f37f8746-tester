import type { FastifyInstance } from "fastify";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";
import { createShipmentSchema, paginationSchema, updateStatusSchema } from "../schemas/index.js";
import {
  cancelShipment,
  createShipment,
  getShipmentById,
  getShipmentByTracking,
  getShipmentEvents,
  listShipments,
  updateShipmentStatus,
} from "../services/shipmentService.js";

export async function shipmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/shipments", async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const result = listShipments(query.page, query.pageSize, query.status);
    return reply.send(result);
  });

  app.get("/shipments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const shipment = getShipmentById(id);

    if (!shipment) {
      return reply.status(404).send({ error: "Shipment not found" });
    }

    return reply.send(shipment);
  });

  app.get("/shipments/track/:trackingNumber", async (request, reply) => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const shipment = getShipmentByTracking(trackingNumber);

    if (!shipment) {
      return reply.status(404).send({ error: "Shipment not found" });
    }

    const events = getShipmentEvents(shipment.id);
    return reply.send({ shipment, events });
  });

  app.post(
    "/shipments",
    {
      preHandler: [requireRole("admin", "operator"), idempotencyMiddleware],
    },
    async (request, reply) => {
      const body = createShipmentSchema.parse(request.body);
      const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

      try {
        const shipment = createShipment({
          ...body,
          idempotencyKey,
        });

        const response = { shipment };

        // TODO: Persist idempotency record when Idempotency-Key header is present

        return reply.status(201).send(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create shipment";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.patch(
    "/shipments/:id/status",
    { preHandler: requireRole("admin", "operator") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateStatusSchema.parse(request.body);
      const shipment = getShipmentById(id);

      if (!shipment) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      // TODO: Validate status transitions before updating (see isValidTransition)

      try {
        const updated = updateShipmentStatus(id, body.status, body.location, body.note);
        return reply.send({ shipment: updated });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Status update failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/shipments/:id/cancel",
    { preHandler: requireRole("admin", "operator") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body ?? {}) as { reason?: string };
      const shipment = getShipmentById(id);

      if (!shipment) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      if (shipment.status !== "CREATED" && shipment.status !== "PICKED_UP") {
        return reply.status(409).send({
          error: `Cannot cancel shipment in status ${shipment.status}`,
        });
      }

      const updated = cancelShipment(id, reason ?? "Cancelled by operator");
      return reply.send({ shipment: updated });
    }
  );
}
