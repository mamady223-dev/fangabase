import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { stringify } from "yaml";
import type { FangaBaseConfig } from "./config.js";
import { copyProductDocs } from "./product-docs.js";

export type GeneratedFile = { path: string; sha256: string };
export type Component = {
  id: string;
  files: string[];
  npm: string[];
  composer: string[];
  env: string[];
  migrations: string[];
  routes: string[];
  contracts: string[];
  tests: string[];
  documentation: string[];
  requires: string[];
  incompatible: string[];
};

export const componentRegistry: Record<string, Component> = {
  contracts: component("contracts", ["packages/contracts"]),
  next_backend: component(
    "next_backend",
    ["apps/web", "packages/backend-next", "packages/contracts"],
    ["next", "react", "postgres"],
  ),
  laravel_backend: component(
    "laravel_backend",
    ["apps/server"],
    [],
    ["laravel/framework"],
  ),
  next_frontend: component(
    "next_frontend",
    ["generated:next-frontend"],
    ["next", "react"],
  ),
  react_frontend: component(
    "react_frontend",
    ["generated:react-frontend"],
    ["vite", "react"],
  ),
  blade_frontend: component("blade_frontend", ["apps/server/resources"]),
  deploy_cloud: component("deploy_cloud", ["generated:deployment/cloud"]),
  deploy_vps: component("deploy_vps", ["generated:deployment/vps"]),
  deploy_shared: component("deploy_shared", ["generated:deployment/shared"]),
  deploy_hybrid: component("deploy_hybrid", ["generated:deployment/hybrid"]),
  payment_common: component(
    "payment_common",
    [],
    [],
    [],
    ["PAYMENT_DEFAULT_PROVIDER"],
  ),
  payment_stripe: payment("stripe", [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ]),
  payment_fedapay: payment("fedapay", [
    "FEDAPAY_SECRET_KEY",
    "FEDAPAY_WEBHOOK_SECRET",
  ]),
  payment_orange_money_ml: payment("orange_money_ml", [
    "ORANGE_MONEY_OAUTH_TOKEN_URL",
    "ORANGE_MONEY_API_BASE_URL",
    "ORANGE_MONEY_CLIENT_ID",
    "ORANGE_MONEY_CLIENT_SECRET",
    "ORANGE_MONEY_MERCHANT_ACCOUNT",
    "ORANGE_MONEY_MERCHANT_CODE",
    "ORANGE_MONEY_MERCHANT_KEY",
  ]),
  payment_moneroo: payment("moneroo", []),
};

function component(
  id: string,
  files: string[],
  npm: string[] = [],
  composer: string[] = [],
  env: string[] = [],
): Component {
  return {
    id,
    files,
    npm,
    composer,
    env,
    migrations: [],
    routes: [],
    contracts: [],
    tests: [],
    documentation: [],
    requires: [],
    incompatible: [],
  };
}

function payment(id: string, env: string[]): Component {
  return {
    ...component(`payment_${id}`, [], [], [], env),
    requires: ["payment_common"],
    documentation:
      id === "orange_money_ml" ? ["docs/payments/orange-money-mali.md"] : [],
  };
}

export type ProjectPlan = {
  destination: string;
  architecture: string;
  included: string[];
  excluded: string[];
  files: string[];
  packages: { npm: string[]; composer: string[] };
  commands: string[];
  variables: string[];
  warnings: string[];
};

const forbiddenParts = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  ".next",
  "coverage",
]);

export function planProject(
  config: FangaBaseConfig,
  destination: string,
  sourceRoot: string,
): ProjectPlan {
  const target = safeDestination(destination, sourceRoot);
  const included = resolveComponents(config);
  const excluded = Object.keys(componentRegistry).filter(
    (id) => !included.includes(id),
  );
  const files = included.flatMap((id) => componentRegistry[id]?.files ?? []);
  const npm = unique(
    included.flatMap((id) => componentRegistry[id]?.npm ?? []),
  );
  const composer = unique(
    included.flatMap((id) => componentRegistry[id]?.composer ?? []),
  );
  const laravel = included.includes("laravel_backend");
  const next = included.includes("next_backend");
  const frontend =
    included.includes("next_frontend") || included.includes("react_frontend");
  return {
    destination: target,
    architecture: config.architecture.target,
    included,
    excluded,
    files,
    packages: { npm, composer },
    commands: [
      ...(next || frontend ? ["pnpm install --frozen-lockfile"] : []),
      ...(laravel ? ["composer install --working-dir=apps/server"] : []),
      laravel
        ? "php apps/server/artisan migrate --force"
        : "pnpm --filter @fangabase/backend-next migrate",
      ...(next || frontend
        ? ["pnpm lint", "pnpm typecheck", "pnpm test", "pnpm build"]
        : []),
      ...(laravel ? ["composer --working-dir=apps/server test"] : []),
    ],
    variables: envLines(config).map((line) => line.split("=")[0] ?? line),
    warnings: [
      ...(config.payments.providers.includes("orange_money_ml")
        ? [
            "Orange Money Mali exige un contrat marchand et une UAT sandbox officielle.",
          ]
        : []),
      ...(config.payments.providers.includes("moneroo")
        ? [
            "Moneroo reste NEEDS_PROVIDER_CONTRACT et désactivé sans contrat vérifié.",
          ]
        : []),
    ],
  };
}

