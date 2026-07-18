import { createHash, randomUUID } from "node:crypto";
import type { Currency } from "@fangabase/contracts";

type LedgerKind = "CREDIT" | "DEBIT" | "RESERVE" | "RELEASE" | "COMPENSATION";
export type LedgerEntry = Readonly<{
  id: string;
  ownerId: string;
  amountMinor: bigint;
  currency: Currency;
  kind: LedgerKind;
  reference: string;
  occurredAt: Date;
}>;
export class ImmutableLedger {
  #entries: LedgerEntry[] = [];
  append(input: Omit<LedgerEntry, "id" | "occurredAt">): LedgerEntry {
    if (input.amountMinor <= 0n) throw new Error("VALIDATION_FAILED");
    const entry = Object.freeze({
      ...input,
      id: randomUUID(),
      occurredAt: new Date(),
    });
    this.#entries.push(entry);
    return entry;
  }
  balance(ownerId: string, currency: Currency): bigint {
    return this.#entries
      .filter(
        (entry) => entry.ownerId === ownerId && entry.currency === currency,
      )
      .reduce(
        (sum, entry) =>
          sum +
          (["CREDIT", "RELEASE", "COMPENSATION"].includes(entry.kind)
            ? entry.amountMinor
            : -entry.amountMinor),
        0n,
      );
  }
  entries(ownerId: string): readonly LedgerEntry[] {
    return this.#entries.filter((entry) => entry.ownerId === ownerId);
  }
}

type IdempotencyRecord<T> = { fingerprint: string; result: T };
export class IdempotencyStore {
  #records = new Map<string, IdempotencyRecord<unknown>>();
  execute<T>(
    ownerId: string,
    operation: string,
    provider: string,
    key: string,
    body: unknown,
    action: () => T,
  ): T {
    if (key.length < 16 || key.length > 128)
      throw new Error("VALIDATION_FAILED");
    const scope = `${ownerId}:${operation}:${provider}:${key}`;
    const fingerprint = createHash("sha256")
      .update(canonicalJson(body))
      .digest("hex");
    const existing = this.#records.get(scope);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error("IDEMPOTENCY_BODY_MISMATCH");
      return existing.result as T;
    }
    const result = action();
    this.#records.set(scope, { fingerprint, result });
    return result;
  }
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  return JSON.stringify(value);
}

export type Order = {
  id: string;
  ownerId: string;
  productId: string;
  amountMinor: bigint;
  currency: Currency;
  provider: string;
  status:
    | "CREATED"
    | "PENDING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED";
};
export class OrderService {
  readonly orders = new Map<string, Order>();
  constructor(
    private readonly idempotency: IdempotencyStore,
    private readonly prices: ReadonlyMap<
      string,
      { amountMinor: bigint; currency: Currency }
    >,
  ) {}
  create(
    ownerId: string,
    productId: string,
    provider: string,
    key: string,
  ): Order {
    const price = this.prices.get(productId);
    if (!price) throw new Error("NOT_FOUND");
    return this.idempotency.execute(
      ownerId,
      "create_order",
      provider,
      key,
      { productId },
      () => {
        const order: Order = {
          id: randomUUID(),
          ownerId,
          productId,
          amountMinor: price.amountMinor,
          currency: price.currency,
          provider,
          status: "CREATED",
        };
        this.orders.set(order.id, order);
        return order;
      },
    );
  }
  owned(ownerId: string, orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order || order.ownerId !== ownerId) throw new Error("NOT_FOUND");
    return order;
  }
}

const ranks = {
  CREATED: 0,
  PENDING: 1,
  SUCCEEDED: 3,
  FAILED: 3,
  CANCELLED: 3,
  REFUNDED: 4,
} as const;
export function transitionPayment(order: Order, next: Order["status"]): void {
  if (
    ranks[next] < ranks[order.status] ||
    (ranks[next] === ranks[order.status] && next !== order.status)
  )
    throw new Error("CONFLICT");
  order.status = next;
}
