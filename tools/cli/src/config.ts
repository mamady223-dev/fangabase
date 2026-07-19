import { z } from "zod";

const architectureTargets = [
  "cloud_vercel",
  "vps_next",
  "vps_laravel",
  "shared_laravel",
  "hybrid",
] as const;
const paymentProviders = [
  "stripe",
  "fedapay",
  "cinetpay",
  "paydunya",
  "orange_money",
  "bictorys",
  "paytech",
  "moneroo",
  "monero",
] as const;

export const configSchema = z
  .object({
    version: z.literal(1),
    product: z.object({
      name: z.string().trim().min(1),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      type: z.enum([
        "saas",
        "marketplace",
        "services",
        "commerce",
        "internal",
        "other",
      ]),
      description: z.string(),
      locale: z.enum(["fr", "en"]),
      timezone: z.string().min(1),
      country: z.string().regex(/^[A-Z]{2}$/),
      default_currency: z.string().regex(/^[A-Z]{3}$/),
    }),
    architecture: z.object({
      target: z.enum(architectureTargets),
      frontend: z.enum(["next", "blade", "inertia"]),
      backend: z.enum(["next", "laravel"]),
      ui: z.enum(["next", "blade", "inertia"]),
    }),
    database: z.object({
      engine: z.enum(["postgres", "mysql"]),
      provider: z.string().min(1),
    }),
    email: z.object({
      provider: z.enum(["resend", "brevo", "smtp", "local_log"]),
    }),
    storage: z.object({
      provider: z.enum(["cloudinary", "supabase", "r2", "s3", "local_private"]),
    }),
    queue: z.object({
      provider: z.enum(["upstash", "redis", "database", "sync_dev"]),
    }),
    cache: z.object({
      provider: z.enum(["upstash", "redis", "database", "memory_dev"]),
    }),
    billing: z.object({
      modes: z
        .array(z.enum(["credits", "subscription", "one_time", "commission"]))
        .min(1),
    }),
    payments: z.object({
      providers: z.array(z.enum(paymentProviders)),
      default_provider: z.enum(paymentProviders).nullable(),
    }),
    design: z.object({
      source: z.enum([
        "headless",
        "banani",
        "provided_mockups",
        "ai_generated",
      ]),
    }),
    features: z.object({
      organizations: z.boolean(),
      marketplace: z.boolean(),
      admin: z.boolean(),
      audit_log: z.boolean(),
      notifications: z.boolean(),
      uploads: z.boolean(),
    }),
  })
  .superRefine((value, context) => {
    if (
      value.architecture.target === "cloud_vercel" &&
      (value.architecture.backend !== "next" ||
        value.database.engine !== "postgres")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["architecture", "target"],
        message: "cloud_vercel exige le backend Next.js et PostgreSQL",
      });
    }
    if (
      value.architecture.target === "shared_laravel" &&
      value.architecture.backend !== "laravel"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["architecture", "backend"],
        message: "shared_laravel exige Laravel",
      });
    }
    if (
      value.architecture.target === "hybrid" &&
      (value.architecture.frontend !== "next" ||
        value.architecture.backend !== "laravel")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["architecture"],
        message: "hybrid exige un frontend Next.js et un backend Laravel",
      });
    }
    if (
      value.payments.providers.length === 0 &&
      value.payments.default_provider !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payments", "default_provider"],
        message:
          "le fournisseur par défaut doit être null lorsque les paiements sont désactivés",
      });
    }
    if (
      value.payments.default_provider !== null &&
      !value.payments.providers.includes(value.payments.default_provider)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payments", "default_provider"],
        message: "le fournisseur par défaut doit être activé",
      });
    }
  });

export type FangaBaseConfig = z.infer<typeof configSchema>;
