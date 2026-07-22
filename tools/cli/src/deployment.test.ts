import { describe, expect, it } from "vitest";
import { deploymentFiles } from "./deployment.js";
import { configSchema, type FangaBaseConfig } from "./config.js";

const base = {
  version: 1 as const,
  product: {
    name: "Test",
    slug: "test",
    type: "saas" as const,
    description: "",
    locale: "fr" as const,
    timezone: "UTC",
    country: "ML",
    default_currency: "XOF",
  },
  architecture: {
    target: "cloud_vercel" as const,
    frontend: "next" as const,
    backend: "next" as const,
    ui: "next" as const,
  },
  database: { engine: "postgres" as const, provider: "neon" },
  email: { provider: "resend" as const },
  storage: { provider: "r2" as const },
  queue: { provider: "database" as const },
  cache: { provider: "database" as const },
  billing: { modes: ["credits" as const] },
  payments: {
    providers: ["stripe" as const],
    default_provider: "stripe" as const,
  },
  design: { source: "headless" as const },
  features: {
    organizations: true,
    marketplace: false,
    admin: true,
    audit_log: true,
    notifications: true,
    uploads: true,
  },
};

describe("deployment profiles", () => {
  it.each([
    ["cloud", "cloud_vercel", "next", "next", "postgres"],
    ["vps", "vps_laravel", "blade", "laravel", "postgres"],
    ["shared", "shared_laravel", "blade", "laravel", "mysql"],
    ["hybrid", "hybrid", "next", "laravel", "mysql"],
  ] as const)("validates %s", (family, target, frontend, backend, database) => {
    const value = {
      ...base,
      architecture: { target, frontend, backend, ui: frontend },
      database: { engine: database, provider: database },
      deployment: {
        family,
        database,
        docker: false,
        vps_variant: family === "vps" ? "laravel" : null,
      },
    };
    expect(configSchema.safeParse(value).success).toBe(true);
  });

  it("is deterministic", () =>
    expect(deploymentFiles(base)).toEqual(deploymentFiles(base)));
  it("documents cloud serverless limits", () =>
    expect(contents(base)).toContain(
      "Serverless runtimes cannot host persistent workers",
    ));
  it("generates VPS workers and scheduler", () =>
    expect(paths(vps())).toEqual(
      expect.arrayContaining([
        "systemd/fangabase-worker.service",
        "systemd/fangabase-scheduler.service",
      ]),
    ));
  it("never generates Docker or systemd for shared", () => {
    const files = deploymentFiles(shared());
    expect(paths(filesConfig(shared()))).not.toContain("docker/Dockerfile");
    expect(files.some((file) => file.path.startsWith("systemd/"))).toBe(false);
  });
  it("documents strict hybrid CORS and cookies", () =>
    expect(contents(hybrid())).toContain("exact CORS origins"));
  it("contains no secret values", () =>
    expect(contents(base)).not.toMatch(
      /sk_live_|ghp_|BEGIN (RSA|OPENSSH) PRIVATE KEY/,
    ));
  it("generates Docker only when explicitly selected on VPS", () =>
    expect(paths(vps(true))).toContain("docker/Dockerfile"));
});

function vps(docker = false): FangaBaseConfig {
  return {
    ...base,
    architecture: {
      target: "vps_laravel",
      frontend: "blade",
      backend: "laravel",
      ui: "blade",
    },
    deployment: {
      family: "vps",
      database: "postgres",
      docker,
      vps_variant: "laravel",
    },
  };
}
function shared(): FangaBaseConfig {
  return {
    ...base,
    architecture: {
      target: "shared_laravel",
      frontend: "blade",
      backend: "laravel",
      ui: "blade",
    },
    database: { engine: "mysql", provider: "mysql" },
    deployment: {
      family: "shared",
      database: "mysql",
      docker: false,
      vps_variant: null,
    },
  };
}
function hybrid(): FangaBaseConfig {
  return {
    ...shared(),
    architecture: {
      target: "hybrid",
      frontend: "next",
      backend: "laravel",
      ui: "next",
    },
    deployment: {
      family: "hybrid",
      database: "mysql",
      docker: false,
      vps_variant: null,
    },
  };
}
function contents(config: FangaBaseConfig) {
  return deploymentFiles(config)
    .map((file) => file.content)
    .join("\n");
}
function paths(config: FangaBaseConfig) {
  return deploymentFiles(config).map((file) => file.path);
}
function filesConfig(config: FangaBaseConfig) {
  return config;
}