export async function generateProject(options: {
  config: FangaBaseConfig;
  destination: string;
  sourceRoot: string;
  force?: boolean;
  confirmed?: boolean;
  dryRun?: boolean;
  productDocs?: string;
}): Promise<ProjectPlan & { generatedFiles: GeneratedFile[] }> {
  const plan = planProject(
    options.config,
    options.destination,
    options.sourceRoot,
  );
  if (options.dryRun) return { ...plan, generatedFiles: [] };
  if (!options.confirmed)
    throw new Error("Confirmation explicite requise avant génération.");
  const destinationExists = await exists(plan.destination);
  if (
    destinationExists &&
    (await readdir(plan.destination)).length > 0 &&
    !options.force
  )
    throw new Error(
      "La destination n'est pas vide. Utilisez --force avec confirmation explicite.",
    );
  const parent = dirname(plan.destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".fangabase-generate-"));
  try {
    await materialize(options.config, options.sourceRoot, staging, plan);
    if (options.productDocs) {
      const copied = await copyProductDocs(options.productDocs, staging);
      await writeFile(
        join(staging, "docs/product/IMPLEMENTATION_HANDOFF.md"),
        `# Relais d'implémentation\n\nDocuments importés : ${copied.join(", ") || "aucun"}.\n\nCes documents décrivent le produit. Ils ne modifient ni les contrats ni le modèle métier automatiquement.\n`,
      );
    }
    const generatedFiles = await inventory(staging);
    await writeFile(
      join(staging, "generation-manifest.json"),
      `${JSON.stringify(
        {
          generatorVersion: "0.3.0-rc.1",
          choices: options.config,
          files: generatedFiles,
        },
        null,
        2,
      )}\n`,
    );
    await validateGenerated(staging, options.config, plan);
    if (destinationExists && (await readdir(plan.destination)).length > 0) {
      if (!options.force) throw new Error("La destination n'est pas vide.");
      const backup = `${plan.destination}.fangabase-backup`;
      if (await exists(backup))
        throw new Error("Un dossier de sauvegarde atomique existe déjà.");
      await rename(plan.destination, backup);
      try {
        await rename(staging, plan.destination);
        await rm(backup, { recursive: true });
      } catch (error) {
        if (!(await exists(plan.destination)))
          await rename(backup, plan.destination);
        throw error;
      }
    } else {
      if (destinationExists) await rm(plan.destination, { recursive: true });
      await rename(staging, plan.destination);
    }
    return { ...plan, generatedFiles: await inventory(plan.destination) };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

function resolveComponents(config: FangaBaseConfig): string[] {
  const ids = new Set<string>(["contracts"]);
  if (config.architecture.backend === "next") ids.add("next_backend");
  else ids.add("laravel_backend");
  if (config.architecture.backend === "laravel") {
    if (config.architecture.frontend === "next") ids.add("next_frontend");
    if (config.architecture.frontend === "react") ids.add("react_frontend");
    if (config.architecture.frontend === "blade") ids.add("blade_frontend");
  }
  ids.add(`deploy_${config.deployment?.family ?? family(config)}`);
  for (const provider of config.payments.providers) {
    if (
      ["stripe", "fedapay", "orange_money_ml", "moneroo"].includes(provider)
    ) {
      ids.add("payment_common");
      ids.add(`payment_${provider}`);
    }
  }
  return [...ids];
}

async function materialize(
  config: FangaBaseConfig,
  sourceRoot: string,
  staging: string,
  plan: ProjectPlan,
): Promise<void> {
  if (plan.included.includes("next_backend")) {
    await copyTree(join(sourceRoot, "apps/web"), join(staging, "apps/web"));
    await copyTree(
      join(sourceRoot, "packages/backend-next"),
      join(staging, "packages/backend-next"),
    );
    await copyTree(
      join(sourceRoot, "packages/contracts"),
      join(staging, "packages/contracts"),
    );
    await copyTree(
      join(sourceRoot, "packages/core"),
      join(staging, "packages/core"),
    );
    for (const file of ["tsconfig.json", "pnpm-lock.yaml"])
      await copyFile(sourceRoot, staging, file);
    await writeNextWorkspace(staging, config.product.slug);
    await filterNextProviders(staging, config.payments.providers);
  }
  if (plan.included.includes("laravel_backend")) {
    await copyTree(
      join(sourceRoot, "apps/server"),
      join(staging, "apps/server"),
    );
    await filterLaravelProviders(staging, config.payments.providers);
  }
  if (plan.included.includes("next_frontend"))
    await writeNextFrontend(staging, config);
  if (plan.included.includes("react_frontend"))
    await writeReactFrontend(staging, config);
  if (
    plan.included.includes("next_frontend") ||
    plan.included.includes("react_frontend")
  )
    await writeFrontendWorkspace(staging, config.product.slug);
  await writeDeployment(staging, config);
  await writeFile(join(staging, "fangabase.config.yaml"), stringify(config));
  await writeFile(
    join(staging, ".env.example"),
    `${envLines(config).join("\n")}\n`,
  );
  await writeDocs(staging, config, plan);
  await writeGeneratedTooling(staging, config);
}

async function writeGeneratedTooling(
  staging: string,
  config: FangaBaseConfig,
): Promise<void> {
  const packagePath = join(staging, "package.json");
  const laravel = config.architecture.backend === "laravel";
  const frontend = config.architecture.frontend !== "blade";
  const current = (await exists(packagePath))
    ? (JSON.parse(await readFile(packagePath, "utf8")) as {
        scripts?: Record<string, string>;
        [key: string]: unknown;
      })
    : {
        name: config.product.slug,
        private: true,
        packageManager: "pnpm@11.9.0",
      };
  current.scripts = {
    ...(current.scripts ?? {}),
    setup: laravel
      ? frontend
        ? "pnpm install --frozen-lockfile && composer install --working-dir=apps/server --no-interaction --prefer-dist"
        : "composer install --working-dir=apps/server --no-interaction --prefer-dist"
      : "pnpm install --frozen-lockfile",
    doctor: "node tools/doctor.mjs",
    migrate: laravel
      ? "php apps/server/artisan migrate --force"
      : "pnpm --filter @fangabase/backend-next migrate",
    "smoke:auth": "node tools/smoke-auth.mjs",
  };
  if (laravel && !frontend) {
    current.scripts.dev = "composer --working-dir=apps/server run dev";
    current.scripts.test = "composer --working-dir=apps/server test";
    current.scripts.build =
      "composer --working-dir=apps/server validate --strict";
  } else if (laravel) {
    current.scripts["dev:server"] =
      "composer --working-dir=apps/server run dev";
    current.scripts["dev:frontend"] = "pnpm --dir frontend dev";
  }
  await writeFile(packagePath, `${JSON.stringify(current, null, 2)}\n`);
  await mkdir(join(staging, "tools"), { recursive: true });
  await writeFile(join(staging, "tools/doctor.mjs"), generatedDoctor(config));
  await writeFile(
    join(staging, "tools/smoke-auth.mjs"),
    generatedAuthSmoke(config),
  );
}

function generatedDoctor(config: FangaBaseConfig): string {
  const tools =
    config.architecture.backend === "laravel"
      ? ["node", "pnpm", "php", "composer"]
      : ["node", "pnpm"];
  return `import{spawnSync}from"node:child_process";import{readFileSync,existsSync}from"node:fs";const checks=[];for(const name of ${JSON.stringify(tools)}){const command=name==="node"?process.execPath:name;const result=spawnSync(command,["--version"],{encoding:"utf8",shell:process.platform==="win32"});checks.push({name,status:result.status===0?"PASS":"FAIL"});}try{const config=readFileSync("fangabase.config.yaml","utf8");if(!config.includes("version: 1"))throw new Error();checks.push({name:"configuration",status:"PASS"});}catch{checks.push({name:"configuration",status:"FAIL"});}checks.push({name:"environment",status:existsSync(".env")?"PASS":"WARNING",explanation:".env reste local et hors Git"});const status=checks.some(c=>c.status==="FAIL")?"FAIL":checks.some(c=>c.status==="WARNING")?"WARNING":"PASS";console.log(JSON.stringify({status,checks},null,2));if(status==="FAIL")process.exitCode=1;\n`;
}

function generatedAuthSmoke(config: FangaBaseConfig): string {
  return `const production=(process.env.NODE_ENV??"").toLowerCase()==="production"||(process.env.APP_ENV??"").toLowerCase()==="production";if(production)throw new Error("smoke:auth refuse de s'exécuter en production");const origin=(process.env.FANGABASE_SMOKE_URL??"http://127.0.0.1:${config.architecture.backend === "laravel" ? "8000/api" : "3000/api"}").replace(/\\/$/,"");const email=\`smoke-\${Date.now()}-\${crypto.randomUUID()}@example.invalid\`;const password=\`Smoke!\${crypto.randomUUID()}aA1\`;let cookies={};async function call(path,method="GET",body){const headers={accept:"application/json"};if(body){headers["content-type"]="application/json";headers["x-fangabase-csrf"]=cookies.fangabase_csrf??"";}if(Object.keys(cookies).length)headers.cookie=Object.entries(cookies).map(([k,v])=>\`\${k}=\${v}\`).join("; ");const response=await fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});for(const value of response.headers.getSetCookie?.()??[]){const [pair]=value.split(";");const [key,...rest]=pair.split("=");cookies[key]=rest.join("=");}const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(\`\${method} \${path}: HTTP \${response.status} \${data?.error?.code??""}\`);return data;}await call("/health");const registered=await call("/auth/register","POST",{name:"Smoke Auth",email,password});const token=registered.verificationToken??registered.verification_token;if(!token)throw new Error("Jeton de vérification local absent; activez uniquement le fournisseur de test local");await call("/auth/email/verification/confirm","POST",{token});await call("/auth/login","POST",{email,password});await call("/auth/me");await call("/auth/refresh","POST",{});await call("/auth/logout","POST",{});const denied=await fetch(origin+"/auth/me",{headers:{cookie:Object.entries(cookies).map(([k,v])=>\`\${k}=\${v}\`).join("; ")}});if(denied.status!==401)throw new Error("La session reste utilisable après logout");console.log(JSON.stringify({status:"PASS",backend:${JSON.stringify(config.architecture.backend)},email:"utilisateur de test unique supprimable"}));\n`;
}

async function filterLaravelProviders(
  root: string,
  providers: readonly string[],
): Promise<void> {
  const appRoot = join(root, "apps/server");
  const providerPath = join(appRoot, "app/Providers/AppServiceProvider.php");
  let provider = await readFile(providerPath, "utf8");
  const routesPath = join(appRoot, "routes/api.php");
  let routes = await readFile(routesPath, "utf8");
  if (!providers.includes("stripe")) {
    await rm(
      join(appRoot, "app/Infrastructure/Payments/StripePaymentProvider.php"),
    );
    await rm(
      join(appRoot, "app/Infrastructure/Payments/StripeWebhookVerifier.php"),
    );
    provider = provider
      .replace(
        "use FangaBase\\Infrastructure\\Payments\\StripePaymentProvider;\n",
        "",
      )
      .replace(
        "use FangaBase\\Infrastructure\\Payments\\StripeWebhookVerifier;\n",
        "",
      )
      .replace(
        /                new StripePaymentProvider\([^\n]+\),\r?\n/,
        "                $blocked('stripe', ProviderDescriptor::DISABLED),\n",
      )
      .replace(
        /        \$this->app->bind\(WebhookVerifier::class,[^\n]+\);\r?\n/,
        "",
      );
    routes = routes.replace(
      "Route::post('/webhooks/stripe', [PaymentController::class, 'stripeWebhook']);\n",
      "",
    );
    const testPath = join(appRoot, "tests/Unit/PaymentProviderTest.php");
    await writeFile(
      testPath,
      (await readFile(testPath, "utf8"))
        .replace(
          "use FangaBase\\Infrastructure\\Payments\\StripePaymentProvider;\n",
          "",
        )
        .replace(
          /    public function test_stripe_uses_form_encoding_idempotency_and_integer_server_amount\(\): void\r?\n    \{[\s\S]*?^    \}\r?\n\r?\n/m,
          "",
        ),
    );
    const deliveryTestPath = join(
      appRoot,
      "tests/Feature/PaymentDeliveryTest.php",
    );
    await writeFile(
      deliveryTestPath,
      (await readFile(deliveryTestPath, "utf8"))
        .replace(
          "use FangaBase\\Infrastructure\\Payments\\StripeWebhookVerifier;\n",
          "",
        )
        .replace(
          /    public function test_stripe_signature_raw_body_timestamp_and_tampering\(\): void\r?\n    \{[\s\S]*?^    \}\r?\n\r?\n/m,
          "",
        ),
    );
  }
  if (!providers.includes("fedapay")) {
    await rm(
      join(appRoot, "app/Infrastructure/Payments/FedaPayPaymentProvider.php"),
    );
    provider = provider
      .replace(
        "use FangaBase\\Infrastructure\\Payments\\FedaPayPaymentProvider;\n",
        "",
      )
      .replace(
        /                new FedaPayPaymentProvider\([^\n]+\),\r?\n/,
        "                $blocked('fedapay', ProviderDescriptor::DISABLED),\n",
      );
  }
  if (!providers.includes("orange_money_ml")) {
    for (const path of [
      "app/Infrastructure/Payments/OrangeMoneyMlHttpGateway.php",
      "app/Infrastructure/Payments/OrangeMoneyMlPaymentProvider.php",
      "app/Infrastructure/Payments/OrangeMoneyMlSimulator.php",
      "app/Domain/Payments/OrangeMoneyMlGateway.php",
    ])
      await rm(join(appRoot, path));
    await rm(join(appRoot, "tests/Feature/OrangeMoneyMlProviderTest.php"));
    provider = provider
      .replace(
        /use FangaBase\\Infrastructure\\Payments\\OrangeMoneyMl[^\n]+\r?\n/g,
        "",
      )
      .replace(
        /            \$orangeConfiguration =[\s\S]*?                : new OrangeMoneyMlHttpGateway\(\$http\);\r?\n/,
        "",
      )
      .replace(
        "                new OrangeMoneyMlPaymentProvider($orangeGateway, $orangeConfiguration),\n",
        "                $blocked('orange_money_ml', ProviderDescriptor::DISABLED),\n",
      );
    routes = routes
      .replace(
        "Route::post('/webhooks/orange-money-ml', [PaymentController::class, 'orangeMoneyMlWebhook'])->middleware('throttle:60,1');\n",
        "",
      )
      .replace(
        "Route::get('/payments/orange-money-ml/return', [PaymentController::class, 'orangeMoneyMlReturn']);\n",
        "",
      )
      .replace(
        "Route::get('/payments/orange-money-ml/cancel', [PaymentController::class, 'orangeMoneyMlCancel']);\n",
        "",
      );
  }
  if (!providers.includes("stripe"))
    provider = provider.replace(
      "use FangaBase\\Domain\\Payments\\WebhookVerifier;\n",
      "",
    );
  await writeFile(providerPath, provider);
  await writeFile(routesPath, routes);
}

async function filterNextProviders(
  root: string,
  providers: readonly string[],
): Promise<void> {
  if (providers.includes("orange_money_ml")) return;
  const source = join(root, "packages/backend-next/src");
  await rm(join(source, "orange-money-ml.ts"));
  await rm(join(source, "orange-money-ml.test.ts"));
  const indexPath = join(source, "index.ts");
  await writeFile(
    indexPath,
    (await readFile(indexPath, "utf8")).replace(
      'export * from "./orange-money-ml.js";\n',
      "",
    ),
  );
  const paymentsPath = join(source, "payments.ts");
  const payments = (await readFile(paymentsPath, "utf8"))
    .replace(
      'import type { OrangeMoneyMlProvider } from "./orange-money-ml.js";',
      `export interface OrangeMoneyMlProvider {
  checkout(input: { orderId: string; amountMinor: number; currency: "XOF" }): Promise<{ status: PaymentRecord["status"]; reference: string; paymentUrl: string; encryptedTokens: Record<string, string> }>;
  status(reference: string, metadata: Record<string, unknown>): Promise<{ status: PaymentRecord["status"]; amountMinor: number | null; currency: string | null }>;
}`,
    )
    .replace('  orange_money_ml: "IMPLEMENTED_NEEDS_SANDBOX_UAT",\n', "");
  await writeFile(paymentsPath, payments);
  const routerPath = join(source, "router.ts");
  await writeFile(
    routerPath,
    (await readFile(routerPath, "utf8"))
      .replace(
        'import type { OrangeMoneyMlProvider } from "./orange-money-ml.js";',
        'import type { OrangeMoneyMlProvider } from "./payments.js";',
      )
      .replace(
        "    try {\n",
        '    try {\n      if (request.path.includes("orange-money-ml")) throw new BackendProblem("NOT_FOUND", 404);\n',
      ),
  );
  const webBackendPath = join(root, "apps/web/src/server/backend.ts");
  const webBackend = (await readFile(webBackendPath, "utf8"))
    .replace(/  OrangeMoneyMlHttpGateway,\r?\n/, "")
    .replace(/  OrangeMoneyMlProvider,\r?\n/, "")
    .replace(/  OrangeMoneyMlSimulator,\r?\n/, "")
    .replace(/  orangeMoneyMlConfiguration,\r?\n/, "")
    .replace(
      /  const orangeConfiguration = orangeMoneyMlConfiguration\(process\.env\);\r?\n  const orangeGateway =[\s\S]*?new OrangeMoneyMlHttpGateway\(\);\r?\n/,
      "",
    )
    .replace(
      /    orangeMoneyMlProvider: new OrangeMoneyMlProvider\([\s\S]*?    \),\r?\n/,
      "",
    );
  await writeFile(webBackendPath, webBackend);
}

async function writeNextWorkspace(
  staging: string,
  slug: string,
): Promise<void> {
  await writeFile(
    join(staging, "pnpm-workspace.yaml"),
    `packages:
  - apps/*
  - packages/*

overrides:
  brace-expansion: 5.0.9
  js-yaml: 4.3.1
  minimatch@3.1.5: 10.2.5
  nanoid: 3.3.17
  postcss: 8.5.18
  sharp: 0.35.0

allowBuilds:
  esbuild: true
  sharp: false
  unrs-resolver: false
`,
  );
  await writeFile(
    join(staging, "package.json"),
    `${JSON.stringify(
      {
        name: slug,
        private: true,
        packageManager: "pnpm@11.9.0",
        scripts: {
          dev: "pnpm --filter @fangabase/web dev",
          lint: "pnpm -r --if-present lint",
          typecheck: "pnpm -r --if-present typecheck",
          test: "pnpm -r --if-present test",
          build: "pnpm -r --if-present build",
          migrate: "pnpm --filter @fangabase/backend-next migrate",
        },
        devDependencies: {
          "@types/node": "22.15.32",
          prettier: "3.6.2",
          typescript: "5.8.3",
          vitest: "3.2.6",
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function writeNextFrontend(
  staging: string,
  config: FangaBaseConfig,
): Promise<void> {
  const root = join(staging, "frontend");
  await mkdir(join(root, "app"), { recursive: true });
  await mkdir(join(root, "test"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: `${config.product.slug}-frontend`,
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          lint: "tsc --noEmit",
          typecheck: "tsc --noEmit",
          test: "node --test",
        },
        dependencies: {
          next: "16.2.11",
          react: "19.2.7",
          "react-dom": "19.2.7",
        },
        devDependencies: {
          "@types/node": "22.15.32",
          "@types/react": "19.1.8",
          "@types/react-dom": "19.1.6",
          typescript: "5.8.3",
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(root, "app/layout.tsx"),
    'import type { ReactNode } from "react";export default function Layout({children}:{children:ReactNode}){return <html><body>{children}</body></html>}\n',
  );
  await writeFile(
    join(root, "app/page.tsx"),
    "export default function Page(){return <main><h1>Application technique</h1><p>Configurez NEXT_PUBLIC_API_ORIGIN.</p></main>}\n",
  );
  await writeFile(
    join(root, "next-env.d.ts"),
    '/// <reference types="next" />\n',
  );
  await writeFile(
    join(root, "next.config.mjs"),
    "export default { turbopack: { root: import.meta.dirname } };\n",
  );
  await writeFile(
    join(root, "test/smoke.test.mjs"),
    'import test from "node:test";import assert from "node:assert/strict";import{readFile}from"node:fs/promises";test("frontend hybride reste un client API sans backend embarqué",async()=>{const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");assert.doesNotMatch(page,/@fangabase\\/backend-next/);});\n',
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES2024",
          lib: ["dom", "dom.iterable", "es2024"],
          jsx: "preserve",
          module: "esnext",
          moduleResolution: "bundler",
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(root, ".env.example"),
    "NEXT_PUBLIC_API_ORIGIN=https://api.example.invalid/api\n",
  );
}

async function writeReactFrontend(
  staging: string,
  config: FangaBaseConfig,
): Promise<void> {
  const root = join(staging, "frontend");
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "test"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: `${config.product.slug}-frontend`,
        private: true,
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc && vite build",
          lint: "tsc --noEmit",
          typecheck: "tsc --noEmit",
          test: "node --test",
        },
        dependencies: { react: "19.2.7", "react-dom": "19.2.7" },
        devDependencies: {
          "@vitejs/plugin-react": "5.0.4",
          "@types/react": "19.1.8",
          "@types/react-dom": "19.1.6",
          typescript: "5.8.3",
          vite: "7.0.0",
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(root, "index.html"),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
  );
  await writeFile(
    join(root, "src/main.tsx"),
    'import React from "react";import{createRoot}from"react-dom/client";createRoot(document.getElementById("root")!).render(<main><h1>Application technique</h1><p>Configurez VITE_API_ORIGIN.</p></main>);\n',
  );
  await writeFile(
    join(root, "test/smoke.test.mjs"),
    'import test from "node:test";import assert from "node:assert/strict";import{readFile}from"node:fs/promises";test("frontend React reste un client API sans backend embarqué",async()=>{const page=await readFile(new URL("../src/main.tsx",import.meta.url),"utf8");assert.doesNotMatch(page,/@fangabase\\/backend-next/);});\n',
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES2024",
          lib: ["dom", "dom.iterable", "es2024"],
          jsx: "react-jsx",
          module: "esnext",
          moduleResolution: "bundler",
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(root, ".env.example"),
    "VITE_API_ORIGIN=https://api.example.invalid/api\n",
  );
}

async function writeFrontendWorkspace(
  staging: string,
  slug: string,
): Promise<void> {
  await writeFile(
    join(staging, "pnpm-workspace.yaml"),
    "packages:\n  - frontend\n",
  );
  await writeFile(
    join(staging, "package.json"),
    `${JSON.stringify(
      {
        name: slug,
        private: true,
        packageManager: "pnpm@11.9.0",
        scripts: {
          dev: "pnpm --dir frontend dev",
          lint: "pnpm --dir frontend lint",
          typecheck: "pnpm --dir frontend typecheck",
          test: "pnpm --dir frontend test",
          build: "pnpm --dir frontend build",
        },
      },
      null,
      2,
    )}\n`,
  );
  const result = spawnSync(
    "pnpm",
    ["install", "--lockfile-only", "--ignore-scripts", "--offline"],
    {
      cwd: staging,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Impossible de calculer le lockfile frontend: ${result.stderr.trim()}`,
    );
}

async function writeDeployment(
  staging: string,
  config: FangaBaseConfig,
): Promise<void> {
  const kind = config.deployment?.family ?? family(config);
  const root = join(staging, "deployment");
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "README.md"),
    `# Déploiement ${kind}\n\nExécutez les migrations explicitement avant le démarrage. Injectez les secrets au runtime et vérifiez health/readiness.\n`,
  );
  if (kind === "cloud")
    await writeFile(join(root, "vercel.json"), '{"framework":"nextjs"}\n');
  if (kind === "shared")
    await writeFile(
      join(root, "cron.example"),
      "* * * * * php /path/to/artisan schedule:run\n",
    );
  if (kind === "vps" || kind === "hybrid") {
    await mkdir(join(root, "systemd"), { recursive: true });
    await mkdir(join(root, "nginx"), { recursive: true });
    await writeFile(
      join(root, "systemd/fangabase.service"),
      "[Service]\nNoNewPrivileges=true\n",
    );
    await writeFile(
      join(root, "nginx/fangabase.conf.example"),
      "server { listen 443 ssl; server_name example.invalid; }\n",
    );
  }
}

