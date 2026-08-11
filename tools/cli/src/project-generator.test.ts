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
    "vps-laravel-react-separated",
    {
      architecture: {
        target: "vps_laravel",
        frontend: "react",
        backend: "laravel",
        ui: "react",
        integration: "api",
      },
      deployment: {
        family: "vps",
        docker: false,
        database: "postgres",
        vps_variant: "laravel_api_react",
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
    "vps-laravel-inertia-react",
    {
      architecture: {
        target: "vps_laravel",
        frontend: "react",
        backend: "laravel",
        ui: "inertia_react",
        integration: "inertia",
      },
      deployment: {
        family: "vps",
        docker: false,
        database: "postgres",
        vps_variant: "laravel_inertia_react",
      },
      database: { engine: "postgres", provider: "postgres" },
    },
  ],
  [
    "shared-laravel-inertia-react",
    {
      architecture: {
        target: "shared_laravel",
        frontend: "react",
        backend: "laravel",
        ui: "inertia_react",
        integration: "inertia",
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
        if (config.architecture.integration === "inertia") {
          expect(rootFiles).toEqual(
            expect.arrayContaining([
              "app",
              "bootstrap",
              "config",
              "database",
              "public",
              "resources",
              "routes",
              "storage",
              "tests",
              "artisan",
              "composer.json",
              "vite.config.ts",
            ]),
          );
          expect(rootFiles).not.toContain("apps");
          expect(rootFiles).not.toContain("frontend");
          expect(await readdir(join(destination, "resources/js"))).toEqual(
            expect.arrayContaining([
              "components",
              "hooks",
              "layouts",
              "lib",
              "pages",
              "types",
              "app.tsx",
            ]),
          );
          expect(
            await readFile(join(destination, "resources/js/app.tsx"), "utf8"),
          ).toContain("createInertiaApp");
          expect(
            await readFile(join(destination, "composer.json"), "utf8"),
          ).toContain("inertiajs/inertia-laravel");
          expect(
            await readFile(join(destination, "ARCHITECTURE.md"), "utf8"),
          ).toContain("une seule application");
          const environment = await readFile(
            join(destination, ".env.example"),
            "utf8",
          );
          expect(environment).not.toMatch(
            /NEXT_PUBLIC_|CORS_ALLOWED_ORIGINS|FRONTEND_ORIGIN/,
          );
          expect(environment.match(/^APP_NAME=/gm)).toHaveLength(1);
          expect(environment).not.toMatch(
            /^VITE_.*(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY)/im,
          );
          const smoke = await readFile(
            join(destination, "tools/smoke-auth.mjs"),
            "utf8",
          );
          expect(smoke).toContain("x-csrf-token");
          expect(smoke).toContain("smoke-cleanup.php");
          await expect(
            readFile(join(destination, "storage/logs/laravel.log"), "utf8"),
          ).rejects.toThrow();
          await expect(
            readFile(join(destination, "database/database.sqlite"), "utf8"),
          ).rejects.toThrow();
        }
      }
      expect(
        result.generatedFiles.every(
          (file) => !file.path.includes("node_modules"),
        ),
      ).toBe(true);
    },
    30_000,
  );

  it("génère le profil Inertia dans un chemin Windows avec espaces et accents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-chemin-"));
    const destination = join(directory, "Projet étudiant intégré");
    const overrides = profiles.find(
      ([name]) => name === "vps-laravel-inertia-react",
    )?.[1];
    const config = configSchema.parse({ ...base, ...overrides });
    await generateProject({ config, destination, sourceRoot, confirmed: true });
    expect(
      await readFile(join(destination, "resources/js/app.tsx"), "utf8"),
    ).toContain("createInertiaApp");
  });

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

  it.each([
    ["headless", "README.md"],
    ["stitch", "STITCH_WORKFLOW.md"],
    ["banani", "BANANI_WORKFLOW.md"],
    ["provided_mockups", "PROVIDED_DESIGN_WORKFLOW.md"],
    ["custom_frontend", "PROVIDED_DESIGN_WORKFLOW.md"],
  ] as const)(
    "copie uniquement le workflow design %s",
    async (source, expected) => {
      const directory = await mkdtemp(join(tmpdir(), "fangabase-design-"));
      const destination = join(directory, "application");
      await generateProject({
        config: configSchema.parse({ ...base, design: { source } }),
        destination,
        sourceRoot,
        confirmed: true,
      });
      expect(await readdir(join(destination, "docs/design"))).toEqual(
        source === "stitch" || source === "banani"
          ? ["ACTIVATION.md", expected]
          : [expected],
      );
      expect(
        await readFile(
          join(destination, "docs/FANGABASE_FINAL_REPORT.md"),
          "utf8",
        ),
      ).toContain(`- Design : ${source}`);
    },
  );

  it("importe les documents produit et crée un relais explicite", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-handoff-"));
    const productDocs = join(directory, "product-docs");
    const destination = join(directory, "application");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(productDocs));
    await writeFile(
      join(productDocs, "BACKLOG_MVP.md"),
      "# Backlog\n\nDécision : GO_CONDITIONNEL\n",
    );
    await writeFile(join(productDocs, "PRD.md"), "# PRD\n");
    await generateProject({
      config: base,
      destination,
      sourceRoot,
      productDocs,
      confirmed: true,
    });
    expect(await readdir(join(destination, "docs/product"))).toEqual([
      "BACKLOG_MVP.md",
      "IMPLEMENTATION_HANDOFF.md",
      "PRD.md",
    ]);
    expect(
      await readFile(
        join(destination, "docs/product/IMPLEMENTATION_HANDOFF.md"),
        "utf8",
      ),
    ).toContain("ne créent automatiquement ni métier, ni entité, ni table");
  });
});
