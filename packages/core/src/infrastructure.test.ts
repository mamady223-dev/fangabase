import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DurableQueue, PrivateFileStore } from "./infrastructure.js";
import { IdempotencyStore, OrderService } from "./finance.js";
import { WebhookProcessor } from "./webhooks.js";

describe("infrastructure r?cup?rable", () => {
  it("retrouve un job durable sans Redis, r?cup?re un lease et rejoue DEAD", () => {
    const queue = new DurableQueue<{ id: number }>();
    const job = queue.enqueue("mail:1", { id: 1 });
    const claimed = queue.claim(job.availableAt, 1);
    expect(claimed?.id).toBe(job.id);
    queue.fail(job.id, "SMTP", new Date(job.availableAt.getTime() + 2), 1);
    expect(job.status).toBe("DEAD");
    queue.replay(job.id);
    expect(job.status).toBe("PENDING");
  });
  it("refuse traversal, MIME falsifi? et lecture priv?e d?un autre propri?taire", () => {
    const store = new PrivateFileStore();
    expect(() =>
      store.put(
        "u1",
        "../x",
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
    ).toThrow();
    expect(() =>
      store.put(
        "u1",
        "x.png",
        "image/jpeg",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
    ).toThrow();
    const file = store.put(
      "u1",
      "x.png",
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(() => store.read("u2", file.id)).toThrow("NOT_FOUND");
  });
  it("v?rifie le corps brut, le montant et le replay de webhook", () => {
    const raw = new TextEncoder().encode('{"ok":true}');
    const secret = "test-secret";
    const timestamp = 1000;
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(raw)
      .digest("hex");
    const processor = new WebhookProcessor();
    processor.verify(raw, signature, timestamp, secret, timestamp);
    const order = new OrderService(
      new IdempotencyStore(),
      new Map([["p", { amountMinor: 500n, currency: "XOF" as const }]]),
    ).create("u", "p", "fedapay", "abcdefghijklmnop");
    const event = {
      provider: "fedapay",
      externalEventId: "e1",
      eventType: "payment",
      reference: order.id,
      amountMinor: 500n,
      currency: "XOF",
      status: "SUCCEEDED" as const,
      receivedAt: new Date(),
    };
    expect(processor.process(event, order)).toBe("processed");
    expect(processor.process(event, order)).toBe("duplicate");
  });
});
