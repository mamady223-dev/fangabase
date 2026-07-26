import { randomUUID } from "node:crypto";
import {
  audit,
  BackendProblem,
  now,
  positiveMinor,
  withIdempotency,
} from "./common.js";
import type { PublicUser } from "./identity.js";
import type {
  BackendState,
  CatalogPrice,
  CreditLot,
  LedgerRecord,
  SubscriptionRecord,
} from "./state.js";

export class BillingService {
  catalog(state: BackendState): CatalogPrice[] {
    return state.catalog.filter((price) => !price.archivedAt);
  }

  createPrice(
    state: BackendState,
    actor: PublicUser,
    input: {
      productKey: string;
      label: string;
      amountMinor: number;
      currency: "XOF" | "EUR" | "USD";
    },
  ): CatalogPrice {
    requireSuperadmin(actor);
    const productKey = input.productKey.trim();
    if (!/^[a-z0-9_.-]{2,80}$/.test(productKey))
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const amountMinor = positiveMinor(input.amountMinor);
    const version =
      Math.max(
        0,
        ...state.catalog
          .filter((price) => price.productKey === productKey)
          .map((price) => price.version),
      ) + 1;
    const price: CatalogPrice = {
      id: randomUUID(),
      productKey,
      label: input.label.trim().slice(0, 120),
      amountMinor,
      currency: input.currency,
      version,
      archivedAt: null,
    };
    state.catalog.push(price);
    audit(state, actor.id, "catalog.price.created", "price", price.id);
    return price;
  }

  archivePrice(state: BackendState, actor: PublicUser, priceId: string): void {
    requireSuperadmin(actor);
    const price = requiredPrice(state, priceId);
    price.archivedAt = now();
    audit(state, actor.id, "catalog.price.archived", "price", priceId);
  }

  credits(state: BackendState, actor: PublicUser) {
    const entries = state.ledger.filter((entry) => entry.ownerId === actor.id);
    const availableMinor = entries.reduce((total, entry) => {
      if (["CREDIT", "RELEASE", "COMPENSATION"].includes(entry.kind))
        return total + entry.amountMinor;
      return total - entry.amountMinor;
    }, 0);
    const reservedMinor = entries
      .filter((entry) => entry.kind === "RESERVE")
      .reduce((total, entry) => total + entry.amountMinor, 0);
    return {
      currency: entries[0]?.currency ?? "XOF",
      availableMinor,
      reservedMinor,
      entries,
      lots: state.creditLots.filter((lot) => lot.ownerId === actor.id),
    };
  }

  grant(
    state: BackendState,
    actor: PublicUser,
    input: {
      ownerId: string;
      amountMinor: number;
      currency: "XOF" | "EUR" | "USD";
      expiresAt?: string | null | undefined;
    },
    idempotencyKey: string,
  ) {
    requireSuperadmin(actor);
    return withIdempotency(
      state,
      `${actor.id}:credit.grant:local:${idempotencyKey}`,
      input,
      () => {
        const amountMinor = positiveMinor(input.amountMinor);
        const lot: CreditLot = {
          id: randomUUID(),
          ownerId: input.ownerId,
          remainingMinor: amountMinor,
          currency: input.currency,
          expiresAt: input.expiresAt ?? null,
          createdAt: now(),
        };
        state.creditLots.push(lot);
        const entry = this.appendLedger(state, {
          ownerId: input.ownerId,
          kind: "CREDIT",
          amountMinor,
          currency: input.currency,
          reference: `grant:${lot.id}`,
        });
        audit(state, actor.id, "billing.credit.granted", "ledger", entry.id);
        return { status: 201, body: { lot, entry } };
      },
    );
  }

  consume(
    state: BackendState,
    ownerId: string,
    amountInput: number,
    currency: "XOF" | "EUR" | "USD",
    reference: string,
  ): LedgerRecord {
    let remaining = positiveMinor(amountInput);
    const lots = state.creditLots
      .filter(
        (lot) =>
          lot.ownerId === ownerId &&
          lot.currency === currency &&
          lot.remainingMinor > 0 &&
          (!lot.expiresAt || lot.expiresAt > now()),
      )
      .sort((left, right) => {
        const leftExpiry = left.expiresAt ?? "9999";
        const rightExpiry = right.expiresAt ?? "9999";
        return (
          leftExpiry.localeCompare(rightExpiry) ||
          left.createdAt.localeCompare(right.createdAt)
        );
      });
    if (lots.reduce((total, lot) => total + lot.remainingMinor, 0) < remaining)
      throw new BackendProblem("INSUFFICIENT_BALANCE", 409);
    for (const lot of lots) {
      const used = Math.min(lot.remainingMinor, remaining);
      lot.remainingMinor -= used;
      remaining -= used;
      if (remaining === 0) break;
    }
    return this.appendLedger(state, {
      ownerId,
      kind: "DEBIT",
      amountMinor: amountInput,
      currency,
      reference,
    });
  }

