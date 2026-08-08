import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { configSchema, type FangaBaseConfig } from "./config.js";
import { generateProject, planProject } from "./project-generator.js";

const sourceRoot = resolve(import.meta.dirname, "../../..");
const base = configSchema.parse({
  version: 1,
  product: {
    name: "KanuPay",
    slug: "kanupay",
    type: "services",
    description: "Paiements de services sans métier imposé",
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
  billing: { modes: ["one_time"] },
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
});

const profiles: Array<
  [
    string,
    Partial<FangaBaseConfig> & {
      architecture: FangaBaseConfig["architecture"];
      deployment: NonNullable<FangaBaseConfig["deployment"]>;
      database: FangaBaseConfig["database"];
    },
  ]
> = [
  [
    "cloud-next",
    {
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
    },
  ],
  [
    "vps-next",
    {
      architecture: {
        target: "vps_next",
        frontend: "next",
        backend: "next",
        ui: "next",
      },
      deployment: {
        family: "vps",
        docker: false,
        database: "postgres",
        vps_variant: "next",
      },
      database: { engine: "postgres", provider: "postgres" },
    },
  ],
  [
    "vps-laravel-next",
    {
      architecture: {
        target: "vps_laravel",
        frontend: "next",
        backend: "laravel",
        ui: "next",
      },
      deployment: {
        family: "vps",
        docker: false,
        database: "postgres",
        vps_variant: "laravel_api_next",
      },
      database: { engine: "postgres", provider: "postgres" },
    },
  ],
  [
    "vps-laravel",
    {
      architecture: {
        target: "vps_laravel",
        frontend: "blade",
        backend: "laravel",
        ui: "blade",
      },
      deployment: {
        family: "vps",
        docker: false,
        database: "mysql",
        vps_variant: "laravel",
      },
      database: { engine: "mysql", provider: "mysql" },
    },
  ],
  [
    "shared-blade",
    {
      architecture: {
        target: "shared_laravel",
        frontend: "blade",
        backend: "laravel",
        ui: "blade",
      },
      deployment: {
        family: "shared",
        docker: false,
        database: "mysql",
        vps_variant: null,
      },
      database: { engine: "mysql", provider: "mysql" },
    },
  ],
  [
    "hybrid-next",
    {
      architecture: {
        target: "hybrid",
        frontend: "next",
        backend: "laravel",
        ui: "next",
      },
      deployment: {
        family: "hybrid",
        docker: false,
        database: "postgres",
        vps_variant: null,
      },
      database: { engine: "postgres", provider: "postgres" },
    },
  ],
  [
    "hybrid-react",
    {
      architecture: {
        target: "hybrid",
        frontend: "react",
        backend: "laravel",
        ui: "react",
      },
      deployment: {
        family: "hybrid",
        docker: false,
        database: "postgres",
        vps_variant: null,
      },
      database: { engine: "postgres", provider: "postgres" },
    },
  ],
];

describe("générateur de projet ciblé", () => {
  it.each(profiles)(
    "génère le profil %s sans backend concurrent",
    async (_name, overrides) => {
      const directory = await mkdtemp(join(tmpdir(), "fangabase-project-"));
      const destination = join(directory, "application");
      const config = configSchema.parse({ ...base, ...overrides });
      const result = await generateProject({
        config,
        destination,
        sourceRoot,
        confirmed: true,
      });
      const rootFiles = await readdir(destination);
      expect(rootFiles).toContain("generation-manifest.json");
      expect(rootFiles).toEqual(
        expect.arrayContaining([
          "GETTING_STARTED.md",
          "NEXT_STEPS.md",
          "CONFIGURATION_SERVICES.md",
          "ARCHITECTURE.md",
        ]),
      );
      const packageJson = JSON.parse(
        await readFile(join(destination, "package.json"), "utf8"),
      );
      expect(packageJson.scripts).toEqual(
        expect.objectContaining({
          setup: expect.any(String),
          doctor: "node tools/doctor.mjs",
          migrate: expect.any(String),
          "smoke:auth": "node tools/smoke-auth.mjs",
        }),
      );
      expect(
        await readFile(join(destination, "fangabase.config.yaml"), "utf8"),
      ).toContain(config.product.name);
      if (config.architecture.backend === "next") {
        expect(rootFiles).not.toContain("composer.json");
        await expect(
          readFile(join(destination, "apps/server/composer.json"), "utf8"),
        ).rejects.toThrow();
        if (!config.payments.providers.includes("orange_money_ml"))
          await expect(
            readFile(
              join(destination, "packages/backend-next/src/orange-money-ml.ts"),
              "utf8",
            ),
          ).rejects.toThrow();
      } else {
        await expect(
          readFile(
            join(destination, "packages/backend-next/package.json"),
            "utf8",
          ),
        ).rejects.toThrow();
      }
      expect(
        result.generatedFiles.every(
          (file) => !file.path.includes("node_modules"),
        ),
      ).toBe(true);
    },
    30_000,
  );

  it("dry-run n'écrit rien et décrit packages, commandes, inclusions et exclusions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-plan-"));
    const destination = join(directory, "application");
    const plan = planProject(base, destination, sourceRoot);
    expect(plan.included).toContain("next_backend");
    expect(plan.excluded).toContain("laravel_backend");
    const result = await generateProject({
      config: base,
      destination,
      sourceRoot,
      dryRun: true,
    });
    expect(result.generatedFiles).toEqual([]);
    await expect(readdir(destination)).rejects.toThrow();
  });

  it("refuse une destination non vide et ne la modifie pas", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-protect-"));
    const destination = join(directory, "application");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(destination));
    await writeFile(join(destination, "keep.txt"), "user");
    await expect(
      generateProject({
        config: base,
        destination,
        sourceRoot,
        confirmed: true,
      }),
    ).rejects.toThrow("pas vide");
    expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("user");
  });

  it("régénère atomiquement et de façon déterministe avec --force confirmé", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-repeat-"));
    const destination = join(directory, "application");
    const first = await generateProject({
      config: base,
      destination,
      sourceRoot,
      confirmed: true,
    });
    const second = await generateProject({
      config: base,
      destination,
      sourceRoot,
      confirmed: true,
      force: true,
    });
    expect(second.generatedFiles).toEqual(first.generatedFiles);
  });

  it("refuse le dépôt source et les destinations internes au dépôt", () => {
    expect(() => planProject(base, sourceRoot, sourceRoot)).toThrow(
      "dangereuse",
    );
    expect(() =>
      planProject(base, join(sourceRoot, "generated"), sourceRoot),
    ).toThrow("dangereuse");
  });

  it("ne laisse aucune variable de fournisseur exclu", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-env-"));
    const destination = join(directory, "application");
    await generateProject({
      config: base,
      destination,
      sourceRoot,
      confirmed: true,
    });
    const env = await readFile(join(destination, ".env.example"), "utf8");
    expect(env).not.toMatch(/STRIPE_|FEDAPAY_|ORANGE_MONEY_|MONEROO_/);
  });
});
