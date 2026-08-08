import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { readBrief } from "./brief.js";

const valid = {
  version: 1,
  product: {
    name: "École",
    slug: "ecole",
    type: "services",
    description: "Validation",
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
  deployment: {
    family: "cloud",
    docker: false,
    database: "postgres",
    vps_variant: null,
  },
  database: { engine: "postgres", provider: "neon" },
  email: { provider: "local_log" },
  storage: { provider: "local_private" },
  queue: { provider: "database" },
  cache: { provider: "memory_dev" },
  billing: { modes: [] },
  payments: { providers: [], default_provider: null },
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

describe("brief produit", () => {
  it("lit un unique bloc déterministe", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-brief-é-"));
    const path = join(root, "FANGABASE_INPUT.md");
    await writeFile(
      path,
      `# Entrée\n\n\`\`\`yaml fangabase\n${stringify(valid)}\`\`\`\n`,
    );
    await expect(readBrief(path)).resolves.toMatchObject({
      product: { slug: "ecole" },
    });
  });
  it("refuse les blocs multiples et les valeurs hors schéma", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-brief-invalid-"));
    const duplicate = join(root, "duplicate.md");
    await writeFile(
      duplicate,
      "```yaml fangabase\nversion: 1\n```\n```yaml fangabase\nversion: 1\n```\n",
    );
    await expect(readBrief(duplicate)).rejects.toThrow("exactement un bloc");
    const invalid = join(root, "invalid.md");
    await writeFile(invalid, "```yaml fangabase\nversion: 99\n```\n");
    await expect(readBrief(invalid)).rejects.toThrow("invalide");
  });
});