  purchaseCredits(
    state: BackendState,
    actor: PublicUser,
    input: {
      priceId: string;
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
    return withIdempotency(
      state,
      `${actor.id}:credit.purchase:local:${idempotencyKey}`,
      input,
      () => {
        const lot: CreditLot = {
          id: randomUUID(),
          ownerId: actor.id,
          remainingMinor: price.amountMinor,
          currency: price.currency,
          expiresAt: null,
          createdAt: now(),
        };
        state.creditLots.push(lot);
        const entry = this.appendLedger(state, {
          ownerId: actor.id,
          kind: "CREDIT",
          amountMinor: price.amountMinor,
          currency: price.currency,
          reference: `purchase:${lot.id}`,
        });
        return { status: 201, body: { lot, entry } };
      },
    );
  }

  subscription(
    state: BackendState,
    actor: PublicUser,
  ): SubscriptionRecord | null {
    return (
      state.subscriptions.filter((item) => item.ownerId === actor.id).at(-1) ??
      null
    );
  }

  createSubscription(
    state: BackendState,
    actor: PublicUser,
    priceId: string,
    idempotencyKey: string,
  ) {
    requiredPrice(state, priceId);
    return withIdempotency(
      state,
      `${actor.id}:subscription.create:local:${idempotencyKey}`,
      { priceId },
      () => {
        const subscription: SubscriptionRecord = {
          id: randomUUID(),
          ownerId: actor.id,
          priceId,
          status: "ACTIVE",
          createdAt: now(),
        };
        state.subscriptions.push(subscription);
        state.entitlements[actor.id] = [
          ...new Set([
            ...(state.entitlements[actor.id] ?? []),
            `price:${priceId}`,
          ]),
        ];
        audit(
          state,
          actor.id,
          "billing.subscription.created",
          "subscription",
          subscription.id,
        );
        return { status: 201, body: subscription };
      },
    );
  }

  cancelSubscription(
    state: BackendState,
    actor: PublicUser,
    subscriptionId: string,
  ): SubscriptionRecord {
    const subscription = state.subscriptions.find(
      (item) => item.id === subscriptionId && item.ownerId === actor.id,
    );
    if (!subscription) throw new BackendProblem("NOT_FOUND", 404);
    if (!["ACTIVE", "PAST_DUE"].includes(subscription.status))
      throw new BackendProblem("CONFLICT", 409);
    subscription.status = "CANCELLED";
    state.entitlements[actor.id] = (state.entitlements[actor.id] ?? []).filter(
      (item) => item !== `price:${subscription.priceId}`,
    );
    return subscription;
  }

  entitlements(state: BackendState, actor: PublicUser): string[] {
    return state.entitlements[actor.id] ?? [];
  }

  summary(state: BackendState, actor: PublicUser) {
    return {
      credits: this.credits(state, actor),
      subscription: this.subscription(state, actor),
      entitlements: this.entitlements(state, actor),
    };
  }

  private appendLedger(
    state: BackendState,
    input: Omit<LedgerRecord, "id" | "createdAt">,
  ): LedgerRecord {
    if (
      state.ledger.some(
        (entry) =>
          entry.ownerId === input.ownerId &&
          entry.reference === input.reference &&
          entry.kind === input.kind,
      )
    )
      throw new BackendProblem("CONFLICT", 409);
    const entry: LedgerRecord = {
      id: randomUUID(),
      createdAt: now(),
      ...input,
    };
    state.ledger.push(entry);
    return entry;
  }
}

export function requiredPrice(
  state: BackendState,
  priceId: string,
): CatalogPrice {
  const price = state.catalog.find(
    (candidate) => candidate.id === priceId && !candidate.archivedAt,
  );
  if (!price) throw new BackendProblem("NOT_FOUND", 404);
  return price;
}

function requireSuperadmin(actor: PublicUser): void {
  if (actor.role !== "SUPERADMIN") throw new BackendProblem("FORBIDDEN", 403);
}
