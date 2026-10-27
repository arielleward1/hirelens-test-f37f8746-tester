import type { FastifyInstance } from "fastify";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { createInvoiceForShipment, getInvoiceByShipment } from "../services/invoiceService.js";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authMiddleware);

  app.get("/invoices/shipment/:shipmentId", async (request, reply) => {
    const { shipmentId } = request.params as { shipmentId: string };
    const invoice = getInvoiceByShipment(shipmentId);

    if (!invoice) {
      return reply.status(404).send({ error: "Invoice not found" });
    }

    return reply.send({ invoice, lineItems: JSON.parse(invoice.line_items) });
  });

  app.post(
    "/invoices/shipment/:shipmentId",
    { preHandler: requireRole("admin", "operator") },
    async (request, reply) => {
      const { shipmentId } = request.params as { shipmentId: string };

      try {
        const invoice = createInvoiceForShipment(shipmentId);
        return reply.status(201).send({
          invoice,
          lineItems: JSON.parse(invoice.line_items),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invoice creation failed";
        return reply.status(404).send({ error: message });
      }
    }
  );
}
