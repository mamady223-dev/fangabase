export const roles = ["USER", "ADMIN", "SUPERADMIN"] as const;
export const userStatuses = ["ACTIVE", "SUSPENDED"] as const;
export const paymentStatuses = [
  "CREATED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export const withdrawalStatuses = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export const organizationRoles = ["OWNER", "ADMIN", "MEMBER"] as const;
export const subscriptionStatuses = [
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
] as const;
export const outboxStatuses = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "DEAD",
] as const;
export const errorCodes = [
  "AUTH_REQUIRED",
  "ACCOUNT_SUSPENDED",
  "CSRF_INVALID",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "IDEMPOTENCY_BODY_MISMATCH",
  "WEBHOOK_INVALID",
  "PAYMENT_PROVIDER_UNAVAILABLE",
  "INSUFFICIENT_BALANCE",
  "CONFLICT",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export type Currency = "XOF" | "EUR" | "USD";
export type Money = Readonly<{ amountMinor: bigint; currency: Currency }>;
export type Page<T> = Readonly<{
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}>;
export type ApiError = Readonly<{
  error: { code: ErrorCode; message: string; requestId: string };
}>;
export type ProviderResult = Readonly<{
  provider: string;
  providerReference: string;
  status: (typeof paymentStatuses)[number];
  paymentUrl?: string;
  rawStatus: string;
  safeMetadata: Record<string, string>;
  capability: string;
}>;

export type ContractRoute = Readonly<{
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  auth: "public" | "session" | "admin";
  csrf: boolean;
}>;

export const backendContractRoutes: readonly ContractRoute[] = [
  { method: "POST", path: "/auth/register", auth: "public", csrf: false },
  { method: "POST", path: "/auth/login", auth: "public", csrf: false },
  { method: "GET", path: "/auth/me", auth: "session", csrf: false },
  {
    method: "POST",
    path: "/auth/email/verification/request",
    auth: "public",
    csrf: false,
  },
  {
    method: "POST",
    path: "/auth/email/verification/confirm",
    auth: "public",
    csrf: false,
  },
  {
    method: "POST",
    path: "/auth/password/forgot",
    auth: "public",
    csrf: false,
  },
  {
    method: "POST",
    path: "/auth/password/reset",
    auth: "public",
    csrf: false,
  },
  {
    method: "POST",
    path: "/auth/password/change",
    auth: "session",
    csrf: true,
  },
  { method: "POST", path: "/auth/refresh", auth: "session", csrf: true },
  { method: "POST", path: "/auth/logout", auth: "session", csrf: true },
  { method: "POST", path: "/auth/logout-all", auth: "session", csrf: true },
  { method: "GET", path: "/oauth/google/start", auth: "public", csrf: false },
  {
    method: "GET",
    path: "/oauth/google/callback",
    auth: "public",
    csrf: false,
  },
  { method: "GET", path: "/organizations", auth: "session", csrf: false },
  { method: "POST", path: "/organizations", auth: "session", csrf: true },
  {
    method: "GET",
    path: "/organizations/:organization",
    auth: "session",
    csrf: false,
  },
  {
    method: "PATCH",
    path: "/organizations/:organization",
    auth: "session",
    csrf: true,
  },
  {
    method: "GET",
    path: "/organizations/:organization/members",
    auth: "session",
    csrf: false,
  },
  {
    method: "POST",
    path: "/organizations/:organization/invitations",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/organizations/:organization/invitations/:token/accept",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/organizations/:organization/invitations/:token/refuse",
    auth: "session",
    csrf: true,
  },
  {
    method: "PATCH",
    path: "/organizations/:organization/members/:user",
    auth: "session",
    csrf: true,
  },
  {
    method: "DELETE",
    path: "/organizations/:organization/members/:user",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/organizations/:organization/leave",
    auth: "session",
    csrf: true,
  },
  { method: "GET", path: "/notifications", auth: "session", csrf: false },
  {
    method: "GET",
    path: "/notifications/unread-count",
    auth: "session",
    csrf: false,
  },
  {
    method: "PATCH",
    path: "/notifications/preferences",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/notifications/:notification/read",
    auth: "session",
    csrf: true,
  },
  { method: "GET", path: "/profile", auth: "session", csrf: false },
  { method: "PATCH", path: "/profile", auth: "session", csrf: true },
  { method: "POST", path: "/uploads", auth: "session", csrf: true },
  { method: "GET", path: "/uploads/:upload", auth: "session", csrf: false },
  { method: "GET", path: "/catalog", auth: "public", csrf: false },
  { method: "GET", path: "/billing/summary", auth: "session", csrf: false },
  { method: "GET", path: "/billing/credits", auth: "session", csrf: false },
  {
    method: "GET",
    path: "/billing/subscription",
    auth: "session",
    csrf: false,
  },
  {
    method: "GET",
    path: "/billing/entitlements",
    auth: "session",
    csrf: false,
  },
  {
    method: "POST",
    path: "/billing/credits/purchase",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/billing/subscriptions",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/billing/subscriptions/:subscription/cancel",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/payments/checkouts",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/payments/orders/:order/refunds",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/webhooks/stripe",
    auth: "public",
    csrf: false,
  },
  { method: "GET", path: "/withdrawals", auth: "session", csrf: false },
  {
    method: "GET",
    path: "/withdrawals/balance",
    auth: "session",
    csrf: false,
  },
  { method: "POST", path: "/payout-accounts", auth: "session", csrf: true },
  { method: "POST", path: "/withdrawals", auth: "session", csrf: true },
  {
    method: "POST",
    path: "/withdrawals/:withdrawal/cancel",
    auth: "session",
    csrf: true,
  },
  {
    method: "POST",
    path: "/webhooks/payouts/:provider",
    auth: "public",
    csrf: false,
  },
  { method: "GET", path: "/admin/users", auth: "admin", csrf: false },
  {
    method: "PATCH",
    path: "/admin/users/:user",
    auth: "admin",
    csrf: true,
  },
  {
    method: "GET",
    path: "/admin/organizations",
    auth: "admin",
    csrf: false,
  },
  {
    method: "PATCH",
    path: "/admin/organizations/:organization",
    auth: "admin",
    csrf: true,
  },
  { method: "POST", path: "/admin/catalog", auth: "admin", csrf: true },
  {
    method: "POST",
    path: "/admin/catalog/prices/:price/archive",
    auth: "admin",
    csrf: true,
  },
  {
    method: "POST",
    path: "/admin/billing/credits/grant",
    auth: "admin",
    csrf: true,
  },
  {
    method: "GET",
    path: "/admin/billing/events",
    auth: "admin",
    csrf: false,
  },
  { method: "GET", path: "/admin/withdrawals", auth: "admin", csrf: false },
  {
    method: "POST",
    path: "/admin/withdrawals/:withdrawal/verify",
    auth: "admin",
    csrf: true,
  },
  {
    method: "POST",
    path: "/admin/withdrawals/:withdrawal/approve",
    auth: "admin",
    csrf: true,
  },
  {
    method: "POST",
    path: "/admin/reconciliation/withdrawals",
    auth: "admin",
    csrf: true,
  },
  { method: "GET", path: "/admin/audit", auth: "admin", csrf: false },
  { method: "GET", path: "/admin/outbox", auth: "admin", csrf: false },
  { method: "GET", path: "/admin/rate-limits", auth: "admin", csrf: false },
  { method: "GET", path: "/health", auth: "public", csrf: false },
  { method: "GET", path: "/readiness", auth: "public", csrf: false },
] as const;

export function money(amountMinor: bigint, currency: Currency): Money {
  if (amountMinor < 0n) throw new Error("VALIDATION_FAILED");
  return Object.freeze({ amountMinor, currency });
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) throw new Error("VALIDATION_FAILED");
  return money(left.amountMinor + right.amountMinor, left.currency);
}

export function stableError(code: ErrorCode, requestId: string): ApiError {
  const publicMessages: Record<ErrorCode, string> = {
    AUTH_REQUIRED: "Authentification requise",
    ACCOUNT_SUSPENDED: "Compte indisponible",
    CSRF_INVALID: "Requ?te non autoris?e",
    FORBIDDEN: "Action interdite",
    NOT_FOUND: "Ressource introuvable",
    VALIDATION_FAILED: "Donn?es invalides",
    RATE_LIMITED: "Trop de tentatives",
    IDEMPOTENCY_BODY_MISMATCH:
      "La cl? a d?j? ?t? utilis?e pour une autre demande",
    WEBHOOK_INVALID: "Notification invalide",
    PAYMENT_PROVIDER_UNAVAILABLE: "Paiement temporairement indisponible",
    INSUFFICIENT_BALANCE: "Solde insuffisant",
    CONFLICT: "Conflit avec l'?tat courant",
  };
  return { error: { code, message: publicMessages[code], requestId } };
}

export { createFrontendClient, FrontendApiError } from "./frontend-client.js";