function envLines(config: FangaBaseConfig): string[] {
  const lines = [
    `APP_NAME=${config.product.name}`,
    "APP_ENV=local",
    `DATABASE_ENGINE=${config.database.engine}`,
    "DATABASE_URL=",
    `MAIL_PROVIDER=${config.email.provider}`,
  ];
  if (config.architecture.backend === "laravel")
    lines.push("APP_KEY=", "SESSION_SECURE_COOKIE=true");
  if (config.architecture.target === "hybrid")
    lines.push(
      "FRONTEND_ORIGIN=https://app.example.invalid",
      "CORS_ALLOWED_ORIGINS=https://app.example.invalid",
    );
  if (config.payments.providers.includes("stripe"))
    lines.push("STRIPE_SECRET_KEY=", "STRIPE_WEBHOOK_SECRET=");
  if (config.payments.providers.includes("fedapay"))
    lines.push("FEDAPAY_SECRET_KEY=", "FEDAPAY_WEBHOOK_SECRET=");
  if (config.payments.providers.includes("orange_money_ml")) {
    lines.push(
      "ORANGE_MONEY_ENABLED=false",
      "ORANGE_MONEY_ENVIRONMENT=sandbox",
      "ORANGE_MONEY_COUNTRY=ML",
      "ORANGE_MONEY_CURRENCY=XOF",
      "ORANGE_MONEY_OAUTH_TOKEN_URL=",
      "ORANGE_MONEY_API_BASE_URL=",
      "ORANGE_MONEY_CLIENT_ID=",
      "ORANGE_MONEY_CLIENT_SECRET=",
      "ORANGE_MONEY_MERCHANT_ACCOUNT=",
      "ORANGE_MONEY_MERCHANT_CODE=",
      "ORANGE_MONEY_MERCHANT_KEY=",
    );
  }
  if (config.payments.providers.includes("moneroo"))
    lines.push("MONEROO_ENABLED=false");
  return lines;
}

