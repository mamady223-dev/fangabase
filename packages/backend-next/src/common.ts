import { randomUUID } from "node:crypto";
import type {
  AuditRecord,
  BackendState,
  IdempotencyRecord,
  OutboxRecord,
} from "./state.js";
import { fingerprint, seal } from "./crypto.js";

export class BackendProblem extends Error {
  constructor(
    readonly code:
      | "AUTH_REQUIRED"
      | "ACCOUNT_SUSPENDED"
      | "CSRF_INVALID"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_FAILED"
      | "RATE_LIMITED"
      | "IDEMPOTENCY_BODY_MISMATCH"
      | "WEBHOOK_INVALID"
      | "PAYMENT_PROVIDER_UNAVAILABLE"
      | "INSUFFICIENT_BALANCE"
      | "CONFLICT",
    readonly status: number,
  ) {
    super(code);
  }
}

export function now(): string {
  return new Date().toISOString();
}

export function expiresIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function positiveMinor(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

export function audit(
  state: BackendState,
  actorId: string | null,
  action: string,
  subjectType: string,
  subjectId: string,
  metadata: Record<string, string> = {},
): AuditRecord {
  const entry: AuditRecord = {
    id: randomUUID(),
    actorId,
    action,
    subjectType,
    subjectId,
    metadata,
    createdAt: now(),
  };
  state.audit.push(entry);
  return entry;
}

export function enqueue(
  state: BackendState,
  secret: string,
  topic: string,
  ownerId: string,
  payload: unknown,
): OutboxRecord {
  const message: OutboxRecord = {
    id: randomUUID(),
    topic,
    ownerId,
    payloadCiphertext: seal(JSON.stringify(payload), secret),
    status: "PENDING",
    attempts: 0,
    availableAt: now(),
    leaseUntil: null,
  };
  state.outbox.push(message);
  return message;
}

export function withIdempotency<T>(
  state: BackendState,
  scope: string,
  body: unknown,
  operation: () => { status: number; body: T },
): { status: number; body: T } {
  const bodyFingerprint = fingerprint(body);
  const existing = state.idempotency.find((item) => item.scope === scope);
  if (existing) {
    if (existing.fingerprint !== bodyFingerprint)
      throw new BackendProblem("IDEMPOTENCY_BODY_MISMATCH", 409);
    return { status: existing.status, body: existing.body as T };
  }
  const result = operation();
  const record: IdempotencyRecord = {
    scope,
    fingerprint: bodyFingerprint,
    status: result.status,
    body: result.body,
  };
  state.idempotency.push(record);
  return result;
}

export function page<T>(
  values: T[],
  requestedLimit: number,
  cursor: string | null,
): { data: T[]; cursor: string | null; hasMore: boolean } {
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, 100))
    : 25;
  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new BackendProblem("VALIDATION_FAILED", 422);
  const data = values.slice(offset, offset + limit);
  const next = offset + data.length;
  return {
    data,
    cursor: next < values.length ? String(next) : null,
    hasMore: next < values.length,
  };
}
