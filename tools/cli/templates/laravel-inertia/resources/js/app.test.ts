import { describe, expect, it } from "vitest";
import { assertSafeViteEnvironment } from "./lib/security";

describe("sécurité du frontend Inertia", () => {
  it("refuse un secret exposé par Vite", () => {
    expect(() =>
      assertSafeViteEnvironment({ VITE_CLIENT_SECRET: "x" }),
    ).toThrow("interdite");
  });
});
