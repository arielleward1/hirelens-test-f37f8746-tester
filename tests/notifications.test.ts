import { describe, it, expect } from "vitest";
import { clearOutbox, notifyShipmentCreated, queueEmailNotification } from "../src/services/notificationService.js";

describe("notificationService", () => {
  it("queues email notifications", () => {
    clearOutbox();
    const result = queueEmailNotification({
      to: "ops@shipfast.test",
      subject: "Test",
      body: "Hello",
    });

    expect(result.queued).toBe(true);
    expect(result.messageId).toMatch(/^msg_/);
  });

  it("queues shipment created notification", () => {
    clearOutbox();
    const result = notifyShipmentCreated("customer@example.com", "SFABC123");
    expect(result.queued).toBe(true);
  });
});
