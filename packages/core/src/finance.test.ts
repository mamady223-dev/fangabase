import { describe, expect, it } from "vitest";
import {
  IdempotencyStore,
  ImmutableLedger,
  OrderService,
  transitionPayment,
} from "./finance.js";

describe("finance commune", () => {
  it("scope l?idempotence par propri?taire et refuse un autre corps", () => {
    const store = new IdempotencyStore();
    const first = store.execute(
      "u1",
      "pay",
      "fedapay",
      "abcdefghijklmnop",
      { a: 1 },
      () => "u1",
    );
    expect(first).toBe("u1");
    expect(
      store.execute(
        "u2",
        "pay",
        "fedapay",
        "abcdefghijklmnop",
        { a: 1 },
        () => "u2",
      ),
    ).toBe("u2");
    expect(() =>
      store.execute(
        "u1",
        "pay",
        "fedapay",
        "abcdefghijklmnop",
        { a: 2 },
        () => "x",
      ),
    ).toThrow("IDEMPOTENCY_BODY_MISMATCH");
  });
  it("lit le prix catalogue c?t? serveur et prot?ge l?IDOR", () => {
    const service = new OrderService(
      new IdempotencyStore(),
      new Map([["pack", { amountMinor: 5000n, currency: "XOF" as const }]]),
    );
    const order = service.create("u1", "pack", "fedapay", "abcdefghijklmnop");
    expect(order.amountMinor).toBe(5000n);
    expect(() => service.owned("u2", order.id)).toThrow("NOT_FOUND");
  });
  it("garde le ledger immutable et corrige par compensation", () => {
    const ledger = new ImmutableLedger();
    const entry = ledger.append({
      ownerId: "u1",
      amountMinor: 1000n,
      currency: "XOF",
      kind: "CREDIT",
      reference: "purchase",
    });
    expect(() => Object.assign(entry, { amountMinor: 0n })).toThrow();
    ledger.append({
      ownerId: "u1",
      amountMinor: 200n,
      currency: "XOF",
      kind: "DEBIT",
      reference: "usage",
    });
    expect(ledger.balance("u1", "XOF")).toBe(800n);
  });
  it("refuse une transition de webhook r?trograde", () => {
    const order = new OrderService(
      new IdempotencyStore(),
      new Map([["p", { amountMinor: 1n, currency: "XOF" as const }]]),
    ).create("u", "p", "stripe", "abcdefghijklmnop");
    transitionPayment(order, "SUCCEEDED");
    expect(() => transitionPayment(order, "PENDING")).toThrow("CONFLICT");
  });
});
