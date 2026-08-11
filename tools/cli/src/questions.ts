import { stringify } from "yaml";
import { configSchema, type FangaBaseConfig } from "./config.js";

export const questionnaireProtocolVersion = 1;
export const generatorVersion = "0.4.0-rc.1";

export type AnswerValue = string;
export type Answers = Record<string, AnswerValue>;

export type QuestionChoice = {
  value: string;
  label: string;
  interactive_key: string;
};

export type QuestionCondition = {
  question_id: string;
  equals?: string;
  one_of?: string[];
};

export type QuestionDefinition = {
  id: string;
  label: string;
  type: "text" | "choice";
  required: boolean;
  default?: string;
  choices?: QuestionChoice[];
  conditions?: QuestionCondition[];
  compatibility?: string[];
  examples: string[];
  interactive_prompt: (answers: Answers) => string;
};

const choice = (
  value: string,
  label: string,
  interactiveKey: string,
): QuestionChoice => ({ value, label, interactive_key: interactiveKey });

export const questionRegistry: readonly QuestionDefinition[] = [
  {
    id: "product.name",
    label: "Nom du produit",
    type: "text",
    required: true,
    default: "FangaBase Demo",
    examples: ["Campus Mali", "Mon SaaS"],
    interactive_prompt: () => "Nom du produit [FangaBase Demo]: ",
  },
  {
    id: "product.description",
    label: "Description courte",
    type: "text",
    required: false,
    default: "",
    examples: ["Plateforme de gestion pour étudiants"],
    interactive_prompt: () => "Description courte: ",
  },
  {
    id: "product.type",
    label: "Type de produit",
    type: "choice",
    required: true,
    default: "saas",
    choices: [
      choice("saas", "SaaS", "1"),
      choice("marketplace", "Marketplace", "2"),
      choice("services", "Services", "3"),
      choice("commerce", "Commerce", "4"),
      choice("internal", "Interne", "5"),
    ],
    examples: ["saas", "marketplace"],
    interactive_prompt: () =>
      "Type 1=SaaS 2=Marketplace 3=Services 4=Commerce 5=Interne [1]: ",
  },
  {
    id: "deployment.family",
    label: "Famille de déploiement",
    type: "choice",
    required: true,
    default: "cloud",
    choices: [
      choice("cloud", "Cloud / Vercel", "1"),
      choice("vps", "VPS", "2"),
      choice("shared", "Hébergement mutualisé", "3"),
      choice("hybrid", "Hybride", "4"),
    ],
    compatibility: [
      "cloud impose Next.js autonome et PostgreSQL",
      "shared impose Laravel, Blade et MySQL",
    ],
    examples: ["cloud", "vps"],
    interactive_prompt: () =>
      "Deploiement 1=Cloud/Vercel 2=VPS 3=Mutualise 4=Hybride [1]: ",
  },
  {
    id: "architecture.vps_variant",
    label: "Architecture VPS",
    type: "choice",
    required: true,
    default: "next",
    conditions: [{ question_id: "deployment.family", equals: "vps" }],
    choices: [
      choice("next", "Next.js autonome", "1"),
      choice("laravel", "Laravel + Blade intégré — une seule application", "2"),
      choice(
        "laravel_inertia_react",
        "Laravel + React intégré — Inertia/Vite, une seule application",
        "3",
      ),
      choice(
        "laravel_api_next",
        "Laravel API + Next.js séparé — deux applications",
        "4",
      ),
      choice(
        "laravel_api_react",
        "Laravel API + React/Vite séparé — deux applications",
        "5",
      ),
    ],
    examples: ["next", "laravel_inertia_react", "laravel_api_next"],
    interactive_prompt: () =>
      "Architecture VPS 1=Next.js autonome 2=Laravel+Blade intégré 3=Laravel+React intégré (Inertia/Vite) 4=Laravel API+Next.js séparé 5=Laravel API+React/Vite séparé [1]: ",
  },
  {
    id: "architecture.shared_variant",
    label: "Architecture sur hébergement mutualisé",
    type: "choice",
    required: true,
    default: "laravel",
    conditions: [{ question_id: "deployment.family", equals: "shared" }],
    choices: [
      choice("laravel", "Laravel + Blade intégré — une seule application", "1"),
      choice(
        "laravel_inertia_react",
        "Laravel + React intégré — Inertia/Vite, une seule application; React est compilé avant déploiement sans serveur Node permanent",
        "2",
      ),
    ],
    examples: ["laravel", "laravel_inertia_react"],
    interactive_prompt: () =>
      "Architecture mutualisée 1=Laravel+Blade intégré 2=Laravel+React intégré (Inertia/Vite, compilé avant déploiement) [1]: ",
  },
  {
    id: "architecture.hybrid_frontend",
    label: "Frontend hybride",
    type: "choice",
    required: true,
    default: "next",
    conditions: [{ question_id: "deployment.family", equals: "hybrid" }],
    choices: [
      choice("next", "Laravel API + Next.js séparé — deux applications", "1"),
      choice(
        "react",
        "Laravel API + React/Vite séparé — deux applications",
        "2",
      ),
    ],
    examples: ["next", "react"],
    interactive_prompt: () =>
      "Architecture hybride 1=Laravel API+Next.js séparé 2=Laravel API+React/Vite séparé [1]: ",
  },
  {
    id: "database.provider",
    label: "Base de données",
    type: "choice",
    required: true,
    default: "postgres",
    choices: [
      choice("neon", "Neon PostgreSQL", "1"),
      choice("supabase", "Supabase PostgreSQL", "2"),
      choice("postgres", "PostgreSQL", "3"),
      choice("mysql", "MySQL", "4"),
    ],
    compatibility: [
      "cloud accepte neon, supabase ou postgres",
      "shared impose mysql",
      "VPS Next.js autonome impose postgres",
      "les profils Laravel VPS et hybrides acceptent postgres ou mysql",
    ],
    examples: ["neon", "postgres", "mysql"],
    interactive_prompt: (answers) =>
      answers["deployment.family"] === "cloud"
        ? "Base 1=Neon PostgreSQL 2=Supabase PostgreSQL 3=PostgreSQL [1]: "
        : "Base 1=PostgreSQL 2=MySQL [1]: ",
  },
  {
    id: "email.provider",
    label: "Fournisseur d’e-mail",
    type: "choice",
    required: true,
    default: "local_log",
    choices: [
      choice("local_log", "Journal local", "1"),
      choice("smtp", "SMTP", "2"),
      choice("resend", "Resend", "3"),
      choice("brevo", "Brevo", "4"),
    ],
    examples: ["local_log", "smtp"],
    interactive_prompt: () =>
      "E-mail 1=Journal local 2=SMTP 3=Resend 4=Brevo [1]: ",
  },
  {
    id: "payments.provider",
    label: "Fournisseur de paiement",
    type: "choice",
    required: true,
    default: "none",
    choices: [
      choice("none", "Aucun", "1"),
      choice("stripe", "Stripe", "2"),
      choice("fedapay", "FedaPay", "3"),
      choice("orange_money_ml", "Orange Money Mali", "4"),
      choice("moneroo", "Moneroo (contrat requis)", "5"),
    ],
    compatibility: [
      "Moneroo reste NEEDS_PROVIDER_CONTRACT",
      "Orange Money Mali exige un contrat marchand et une UAT sandbox",
    ],
    examples: ["none", "stripe", "orange_money_ml"],
    interactive_prompt: () =>
      "Paiement 1=Aucun 2=Stripe 3=FedaPay 4=Orange Money Mali 5=Moneroo (contrat requis) [1]: ",
  },
  {
    id: "billing.mode",
    label: "Mode de facturation",
    type: "choice",
    required: true,
    default: "none",
    choices: [
      choice("none", "Aucune", "1"),
      choice("subscription", "Abonnement", "2"),
      choice("credits", "Crédits", "3"),
      choice("credits_subscription", "Crédits + abonnement", "4"),
      choice("one_time", "Paiement unique", "5"),
    ],
    examples: ["none", "subscription"],
    interactive_prompt: () =>
      "Facturation 1=Aucune 2=Abonnement 3=Credits 4=Credits+abonnement 5=Paiement unique [1]: ",
  },
  {
    id: "design.source",
    label: "Source du frontend",
    type: "choice",
    required: true,
    default: "headless",
    choices: [
      choice("headless", "Headless", "1"),
      choice("stitch", "Stitch", "2"),
      choice("banani", "Banani", "3"),
      choice("provided_mockups", "Maquettes fournies", "4"),
      choice("custom_frontend", "Frontend personnalisé", "5"),
    ],
    compatibility: [
      "headless est le choix par défaut; aucun design n’est inventé",
    ],
    examples: ["headless", "provided_mockups"],
    interactive_prompt: () =>
      "Frontend 1=Headless 2=Stitch 3=Banani 4=Maquettes 5=Personnalise [1]: ",
  },
] as const;

