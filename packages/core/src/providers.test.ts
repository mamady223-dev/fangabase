import { describe, expect, it } from "vitest";
import {
  ContractSimulator,
  ProviderRegistry,
  providerActivation,
} from "./providers.js";

describe("payment provider contracts", () => {
  it("requires an enabled provider and an exact capability", () => {
    const registry = new ProviderRegistry();
    registry.register(new ContractSimulator("sandbox"));
    expect(registry.require("sandbox", "ONE_TIME_PAYMENT").name).toBe(
      "sandbox",
    );
    expect(() => registry.require("sandbox", "PAYOUT")).toThrow(
      "PAYMENT_PROVIDER_UNAVAILABLE",
    );
  });

  it("uses only the four honest activation statuses", () => {
    const allowed = new Set([
      "IMPLEMENTED_NEEDS_SANDBOX_UAT",
      "NEEDS_PROVIDER_CONTRACT",
      "DISABLED",
      "UNSUPPORTED",
    ]);
    expect(
      Object.values(providerActivation).every((value) => allowed.has(value)),
    ).toBe(true);
    expect(providerActivation.monero).toBe("DISABLED");
  });
});