async function writeDocs(
  staging: string,
  config: FangaBaseConfig,
  plan: ProjectPlan,
): Promise<void> {
  await mkdir(join(staging, "docs"), { recursive: true });
  const install = plan.commands
    .filter((command) => command.includes("install"))
    .join("\n");
  await writeFile(
    join(staging, "README.md"),
    `# ${config.product.name}\n\n${config.product.description}\n\nProjet headless généré par FangaBase. Aucun métier ni design officiel n'est imposé.\n\n## Installation\n\n\`\`\`sh\n${install}\n\`\`\`\n`,
  );
  await writeFile(
    join(staging, "GETTING_STARTED.md"),
    `# Démarrage\n\nComplétez \`.env\` hors Git, installez, migrez, testez puis démarrez selon les commandes du manifeste de génération.\n`,
  );
  await writeFile(
    join(staging, "ARCHITECTURE.md"),
    `# Architecture\n\nProfil : \`${config.architecture.target}\`.\nBackend d'autorité : \`${config.architecture.backend}\`.\nFrontend : \`${config.architecture.frontend}\`.\nBase : \`${config.database.engine}\`.\n`,
  );
  await writeFile(
    join(staging, "NEXT_STEPS.md"),
    `# Prochaines étapes\n\n1. Copiez \`.env.example\` vers \`.env\` sans le commiter.\n2. Lancez \`pnpm setup\`, \`pnpm doctor\` puis \`pnpm migrate\`.\n3. Démarrez les processus indiqués dans le README.\n4. Lancez \`pnpm smoke:auth\` en environnement local.\n5. Intégrez votre métier et votre design explicitement choisi.\n`,
  );
  await writeFile(
    join(staging, "CONFIGURATION_SERVICES.md"),
    serviceDocumentation(config),
  );
}

