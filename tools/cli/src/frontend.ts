import { z } from "zod";

export const designSources = [
  "headless",
  "stitch",
  "banani",
  "provided_mockups",
  "ai_generated",
  "custom_frontend",
] as const;

const safeHttpUrl = z
  .string()
  .url()
  .superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "use an HTTP(S) URL without credentials",
      });
    }
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTTPS is required outside local development",
      });
    }
  });

export const frontendIntegrationSchema = z.object({
  source: z.enum(designSources).default("headless"),
  frontend_origin: safeHttpUrl,
  backend_url: safeHttpUrl,
  authentication: z.literal("cookie_session").default("cookie_session"),
  cors: z
    .object({
      origins: z.array(safeHttpUrl).min(1),
      credentials: z.literal(true),
    })
    .superRefine((cors, context) => {
      if (cors.origins.includes("*"))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["origins"],
          message: "wildcard is forbidden with credentials",
        });
    }),
  cookie_mode: z.enum([
    "same_origin_lax",
    "cross_subdomain_lax",
    "cross_site_none_secure",
  ]),
});

export type FrontendIntegration = z.infer<typeof frontendIntegrationSchema>;

export function publicFrontendEnvironment(config: FrontendIntegration): string {
  const parsed = frontendIntegrationSchema.parse(config);
  return [
    `NEXT_PUBLIC_BACKEND_URL=${parsed.backend_url}`,
    `NEXT_PUBLIC_FRONTEND_ORIGIN=${parsed.frontend_origin}`,
    "# Never expose provider keys, APP_KEY, database URLs or OAuth client secrets here.",
    "",
  ].join("\n");
}
