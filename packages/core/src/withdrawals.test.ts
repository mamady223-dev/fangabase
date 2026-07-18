import { describe, expect, it } from "vitest";
import { ImmutableLedger } from "./finance.js";
import { WithdrawalService } from "./withdrawals.js";

describe("retraits", () => {
  it("branche une demande approuv?e sur le worker payout", async () => {
    const ledger = new ImmutableLedger();
    ledger.append({
      ownerId: "u1",
      amountMinor: 10000n,
      currency: "XOF",
      kind: "CREDIT",
      reference: "sale",
    });
    let calls = 0;
    const service = new WithdrawalService(ledger, {
      async createPayout(item) {
        calls += 1;
        return { reference: `pay_${item.id}`, status: "COMPLETED" };
      },
    });
    const item = service.request("u1", 2000n);
    service.approve(item.id);
    await service.process(item.id);
    expect(calls).toBe(1);
    expect(item.status).toBe("COMPLETED");
  });
  it("lib?re la r?serve apr?s ?chec fournisseur", async () => {
    const ledger = new ImmutableLedger();
    ledger.append({
      ownerId: "u1",
      amountMinor: 5000n,
      currency: "XOF",
      kind: "CREDIT",
      reference: "sale",
    });
    const service = new WithdrawalService(ledger, {
      async createPayout() {
        return { reference: "failed", status: "FAILED" };
      },
    });
    const item = service.request("u1", 1000n);
    service.approve(item.id);
    await service.process(item.id);
    expect(ledger.balance("u1", "XOF")).toBe(5000n);
  });
});
