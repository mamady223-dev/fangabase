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