export function isQuestionVisible(
  question: QuestionDefinition,
  answers: Answers,
): boolean {
  return (question.conditions ?? []).every((condition) => {
    const value = answers[condition.question_id];
    if (condition.equals !== undefined) return value === condition.equals;
    return condition.one_of?.includes(value ?? "") ?? true;
  });
}

export function interactiveAnswer(
  question: QuestionDefinition,
  raw: string,
  answers: Answers = {},
): string {
  const value = raw.trim();
  if (
    question.id === "database.provider" &&
    answers["deployment.family"] !== "cloud"
  ) {
    if (!value || value === "1") return "postgres";
    if (value === "2") return "mysql";
  }
  if (!value)
    return question.id === "database.provider" &&
      answers["deployment.family"] === "cloud"
      ? "neon"
      : (question.default ?? "");
  return (
    question.choices?.find(
      (item) => item.interactive_key === value || item.value === value,
    )?.value ?? value
  );
}

export function validateAnswers(answers: unknown): {
  answers: Answers;
  errors: Array<{ question_id: string; code: string; message: string }>;
} {
  const errors: Array<{
    question_id: string;
    code: string;
    message: string;
  }> = [];
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {
      answers: {},
      errors: [
        {
          question_id: "$",
          code: "INVALID_TYPE",
          message: "Le fichier de réponses doit contenir un objet JSON.",
        },
      ],
    };
  }
  const result: Answers = {};
  const definitions = new Map(questionRegistry.map((item) => [item.id, item]));
  for (const [id, raw] of Object.entries(answers)) {
    const definition = definitions.get(id);
    if (!definition) {
      errors.push({
        question_id: id,
        code: "UNKNOWN_QUESTION",
        message: `Identifiant de question inconnu: ${id}.`,
      });
      continue;
    }
    if (typeof raw !== "string") {
      errors.push({
        question_id: id,
        code: "INVALID_TYPE",
        message: `${id} doit être une chaîne de caractères.`,
      });
      continue;
    }
    if (
      definition.choices &&
      !definition.choices.some((item) => item.value === raw)
    ) {
      errors.push({
        question_id: id,
        code: "INVALID_CHOICE",
        message: `${id} doit valoir l’une des valeurs suivantes: ${definition.choices.map((item) => item.value).join(", ")}.`,
      });
      continue;
    }
    if (definition.required && !raw.trim()) {
      errors.push({
        question_id: id,
        code: "REQUIRED",
        message: `${id} est obligatoire.`,
      });
      continue;
    }
    result[id] = raw;
  }
  return { answers: result, errors };
}

