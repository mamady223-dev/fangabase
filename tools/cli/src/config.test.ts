import { describe, expect, it } from "vitest";
import { configSchema } from "./config.js";

const valid = {
  version: 1,
  product: {
    name: "Test",
    slug: "test",
    type: "saas",
    description: "",
    locale: "fr",
    timezone: "Africa/Bamako",
    country: "ML",
    default_currency: "XOF",
  },
  architecture: {
    target: "cloud_vercel",
    frontend: "next",
    backend: "next",
    ui: "next",
  },
  database: { engine: "postgres", provider: "neon" },
  email: { provider: "local_log" },
  storage: { provider: "local_private" },
  queue: { provider: "database" },
  cache: { provider: "memory_dev" },
  billing: { modes: ["credits", "subscription"] },
  payments: { providers: ["fedapay"], default_provider: "fedapay" },
  design: { source: "headless" },
  features: {
    organizations: true,
    marketplace: false,
    admin: true,
    audit_log: true,
    notifications: true,
    uploads: true,
  },
};

describe("configSchema", () => {
  it("accepte le profil cloud par défaut", () =>
    expect(configSchema.safeParse(valid).success).toBe(true));
  it("refuse MySQL sur cloud Vercel", () =>
    expect(
      configSchema.safeParse({
        ...valid,
        database: { engine: "mysql", provider: "mysql" },
      }).success,
    ).toBe(false));
  it("refuse un fournisseur par défaut non activé", () =>
    expect(
      configSchema.safeParse({
        ...valid,
        payments: { providers: ["stripe"], default_provider: "fedapay" },
      }).success,
    ).toBe(false));
  it.each(["headless", "banani", "provided_mockups", "ai_generated"])(
    "accepte la source visuelle %s",
    (source) =>
      expect(
        configSchema.safeParse({ ...valid, design: { source } }).success,
      ).toBe(true),
  );
  it("refuse l'ancien thème FangaBase", () =>
    expect(
      configSchema.safeParse({ ...valid, design: { source: "fangabase" } })
        .success,
    ).toBe(false));
});
