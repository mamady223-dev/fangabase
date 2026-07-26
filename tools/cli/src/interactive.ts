import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { stringify } from "yaml";
import type { FangaBaseConfig } from "./config.js";

export async function promptConfigYaml(): Promise<string> {
  const io = stdin.isTTY
    ? createInterface({ input: stdin, output: stdout })
    : null;
  const answers = io ? null : (await readAllStdin()).split(/\r?\n/);
  let answerIndex = 0;
  const ask = async (prompt: string): Promise<string> => {
    if (io) return io.question(prompt);
    stdout.write(prompt);
    return answers?.[answerIndex++] ?? "";
  };
  try {
    const name =
      (await ask("Nom du produit [FangaBase Demo]: ")).trim() ||
      "FangaBase Demo";
    const description = (await ask("Description courte: ")).trim();
    const typeChoice =
      (
        await ask(
          "Type 1=SaaS 2=Marketplace 3=Services 4=Commerce 5=Interne [1]: ",
        )
      ).trim() || "1";
    const architectureChoice =
      (
        await ask(
          "Deploiement 1=Cloud/Vercel 2=VPS 3=Mutualise 4=Hybride [1]: ",
        )
      ).trim() || "1";
    const technicalChoice =
      architectureChoice === "2"
        ? (
            await ask(
              "Architecture VPS 1=Next.js autonome 2=Laravel/Blade 3=Laravel API+Next.js 4=Laravel API+React [1]: ",
            )
          ).trim() || "1"
        : architectureChoice === "4"
          ? (
              await ask(
                "Frontend hybride 1=Next.js 2=React (backend Laravel) [1]: ",
              )
            ).trim() || "1"
          : "1";
    const databaseChoice =
      (
        await ask(
          architectureChoice === "1"
            ? "Base 1=Neon PostgreSQL 2=Supabase PostgreSQL 3=PostgreSQL [1]: "
            : "Base 1=PostgreSQL 2=MySQL [1]: ",
        )
      ).trim() || "1";
    const emailChoice =
      (
        await ask("E-mail 1=Journal local 2=SMTP 3=Resend 4=Brevo [1]: ")
      ).trim() || "1";
    const paymentChoice =
      (
        await ask(
          "Paiement 1=Aucun 2=Stripe 3=FedaPay 4=Orange Money Mali 5=Moneroo (contrat requis) [1]: ",
        )
      ).trim() || "1";
    const billingChoice =
      (
        await ask(
          "Facturation 1=Aucune 2=Abonnement 3=Credits 4=Credits+abonnement 5=Paiement unique [1]: ",
        )
      ).trim() || "1";
    const designChoice =
      (
        await ask(
          "Frontend 1=Headless 2=Stitch 3=Banani 4=Maquettes 5=Personnalise [1]: ",
        )
      ).trim() || "1";
    const architectures = {
      "1": {
        target: "cloud_vercel",
        frontend: "next",
        backend: "next",
        ui: "next",
        engine: "postgres",
        provider: "neon",
      },
      "2": {
        target: technicalChoice === "1" ? "vps_next" : "vps_laravel",
        frontend:
          technicalChoice === "2"
            ? "blade"
            : technicalChoice === "4"
              ? "react"
              : "next",
        backend: technicalChoice === "1" ? "next" : "laravel",
        ui:
          technicalChoice === "2"
            ? "blade"
            : technicalChoice === "4"
              ? "react"
              : "next",
        engine:
          technicalChoice === "1"
            ? "postgres"
            : databaseChoice === "2"
              ? "mysql"
              : "postgres",
        provider:
          technicalChoice === "1"
            ? "postgres"
            : databaseChoice === "2"
              ? "mysql"
              : "postgres",
      },
      "3": {
        target: "shared_laravel",
        frontend: "blade",
        backend: "laravel",
        ui: "blade",
        engine: "mysql",
        provider: "mysql",
      },
      "4": {
        target: "hybrid",
        frontend: technicalChoice === "2" ? "react" : "next",
        backend: "laravel",
        ui: technicalChoice === "2" ? "react" : "next",
        engine: databaseChoice === "2" ? "mysql" : "postgres",
        provider: databaseChoice === "2" ? "mysql" : "postgres",
      },
    } as const;
    const architecture =
      architectures[architectureChoice as keyof typeof architectures] ??
      architectures["1"];
    const selectedPayment =
      paymentChoice === "2"
        ? "stripe"
        : paymentChoice === "3"
          ? "fedapay"
          : paymentChoice === "4"
            ? "orange_money_ml"
            : paymentChoice === "5"
              ? "moneroo"
              : null;
    const designSource =
      designChoice === "2"
        ? "stitch"
        : designChoice === "3"
          ? "banani"
          : designChoice === "4"
            ? "provided_mockups"
            : designChoice === "5"
              ? "custom_frontend"
              : "headless";
    const config: FangaBaseConfig = {
      version: 1,
      product: {
        name,
        slug: slugify(name),
        type:
          (
            {
              "1": "saas",
              "2": "marketplace",
              "3": "services",
              "4": "commerce",
              "5": "internal",
            } as const
          )[typeChoice as "1"] ?? "saas",
        description,
        locale: "fr",
        timezone: "Africa/Bamako",
        country: "ML",
        default_currency: "XOF",
      },
      architecture: {
        target: architecture.target,
        frontend: architecture.frontend,
        backend: architecture.backend,
        ui: architecture.ui,
      },
      deployment: {
        family:
          architecture.target === "cloud_vercel"
            ? "cloud"
            : architecture.target === "shared_laravel"
              ? "shared"
              : architecture.target === "hybrid"
                ? "hybrid"
                : "vps",
        docker: false,
        database: architecture.engine,
        vps_variant:
          architecture.target === "vps_next"
            ? "next"
            : architecture.target === "vps_laravel"
              ? architecture.frontend === "blade"
                ? "laravel"
                : "laravel_api_next"
              : null,
      },
      database: {
        engine: architecture.engine,
        provider:
          architecture.target === "cloud_vercel"
            ? databaseChoice === "2"
              ? "supabase"
              : databaseChoice === "3"
                ? "postgres"
                : "neon"
            : architecture.provider,
      },
      email: {
        provider:
          (
            {
              "1": "local_log",
              "2": "smtp",
              "3": "resend",
              "4": "brevo",
            } as const
          )[emailChoice as "1"] ?? "local_log",
      },
      storage: { provider: "local_private" },
      queue: { provider: "database" },
      cache: { provider: "memory_dev" },
      billing: {
        modes:
          billingChoice === "2"
            ? ["subscription"]
            : billingChoice === "3"
              ? ["credits"]
              : billingChoice === "4"
                ? ["credits", "subscription"]
                : billingChoice === "5"
                  ? ["one_time"]
                  : [],
      },
      payments: {
        providers: selectedPayment ? [selectedPayment] : [],
        default_provider: selectedPayment,
      },
      design: {
        source: designSource,
      },
      frontend_connection: {
        source: designSource,
        frontend_origin: "http://localhost:3000",
        backend_url: "http://localhost:8000/api/",
        authentication: "cookie_session",
        cors: { origins: ["http://localhost:3000"], credentials: true },
        cookie_mode: "same_origin_lax",
      },
      features: {
        organizations: true,
        marketplace: typeChoice === "2",
        admin: true,
        audit_log: true,
        notifications: true,
        uploads: true,
      },
    };
    return stringify(config);
  } finally {
    io?.close();
  }
}

export async function promptDestination(): Promise<string> {
  if (!stdin.isTTY)
    throw new Error("--destination est obligatoire en mode non interactif.");
  const io = createInterface({ input: stdin, output: stdout });
  try {
    const value = (await io.question("Dossier de destination: ")).trim();
    if (!value) throw new Error("Le dossier de destination est obligatoire.");
    return value;
  } finally {
    io.close();
  }
}

export async function promptConfirmation(): Promise<boolean> {
  if (!stdin.isTTY) return false;
  const io = createInterface({ input: stdin, output: stdout });
  try {
    return (
      (await io.question("Créer ce projet ? Tapez OUI pour confirmer: "))
        .trim()
        .toUpperCase() === "OUI"
    );
  } finally {
    io.close();
  }
}
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "fangabase-app"
  );
}
async function readAllStdin(): Promise<string> {
  let value = "";
  for await (const chunk of stdin) value += chunk.toString();
  return value;
}