export function missingQuestions(answers: Answers): QuestionDefinition[] {
  return questionRegistry.filter(
    (question) =>
      isQuestionVisible(question, answers) &&
      answers[question.id] === undefined,
  );
}

export function configFromAnswers(answers: Answers): FangaBaseConfig {
  const family = answers["deployment.family"];
  const vps = answers["architecture.vps_variant"];
  const hybridFrontend = answers["architecture.hybrid_frontend"];
  const shared = answers["architecture.shared_variant"];
  const provider = answers["database.provider"];
  const target =
    family === "cloud"
      ? "cloud_vercel"
      : family === "shared"
        ? "shared_laravel"
        : family === "hybrid"
          ? "hybrid"
          : vps === "next"
            ? "vps_next"
            : "vps_laravel";
  const backend =
    target === "cloud_vercel" || target === "vps_next" ? "next" : "laravel";
  const inertia =
    vps === "laravel_inertia_react" ||
    (family === "shared" && shared === "laravel_inertia_react");
  const frontend =
    (target === "shared_laravel" && !inertia) || vps === "laravel"
      ? "blade"
      : inertia
        ? "react"
        : family === "hybrid"
          ? hybridFrontend
          : vps === "laravel_api_react"
            ? "react"
            : "next";
  const databaseProvider =
    family === "cloud"
      ? provider
      : family === "shared"
        ? "mysql"
        : target === "vps_next"
          ? "postgres"
          : provider === "mysql"
            ? "mysql"
            : "postgres";
  const databaseEngine = databaseProvider === "mysql" ? "mysql" : "postgres";
  const payment = answers["payments.provider"];
  const billing = answers["billing.mode"];
  const design = answers["design.source"];
  const name = answers["product.name"] ?? "";
  return configSchema.parse({
    version: 1,
    product: {
      name,
      slug: slugify(name),
      type: answers["product.type"],
      description: answers["product.description"],
      locale: "fr",
      timezone: "Africa/Bamako",
      country: "ML",
      default_currency: "XOF",
    },
    architecture: {
      target,
      frontend,
      backend,
      ui: inertia ? "inertia_react" : frontend,
      integration: inertia
        ? "inertia"
        : backend === "next"
          ? "standalone"
          : frontend === "blade"
            ? "blade"
            : "api",
    },
    deployment: {
      family,
      docker: false,
      database: databaseEngine,
      vps_variant: family === "vps" ? vps : null,
    },
    database: { engine: databaseEngine, provider: databaseProvider },
    email: { provider: answers["email.provider"] },
    storage: { provider: "local_private" },
    queue: { provider: "database" },
    cache: { provider: "memory_dev" },
    billing: {
      modes:
        billing === "subscription"
          ? ["subscription"]
          : billing === "credits"
            ? ["credits"]
            : billing === "credits_subscription"
              ? ["credits", "subscription"]
              : billing === "one_time"
                ? ["one_time"]
                : [],
    },
    payments: {
      providers: payment === "none" ? [] : [payment],
      default_provider: payment === "none" ? null : payment,
    },
    design: { source: design },
    ...(inertia
      ? {}
      : {
          frontend_connection: {
            source: design,
            frontend_origin: "http://localhost:3000",
            backend_url: "http://localhost:8000/api/",
            authentication: "cookie_session",
            cors: { origins: ["http://localhost:3000"], credentials: true },
            cookie_mode: "same_origin_lax",
          },
        }),
    features: {
      organizations: true,
      marketplace: answers["product.type"] === "marketplace",
      admin: true,
      audit_log: true,
      notifications: true,
      uploads: true,
    },
  });
}

export function serializeConfig(answers: Answers): string {
  return stringify(configFromAnswers(answers));
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
