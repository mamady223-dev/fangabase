export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  status: "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  name: string;
  locale: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  previousTokenHashes: string[];
  csrfHash: string;
  previousCsrfHashes: string[];
  expiresAt: string;
  revokedAt: string | null;
};

export type OneTimeToken = {
  id: string;
  userId: string;
  purpose: "email_verification" | "password_reset" | "oauth_state";
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  metadata: Record<string, string>;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

export type MembershipRecord = {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  revokedAt: string | null;
};

export type InvitationRecord = {
  id: string;
  organizationId: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  refusedAt: string | null;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type UploadRecord = {
  id: string;
  userId: string;
  name: string;
  mime: string;
  size: number;
  storageKey: string;
  checksum: string;
  createdAt: string;
};

export type CatalogPrice = {
  id: string;
  productKey: string;
  label: string;
  amountMinor: number;
  currency: "XOF" | "EUR" | "USD";
  version: number;
  archivedAt: string | null;
};

export type CreditLot = {
  id: string;
  ownerId: string;
  remainingMinor: number;
  currency: "XOF" | "EUR" | "USD";
  expiresAt: string | null;
  createdAt: string;
};

export type LedgerRecord = {
  id: string;
  ownerId: string;
  kind: "CREDIT" | "DEBIT" | "RESERVE" | "RELEASE" | "COMPENSATION";
  amountMinor: number;
  currency: "XOF" | "EUR" | "USD";
  reference: string;
  createdAt: string;
};

export type SubscriptionRecord = {
  id: string;
  ownerId: string;
  priceId: string;
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  ownerId: string;
  priceId: string;
  provider: string;
  amountMinor: number;
  currency: "XOF" | "EUR" | "USD";
  status:
    | "CREATED"
    | "PENDING"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "NEEDS_REVIEW"
    | "REFUNDED";
  refundedMinor: number;
  providerReference?: string | null;
  safeMetadata?: Record<string, unknown>;
  createdAt: string;
};

export type PayoutAccountRecord = {
  id: string;
  ownerId: string;
  provider: string;
  encryptedDetails: string;
  verifiedAt: string | null;
};

export type WithdrawalRecord = {
  id: string;
  ownerId: string;
  payoutAccountId: string;
  amountMinor: number;
  currency: "XOF" | "EUR" | "USD";
  status:
    | "PENDING"
    | "APPROVED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  providerReference: string | null;
  createdAt: string;
};

export type OutboxRecord = {
  id: string;
  topic: string;
  ownerId: string;
  payloadCiphertext: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "DEAD";
  attempts: number;
  availableAt: string;
  leaseUntil: string | null;
};

export type AuditRecord = {
  id: string;
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  metadata: Record<string, string>;
  createdAt: string;
};

export type IdempotencyRecord = {
  scope: string;
  fingerprint: string;
  status: number;
  body: unknown;
};

export type RateLimitRecord = {
  key: string;
  attempts: string[];
};

export type BackendState = {
  users: UserRecord[];
  sessions: SessionRecord[];
  oneTimeTokens: OneTimeToken[];
  oauthLinks: {
    provider: "google";
    subject: string;
    userId: string;
    createdAt: string;
  }[];
  organizations: OrganizationRecord[];
  memberships: MembershipRecord[];
  invitations: InvitationRecord[];
  notifications: NotificationRecord[];
  notificationPreferences: Record<string, { email: boolean; inApp: boolean }>;
  uploads: UploadRecord[];
  localFiles: Record<string, string>;
  catalog: CatalogPrice[];
  creditLots: CreditLot[];
  ledger: LedgerRecord[];
  subscriptions: SubscriptionRecord[];
  entitlements: Record<string, string[]>;
  payments: PaymentRecord[];
  payoutAccounts: PayoutAccountRecord[];
  withdrawals: WithdrawalRecord[];
  outbox: OutboxRecord[];
  audit: AuditRecord[];
  idempotency: IdempotencyRecord[];
  rateLimits: RateLimitRecord[];
  webhookEvents: string[];
};

export function emptyState(): BackendState {
  return {
    users: [],
    sessions: [],
    oneTimeTokens: [],
    oauthLinks: [],
    organizations: [],
    memberships: [],
    invitations: [],
    notifications: [],
    notificationPreferences: {},
    uploads: [],
    localFiles: {},
    catalog: [],
    creditLots: [],
    ledger: [],
    subscriptions: [],
    entitlements: {},
    payments: [],
    payoutAccounts: [],
    withdrawals: [],
    outbox: [],
    audit: [],
    idempotency: [],
    rateLimits: [],
    webhookEvents: [],
  };
}
