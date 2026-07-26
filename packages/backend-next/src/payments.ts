import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  audit,
  BackendProblem,
  enqueue,
  now,
  positiveMinor,
  withIdempotency,
} from "./common.js";
import type { PublicUser } from "./identity.js";
import type { BackendState, PaymentRecord } from "./state.js";
import { requiredPrice } from "./billing.js";

export type PaymentProviderStatus =
  | "LOCAL_TEST"
  | "IMPLEMENTED_NEEDS_SANDBOX_UAT"
  | "NEEDS_PROVIDER_CONTRACT"
  | "DISABLED";

export const paymentProviderMatrix: Record<string, PaymentProviderStatus> = {
  local: "LOCAL_TEST",
  stripe: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
  fedapay: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
  monero: "DISABLED",
  cinetpay: "NEEDS_PROVIDER_CONTRACT",
  paydunya: "NEEDS_PROVIDER_CONTRACT",
  orange_money: "NEEDS_PROVIDER_CONTRACT",
  bictorys: "NEEDS_PROVIDER_CONTRACT",
  paytech: "NEEDS_PROVIDER_CONTRACT",
  moneroo: "NEEDS_PROVIDER_CONTRACT",
};

export class PaymentService {
  constructor(private readonly secret: string) {}

  checkout(
    state: BackendState,
    actor: PublicUser,
    input: {
      priceId: string;
      provider: string;
      amountMinor: number;
      currency: "XOF" | "EUR" | "USD";
    },
    idempotencyKey: string,
  ) {
    const price = requiredPrice(state, input.priceId);
    if (
      price.amountMinor !== input.amountMinor ||
      price.currency !== input.currency
    )
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const capability = paymentProviderMatrix[input.provider];
    if (
      !capability ||
      ["NEEDS_PROVIDER_CONTRACT", "DISABLED"].includes(capability)
    )
      throw new BackendProblem("PAYMENT_PROVIDER_UNAVAILABLE", 503);
    return withIdempotency(
      state,
      `${actor.id}:payment.checkout:${input.provider}:${idempotencyKey}`,
      input,
      () => {
        const payment: PaymentRecord = {
          id: randomUUID(),
          ownerId: actor.id,
          priceId: price.id,
          provider: input.provider,
          amountMinor: price.amountMinor,
          currency: price.currency,
          status: input.provider === "local" ? "SUCCEEDED" : "PENDING",
          refundedMinor: 0,
          createdAt: now(),
        };
        state.payments.push(payment);
        enqueue(state, this.secret, "payment.created", actor.id, {
          paymentId: payment.id,
          provider: payment.provider,
        });
        audit(
          state,
          actor.id,
          "payment.checkout.created",
          "payment",
          payment.id,
        );
        return {
          status: 201,
          body: {
            payment,
            capability,
            paymentUrl:
              input.provider === "local"
                ? null
                : "https://provider.example.invalid/checkout",
          },
        };
      },
    );
  }

  refund(
    state: BackendState,
    actor: PublicUser,
    paymentId: string,
    amountInput: number,
    idempotencyKey: string,
  ) {
    const payment = state.payments.find(
      (candidate) =>
        candidate.id === paymentId &&
        (candidate.ownerId === actor.id || actor.role === "SUPERADMIN"),
    );
    if (!payment) throw new BackendProblem("NOT_FOUND", 404);
    const amountMinor = positiveMinor(amountInput);
    if (
      payment.status !== "SUCCEEDED" ||
      payment.refundedMinor + amountMinor > payment.amountMinor
    )
      throw new BackendProblem("CONFLICT", 409);
    return withIdempotency(
      state,
      `${actor.id}:payment.refund:${payment.provider}:${idempotencyKey}`,
      { paymentId, amountMinor },
      () => {
        payment.refundedMinor += amountMinor;
        if (payment.refundedMinor === payment.amountMinor)
          payment.status = "REFUNDED";
        enqueue(state, this.secret, "payment.refunded", payment.ownerId, {
          paymentId,
          amountMinor,
        });
        audit(state, actor.id, "payment.refunded", "payment", paymentId);
        return { status: 200, body: payment };
      },
    );
  }

  stripeWebhook(
    state: BackendState,
    rawBody: string,
    signatureHeader: string,
    webhookSecret: string,
  ): { accepted: true; duplicate: boolean } {
    if (Buffer.byteLength(rawBody) > 1024 * 1024)
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => part.split("=", 2)),
    );
    const timestamp = Number(parts.t);
    const signature = parts.v1;
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > 300 ||
      !signature
    )
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    const expected = createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted))
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    let event: {
      id: string;
      type: string;
      data: { object: { metadata?: { payment_id?: string } } };
    };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    }
    if (!event.id || !event.type)
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    if (state.webhookEvents.includes(`stripe:${event.id}`))
      return { accepted: true, duplicate: true };
    state.webhookEvents.push(`stripe:${event.id}`);
    const paymentId = event.data.object.metadata?.payment_id;
    const payment = state.payments.find((item) => item.id === paymentId);
    if (payment && event.type === "checkout.session.completed")
      payment.status = "SUCCEEDED";
    enqueue(
      state,
      this.secret,
      "payment.webhook.received",
      payment?.ownerId ?? "system",
      {
        provider: "stripe",
        eventId: event.id,
        type: event.type,
      },
    );
    return { accepted: true, duplicate: false };
  }
}
