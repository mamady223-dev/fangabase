import {
  BackendApplication,
  OrangeMoneyMlHttpGateway,
  OrangeMoneyMlProvider,
  OrangeMoneyMlSimulator,
  orangeMoneyMlConfiguration,
  runtimeStore,
  type TransactionalStore,
} from "@fangabase/backend-next";

const globalBackend = globalThis as typeof globalThis & {
  fangabaseStore?: TransactionalStore;
  fangabaseBackend?: BackendApplication;
};

export function backendApplication(): BackendApplication {
  if (globalBackend.fangabaseBackend) return globalBackend.fangabaseBackend;
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET_REQUIRED");
  const store = globalBackend.fangabaseStore ?? runtimeStore();
  globalBackend.fangabaseStore = store;
  const orangeConfiguration = orangeMoneyMlConfiguration(process.env);
  const orangeGateway =
    orangeConfiguration.environment === "simulator"
      ? new OrangeMoneyMlSimulator()
      : new OrangeMoneyMlHttpGateway();
  const application = new BackendApplication(store, {
    secret,
    production: process.env.NODE_ENV === "production",
    sameSite:
      process.env.SESSION_SAME_SITE === "none"
        ? "none"
        : process.env.SESSION_SAME_SITE === "strict"
          ? "strict"
          : "lax",
    bootstrapSuperadminEmail:
      process.env.FANGABASE_BOOTSTRAP_SUPERADMIN_EMAIL ?? null,
    googleAudience: process.env.GOOGLE_CLIENT_ID ?? "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    payoutWebhookSecret: process.env.PAYOUT_WEBHOOK_SECRET ?? "",
    orangeMoneyMlProvider: new OrangeMoneyMlProvider(
      orangeConfiguration,
      orangeGateway,
      secret,
    ),
  });
  globalBackend.fangabaseBackend = application;
  return application;
}