function serviceDocumentation(config: FangaBaseConfig): string {
  const sections = [
    `# Configuration des services sélectionnés\n\nAucun secret ne doit être commité. Les callbacks utilisent l'origine réellement déployée.`,
    serviceSection(
      "Base de données",
      config.database.provider,
      ["DATABASE_URL"],
      "Connexion et migrations persistantes.",
    ),
    serviceSection(
      "E-mail",
      config.email.provider,
      ["MAIL_PROVIDER"],
      "Envoi transactionnel via l'Outbox.",
    ),
    serviceSection(
      "Stockage",
      config.storage.provider,
      [],
      "Stockage privé des fichiers.",
    ),
  ];
  for (const provider of config.payments.providers) {
    const variables =
      provider === "stripe"
        ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
        : provider === "fedapay"
          ? ["FEDAPAY_SECRET_KEY", "FEDAPAY_WEBHOOK_SECRET"]
          : provider === "orange_money_ml"
            ? [
                "ORANGE_MONEY_CLIENT_ID",
                "ORANGE_MONEY_CLIENT_SECRET",
                "ORANGE_MONEY_API_BASE_URL",
              ]
            : ["MONEROO_ENABLED"];
    const status =
      provider === "moneroo"
        ? "NEEDS_PROVIDER_CONTRACT; sandbox non validée."
        : provider === "orange_money_ml"
          ? "Contrat marchand et UAT sandbox officielle requis."
          : "Adaptateur inclus; accès marchand et UAT requis.";
    sections.push(
      serviceSection(
        `Paiement ${provider}`,
        status,
        variables,
        "Checkout, vérification serveur et webhooks signés lorsqu'ils sont contractuellement disponibles.",
      ),
    );
  }
  return `${sections.join("\n\n")}\n`;
}

