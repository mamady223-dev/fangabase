import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { configSchema } from "./config.js";
import {
  frontendIntegrationSchema,
  publicFrontendEnvironment,
} from "./frontend.js";

const connection = {
  source: "headless" as const,
  frontend_origin: "https://app.example.test",
  backend_url: "https://api.example.test/api",
  authentication: "cookie_session" as const,
  cors: { origins: ["https://app.example.test"], credentials: true as const },
  cookie_mode: "cross_subdomain_lax" as const,
};

describe("optional frontend integration", () => {
  it("keeps headless as default", () =>
    expect(
      frontendIntegrationSchema.parse({ ...connection, source: undefined })
        .source,
    ).toBe("headless"));
  it.each([
    "headless",
    "stitch",
    "banani",
    "provided_mockups",
    "ai_generated",
    "custom_frontend",
  ])("accepts explicit source %s", (source) =>
    expect(
      frontendIntegrationSchema.safeParse({ ...connection, source }).success,
    ).toBe(true),
  );
  it("rejects invalid backend URLs", () =>
    expect(
      frontendIntegrationSchema.safeParse({
        ...connection,
        backend_url: "javascript:alert(1)",
      }).success,
    ).toBe(false));
  it("rejects insecure remote origins", () =>
    expect(
      frontendIntegrationSchema.safeParse({
        ...connection,
        frontend_origin: "http://example.com",
      }).success,
    ).toBe(false));
  it("allows HTTP only for local development", () =>
    expect(
      frontendIntegrationSchema.safeParse({
        ...connection,
        frontend_origin: "http://localhost:3000",
        cors: { origins: ["http://localhost:3000"], credentials: true },
      }).success,
    ).toBe(true));
  it("rejects wildcard CORS", () =>
    expect(
      frontendIntegrationSchema.safeParse({
        ...connection,
        cors: { origins: ["*"], credentials: true },
      }).success,
    ).toBe(false));
  it("exports public URLs but no secret variables", () =>
    expect(publicFrontendEnvironment(connection)).not.toMatch(
      /NEXT_PUBLIC_.*(SECRET|KEY|TOKEN)|APP_KEY=|DATABASE_URL=/,
    ));
  it("keeps the repository configuration headless", async () => {
    const example = await readFile(
      resolve(import.meta.dirname, "../../../fangabase.config.example.yaml"),
      "utf8",
    );
    expect(example).toContain("source: headless");
    expect(configSchema.safeParse(parse(example)).success).toBe(true);
  });
  it("has no mandatory design runtime dependency", async () => {
    const packageFile = await readFile(
      resolve(import.meta.dirname, "../../../package.json"),
      "utf8",
    );
    expect(packageFile.toLowerCase()).not.toMatch(/banani|stitch|figma/);
  });
  it("does not reactivate demonstration pages", async () => {
    const active = await readFile(
      resolve(import.meta.dirname, "../../../apps/web/src/app/page.tsx"),
      "utf8",
    );
    expect(active).not.toMatch(/examples\/frontend-pages|Pricing|Dashboard/);
  });
  it("keeps the design skill explicitly activated only", async () => {
    const skill = await readFile(
      resolve(
        import.meta.dirname,
        "../../../.agents/skills/fangabase-design/SKILL.md",
      ),
      "utf8",
    );
    expect(skill).toContain(
      "ne s'active que lorsque l'utilisateur demande explicitement",
    );
    expect(skill).toContain("Ne jamais l'activer automatiquement");
  });
});
