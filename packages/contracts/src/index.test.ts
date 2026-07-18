import { describe, expect, it } from "vitest";
import { addMoney, errorCodes, money, stableError } from "./index.js";

describe("contrats communs", () => {
  it("additionne uniquement des entiers de m?me devise", () =>
    expect(addMoney(money(125n, "XOF"), money(75n, "XOF")).amountMinor).toBe(
      200n,
    ));
  it("refuse les montants n?gatifs", () =>
    expect(() => money(-1n, "XOF")).toThrow("VALIDATION_FAILED"));
  it("publie des erreurs stables sans d?tail interne", () => {
    expect(errorCodes).toContain("IDEMPOTENCY_BODY_MISMATCH");
    expect(stableError("PAYMENT_PROVIDER_UNAVAILABLE", "req_1")).toEqual({
      error: {
        code: "PAYMENT_PROVIDER_UNAVAILABLE",
        message: "Paiement temporairement indisponible",
        requestId: "req_1",
      },
    });
  });
});