function serviceSection(
  title: string,
  status: string,
  variables: string[],
  purpose: string,
): string {
  return `## ${title}\n\n- But : ${purpose}\n- Statut : ${status}\n- Variables : ${variables.length ? variables.map((item) => `\`${item}\``).join(", ") : "aucune variable distante"}\n- Source et endpoints : À confirmer dans le contrat officiel du fournisseur.\n- Absence de configuration : le service distant reste désactivé ou le doctor signale un avertissement.\n- Vérification : \`pnpm doctor\`, puis UAT sandbox avant production.\n- Sécurité : secrets au runtime, erreurs fournisseur nettoyées, callbacks HTTPS vérifiés.`;
}

async function validateGenerated(
  root: string,
  config: FangaBaseConfig,
  plan: ProjectPlan,
): Promise<void> {
  const files = (await inventory(root)).map((file) => file.path);
  for (const path of files) {
    const parts = path.split("/");
    if (parts.some((part) => forbiddenParts.has(part)))
      throw new Error(`Fichier interdit généré: ${path}`);
  }
  if (
    config.architecture.backend === "next" &&
    files.some((path) => path.startsWith("apps/server/"))
  )
    throw new Error("Laravel a été inclus dans un profil Next.js autonome.");
  if (
    config.architecture.backend === "laravel" &&
    files.some((path) => path.startsWith("packages/backend-next/"))
  )
    throw new Error("Le backend Next.js a été inclus dans un profil Laravel.");
  const env = await readFile(join(root, ".env.example"), "utf8");
  const providerPrefixes: Record<string, string> = {
    stripe: "STRIPE_",
    fedapay: "FEDAPAY_",
    orange_money_ml: "ORANGE_MONEY_",
    moneroo: "MONEROO_",
  };
  for (const [provider, prefix] of Object.entries(providerPrefixes)) {
    if (
      !config.payments.providers.includes(provider as never) &&
      env.includes(prefix)
    )
      throw new Error(
        `Variables ${prefix} présentes pour un fournisseur exclu.`,
      );
  }
  const forbiddenProviderFiles: Record<string, RegExp> = {
    stripe: /Stripe(?:PaymentProvider|WebhookVerifier)\.php$/,
    fedapay: /FedaPayPaymentProvider\.php$/,
    orange_money_ml: /OrangeMoneyMl|orange-money-ml/,
  };
  for (const [provider, pattern] of Object.entries(forbiddenProviderFiles)) {
    if (
      !config.payments.providers.includes(provider as never) &&
      files.some((path) => pattern.test(path))
    )
      throw new Error(`Adaptateur ${provider} présent alors qu'il est exclu.`);
  }
  if (!plan.included.length)
    throw new Error("Le graphe de composants est vide.");
}

