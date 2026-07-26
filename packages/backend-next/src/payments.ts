import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  audit,
  BackendProblem,
  enqueue,
  now,
  positiveMinor,
  withAsyncIdempotency,
  withIdempotency,
} from "./common.js";
import type { OrangeMoneyMlProvider } from "./orange-money-ml.js";
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
  cinetpay: "NEEDS_PROVIDER_CONTRACT",
  paydunya: "NEEDS_PROVIDER_CONTRACT",
  orange_money_ml: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
  bictorys: "NEEDS_PROVIDER_CONTRACT",
  paytech: "NEEDS_PROVIDER_CONTRACT",
  moneroo: "NEEDS_PROVIDER_CONTRACT",
};

export class PaymentService {
  constructor(
    private readonly secret: string,
    private readonly orangeMoneyMl: OrangeMoneyMlProvider | null = null,
  ) {}

  async checkout(
    state: BackendState,
    actor: PublicUser,
    input: {
      priceId: string;
      provider: string;
      amountMinor?: number;
      currency?: "XOF" | "EUR" | "USD";
    },
    idempotencyKey: string,
  ) {
    const price = requiredPrice(state, input.priceId);
    if (
      (input.amountMinor !== undefined &&
        input.amountMinor !== price.amountMinor) ||
      (input.currency !== undefined && input.currency !== price.currency)
    )
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const capability = paymentProviderMatrix[input.provider];
    if (
      !capability ||
      ["NEEDS_PROVIDER_CONTRACT", "DISABLED"].includes(capability)
    )
      throw new BackendProblem("PAYMENT_PROVIDER_UNAVAILABLE", 503);
    return withAsyncIdempotency(
      state,
      `${actor.id}:payment.checkout:${input.provider}:${idempotencyKey}`,
      input,
      async () => {
        if (input.provider === "orange_money_ml" && !this.orangeMoneyMl)
          throw new BackendProblem("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
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
        let paymentUrl: string | null = null;
        const publicToken = randomBytes(24).toString("base64url");
        if (input.provider === "orange_money_ml") {
          if (price.currency !== "XOF")
            throw new BackendProblem(
              "PAYMENT_PROVIDER_CURRENCY_UNSUPPORTED",
              422,
            );
          const external = await this.orangeMoneyMl!.checkout({
            orderId: payment.id,
            amountMinor: price.amountMinor,
            currency: "XOF",
          });
          payment.status = external.status;
          payment.providerReference = external.reference;
          payment.safeMetadata = {
            orderId: payment.id,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            encryptedTokens: external.encryptedTokens,
            publicTokenHash: createHash("sha256")
              .update(publicToken)
              .digest("hex"),
          };
          paymentUrl = external.paymentUrl;
        }
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
                : input.provider === "orange_money_ml"
                  ? paymentUrl
                  : "https://provider.example.invalid/checkout",
            publicToken,
          },
        };
      },
    );
  }

  async orangeMoneyMlWebhook(
    state: BackendState,
    rawBody: string,
  ): Promise<{ accepted: true; duplicate: boolean; status: string }> {
    if (Buffer.byteLength(rawBody) > 65536)
      throw new BackendProblem("WEBHOOK_INVALID", 413);
    const nowMs = Date.now();
    const rateKey = "webhook:orange_money_ml";
    let rate = state.rateLimits.find((item) => item.key === rateKey);
    if (!rate) {
      rate = { key: rateKey, attempts: [] };
      state.rateLimits.push(rate);
    }
    rate.attempts = rate.attempts.filter(
      (attempt) => nowMs - Date.parse(attempt) < 60_000,
    );
    if (rate.attempts.length >= 60)
      throw new BackendProblem("RATE_LIMITED", 429);
    rate.attempts.push(new Date(nowMs).toISOString());
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new BackendProblem("WEBHOOK_INVALID", 400);
    }
    const reference =
      typeof payload.reference === "string"
        ? payload.reference
        : typeof payload.order_id === "string"
          ? payload.order_id
          : null;
    if (!reference)
      return { accepted: true, duplicate: false, status: "PENDING" };
    const payment = state.payments.find(
      (item) =>
        item.provider === "orange_money_ml" &&
        (item.providerReference === reference || item.id === reference),
    );
    if (!payment)
      return { accepted: true, duplicate: false, status: "PENDING" };
    const eventKey = `orange_money_ml:${createHash("sha256").update(rawBody).digest("hex")}`;
    if (state.webhookEvents.includes(eventKey))
      return { accepted: true, duplicate: true, status: payment.status };
    if (!this.orangeMoneyMl)
      throw new BackendProblem("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
    const verified = await this.orangeMoneyMl.status(
      payment.providerReference ?? payment.id,
      payment.safeMetadata ?? {},
    );
    if (
      (verified.amountMinor !== null &&
        verified.amountMinor !== payment.amountMinor) ||
      (verified.currency !== null && verified.currency !== payment.currency)
    ) {
      payment.status = "NEEDS_REVIEW";
      audit(
        state,
        "system",
        "payment.provider_mismatch",
        "payment",
        payment.id,
      );
    } else {
      payment.status = verified.status;
    }
    state.webhookEvents.push(eventKey);
    enqueue(state, this.secret, "payment.webhook.received", payment.ownerId, {
      provider: "orange_money_ml",
      paymentId: payment.id,
      status: payment.status,
    });
    return { accepted: true, duplicate: false, status: payment.status };
  }

  async orangeMoneyMlReturn(
    state: BackendState,
    publicToken: string,
  ): Promise<{ status: string }> {
    const hash = createHash("sha256").update(publicToken).digest("hex");
    const payment = state.payments.find(
      (item) =>
        item.provider === "orange_money_ml" &&
        item.safeMetadata?.publicTokenHash === hash,
    );
    if (!payment) throw new BackendProblem("NOT_FOUND", 404);
    if (!this.orangeMoneyMl)
      throw new BackendProblem("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
    const verified = await this.orangeMoneyMl.status(
      payment.providerReference ?? payment.id,
      payment.safeMetadata ?? {},
    );
    if (
      (verified.amountMinor !== null &&
        verified.amountMinor !== payment.amountMinor) ||
      (verified.currency !== null && verified.currency !== payment.currency)
    )
      payment.status = "NEEDS_REVIEW";
    else payment.status = verified.status;
    return { status: payment.status };
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
