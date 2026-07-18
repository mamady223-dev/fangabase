import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order } from "./finance.js";
import { transitionPayment } from "./finance.js";

export type Webhook = {
  provider: string;
  externalEventId: string;
  eventType: string;
  reference: string;
  amountMinor: bigint;
  currency: string;
  status: Order["status"];
  receivedAt: Date;
};
export class WebhookProcessor {
  #events = new Set<string>();
  verify(
    raw: Uint8Array,
    signature: string,
    timestamp: number,
    secret: string,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): void {
    if (raw.byteLength > 1_000_000 || Math.abs(nowSeconds - timestamp) > 300)
      throw new Error("WEBHOOK_INVALID");
    const actual = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(raw)
      .digest("hex");
    const left = Buffer.from(actual);
    const right = Buffer.from(signature);
    if (left.length !== right.length || !timingSafeEqual(left, right))
      throw new Error("WEBHOOK_INVALID");
  }
  process(event: Webhook, order: Order): "processed" | "duplicate" {
    const key = `${event.provider}:${event.externalEventId}:${event.eventType}`;
    if (this.#events.has(key)) return "duplicate";
    this.#events.add(key);
    if (
      order.provider !== event.provider ||
      order.id !== event.reference ||
      order.amountMinor !== event.amountMinor ||
      order.currency !== event.currency
    )
      throw new Error("WEBHOOK_INVALID");
    transitionPayment(order, event.status);
    return "processed";
  }
}
