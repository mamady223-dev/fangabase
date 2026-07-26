import { describe, expect, it } from "vitest";
import { paymentStatuses, roles, withdrawalStatuses } from "./index.js";
import parity from "../test-cases/parity.json" with { type: "json" };

describe("enums contractuels partagés", () => {
  it("garde les enums contractuels synchronis?s", () => {
    expect(parity.roles).toEqual(roles);
    expect(parity.payment_statuses).toEqual(paymentStatuses);
    expect(parity.withdrawal_statuses).toEqual(withdrawalStatuses);
  });
});
