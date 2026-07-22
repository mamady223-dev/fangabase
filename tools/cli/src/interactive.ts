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
    const emailChoice =
      (
        await ask("E-mail 1=Journal local 2=SMTP 3=Resend 4=Brevo [1]: ")
      ).trim() || "1";
    const paymentChoice =
      (await ask("Paiement 1=FedaPay 2=Stripe 3=Aucun [1]: ")).trim() || "1";
    const billingChoice =
      (
        await ask(
          "Facturation 1=Credits+abonnement 2=Abonnement 3=Paiement unique [1]: ",
        )
      ).trim() || "1";
    const designChoice =
      (
        await ask("Design 1=Headless 2=Banani 3=Maquettes fournies [1]: ")
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
        target: "vps_next",
        frontend: "next",
        backend: "next",
        ui: "next",
        engine: "postgres",
        provider: "postgres",
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
        frontend: "next",
        backend: "laravel",
        ui: "next",
        engine: "mysql",
        provider: "mysql",
      },
    } as const;
    const architecture =
      architectures[architectureChoice as keyof typeof architectures] ??
      architectures["1"];
    const selectedPayment =
      paymentChoice === "2"
        ? "stripe"
        : paymentChoice === "3"
          ? null
          : "fedapay";
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
        vps_variant: architecture.target === "vps_next" ? "next" : null,
      },
      database: {
        engine: architecture.engine,
        provider: architecture.provider,
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
              ? ["one_time"]
              : ["credits", "subscription"],
      },
      payments: {
        providers: selectedPayment ? [selectedPayment] : [],
        default_provider: selectedPayment,
      },
      design: {
        source:
          designChoice === "2"
            ? "banani"
            : designChoice === "3"
              ? "provided_mockups"
              : "headless",
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