async function copyTree(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    filter: (path) =>
      !path
        .split(/[\\/]/)
        .some(
          (part) =>
            forbiddenParts.has(part) ||
            part === ".env" ||
            part === "test-results" ||
            part.endsWith(".tsbuildinfo"),
        ),
  });
}

async function copyFile(
  sourceRoot: string,
  destinationRoot: string,
  path: string,
): Promise<void> {
  await mkdir(dirname(join(destinationRoot, path)), { recursive: true });
  await cp(join(sourceRoot, path), join(destinationRoot, path));
}

async function inventory(root: string): Promise<GeneratedFile[]> {
  const output: GeneratedFile[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        const content = await readFile(path);
        output.push({
          path: relative(root, path).split(sep).join("/"),
          sha256: createHash("sha256").update(content).digest("hex"),
        });
      }
    }
  }
  await walk(root);
  return output.sort((a, b) => a.path.localeCompare(b.path));
}

function safeDestination(destination: string, sourceRoot: string): string {
  const target = resolve(destination);
  const source = resolve(sourceRoot);
  const parsedRoot = resolve(target, sep);
  if (
    !destination.trim() ||
    target === parsedRoot ||
    target === source ||
    target.startsWith(`${source}${sep}`)
  )
    throw new Error("Destination dangereuse ou située dans le dépôt source.");
  if (!isAbsolute(target))
    throw new Error("La destination doit être résolue en chemin absolu.");
  return target;
}

function family(config: FangaBaseConfig): string {
  if (config.architecture.target === "cloud_vercel") return "cloud";
  if (config.architecture.target === "shared_laravel") return "shared";
  if (config.architecture.target === "hybrid") return "hybrid";
  return "vps";
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return (await stat(path)).isDirectory() || (await stat(path)).isFile();
  } catch {
    return false;
  }
}
