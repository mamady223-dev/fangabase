import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  audit,
  BackendProblem,
  now,
  page,
  positiveMinor,
  withIdempotency,
} from "./common.js";
import { seal } from "./crypto.js";
import type { PublicUser } from "./identity.js";
import type {
  BackendState,
  PayoutAccountRecord,
  WithdrawalRecord,
} from "./state.js";

export class WithdrawalService {
  constructor(private readonly secret: string) {}

  account(
    state: BackendState,
    actor: PublicUser,
    input: { provider: string; details: Record<string, string> },
  ): PayoutAccountRecord {
    if (
      !input.provider ||
      Object.keys(input.details).length === 0 ||
      Object.values(input.details).some((value) => !value.trim())
    )
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const account: PayoutAccountRecord = {
      id: randomUUID(),
      ownerId: actor.id,
      provider: input.provider,
      encryptedDetails: seal(JSON.stringify(input.details), this.secret),
      verifiedAt: null,
    };
    state.payoutAccounts.push(account);
    audit(
      state,
      actor.id,
      "payout.account.created",
      "payout_account",
      account.id,
    );
    return account;
  }

  list(state: BackendState, actor: PublicUser): WithdrawalRecord[] {
    return state.withdrawals.filter((item) => item.ownerId === actor.id);
  }

  balance(state: BackendState, actor: PublicUser) {
    const completed = state.withdrawals
      .filter(
        (item) => item.ownerId === actor.id && item.status === "COMPLETED",
      )
      .reduce((sum, item) => sum + item.amountMinor, 0);
    const reserved = state.withdrawals
      .filter(
        (item) =>
          item.ownerId === actor.id &&
          ["PENDING", "APPROVED", "PROCESSING"].includes(item.status),
      )
      .reduce((sum, item) => sum + item.amountMinor, 0);
    const earned = state.ledger
      .filter(
        (item) =>
          item.ownerId === actor.id &&
          ["CREDIT", "COMPENSATION"].includes(item.kind),
      )
      .reduce((sum, item) => sum + item.amountMinor, 0);
    return {
      currency: "XOF",
      availableMinor: Math.max(0, earned - completed - reserved),
      reservedMinor: reserved,
      paidMinor: completed,
    };
  }

  request(
    state: BackendState,
    actor: PublicUser,
    input: {
      payoutAccountId: string;
      amountMinor: number;
      currency: "XOF" | "EUR" | "USD";
    },
    idempotencyKey: string,
  ) {
    const account = state.payoutAccounts.find(
      (item) => item.id === input.payoutAccountId && item.ownerId === actor.id,
    );
    if (!account) throw new BackendProblem("NOT_FOUND", 404);
    const amountMinor = positiveMinor(input.amountMinor);
    if (this.balance(state, actor).availableMinor < amountMinor)
      throw new BackendProblem("INSUFFICIENT_BALANCE", 409);
    return withIdempotency(
      state,
      `${actor.id}:withdrawal.request:${account.provider}:${idempotencyKey}`,
      input,
      () => {
        const withdrawal: WithdrawalRecord = {
          id: randomUUID(),
          ownerId: actor.id,
          payoutAccountId: account.id,
          amountMinor,
          currency: input.currency,
          status: "PENDING",
          providerReference: null,
          createdAt: now(),
        };
        state.withdrawals.push(withdrawal);
        audit(
          state,
          actor.id,
          "withdrawal.requested",
          "withdrawal",
          withdrawal.id,
        );
        return { status: 201, body: withdrawal };
      },
    );
  }

  cancel(
    state: BackendState,
    actor: PublicUser,
    withdrawalId: string,
  ): WithdrawalRecord {
    const withdrawal = state.withdrawals.find(
      (item) => item.id === withdrawalId && item.ownerId === actor.id,
    );
    if (!withdrawal) throw new BackendProblem("NOT_FOUND", 404);
    if (withdrawal.status !== "PENDING")
      throw new BackendProblem("CONFLICT", 409);
    withdrawal.status = "CANCELLED";
    audit(state, actor.id, "withdrawal.cancelled", "withdrawal", withdrawal.id);
    return withdrawal;
  }

  adminList(
    state: BackendState,
    actor: PublicUser,
    limit: number,
    cursor: string | null,
  ) {
    requireSuperadmin(actor);
    return page(state.withdrawals, limit, cursor);
  }

  verify(
    state: BackendState,
    actor: PublicUser,
    withdrawalId: string,
  ): WithdrawalRecord {
    requireSuperadmin(actor);
    const withdrawal = requiredWithdrawal(state, withdrawalId);
    const account = state.payoutAccounts.find(
      (item) => item.id === withdrawal.payoutAccountId,
    );
    if (!account) throw new BackendProblem("NOT_FOUND", 404);
    account.verifiedAt = now();
    audit(state, actor.id, "withdrawal.verified", "withdrawal", withdrawal.id);
    return withdrawal;
  }

  approve(
    state: BackendState,
    actor: PublicUser,
    withdrawalId: string,
  ): WithdrawalRecord {
    requireSuperadmin(actor);
    const withdrawal = requiredWithdrawal(state, withdrawalId);
    const account = state.payoutAccounts.find(
      (item) => item.id === withdrawal.payoutAccountId,
    );
    if (!account?.verifiedAt || withdrawal.status !== "PENDING")
      throw new BackendProblem("CONFLICT", 409);
    withdrawal.status = "APPROVED";
    audit(state, actor.id, "withdrawal.approved", "withdrawal", withdrawal.id);
    return withdrawal;
  }

  processBatch(
    state: BackendState,
    limit = 25,
  ): { processed: number; skipped: number } {
    let processed = 0;
    let skipped = 0;
    for (const withdrawal of state.withdrawals
      .filter((item) => item.status === "APPROVED")
      .slice(0, Math.min(Math.max(limit, 1), 100))) {
      const account = state.payoutAccounts.find(
        (item) => item.id === withdrawal.payoutAccountId,
      );
      if (!account || account.provider !== "local") {
        skipped += 1;
        continue;
      }
      withdrawal.status = "COMPLETED";
      withdrawal.providerReference = `local:${withdrawal.id}`;
      processed += 1;
    }
    return { processed, skipped };
  }

  callback(
    state: BackendState,
    provider: string,
    rawBody: string,
    timestamp: string,
    signature: string,
    secret: string,
  ): { accepted: true; duplicate: boolean } {
    if (!secret || rawBody.length > 1_048_576)
      throw new BackendProblem("WEBHOOK_INVALID", 401);
    const seconds = Number(timestamp);
    if (
      !Number.isInteger(seconds) ||
      Math.abs(Date.now() / 1000 - seconds) > 300
    )
      throw new BackendProblem("WEBHOOK_INVALID", 401);
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const provided = Buffer.from(signature, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    if (
      provided.length !== expectedBytes.length ||
      !timingSafeEqual(provided, expectedBytes)
    )
      throw new BackendProblem("WEBHOOK_INVALID", 401);
    let payload: { id?: string; withdrawalId?: string; status?: string };
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      throw new BackendProblem("VALIDATION_FAILED", 422);
    }
    const eventKey = `payout:${provider}:${payload.id ?? ""}`;
    if (state.webhookEvents.includes(eventKey))
      return { accepted: true, duplicate: true };
    if (!payload.id || !payload.withdrawalId)
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const withdrawal = requiredWithdrawal(state, payload.withdrawalId);
    if (!["COMPLETED", "FAILED"].includes(payload.status ?? ""))
      throw new BackendProblem("VALIDATION_FAILED", 422);
    withdrawal.status = payload.status as "COMPLETED" | "FAILED";
    withdrawal.providerReference = `${provider}:${payload.id}`;
    state.webhookEvents.push(eventKey);
    audit(state, null, "withdrawal.callback", "withdrawal", withdrawal.id, {
      provider,
      status: withdrawal.status,
    });
    return { accepted: true, duplicate: false };
  }

  reconcile(
    state: BackendState,
    actor: PublicUser,
  ): { anomalies: string[]; checked: number } {
    requireSuperadmin(actor);
    const anomalies = state.withdrawals
      .filter((item) => item.status === "COMPLETED" && !item.providerReference)
      .map((item) => item.id);
    audit(
      state,
      actor.id,
      "withdrawal.reconciled",
      "withdrawal_batch",
      randomUUID(),
      { anomalies: String(anomalies.length) },
    );
    return { anomalies, checked: state.withdrawals.length };
  }
}

function requiredWithdrawal(
  state: BackendState,
  withdrawalId: string,
): WithdrawalRecord {
  const withdrawal = state.withdrawals.find(
    (candidate) => candidate.id === withdrawalId,
  );
  if (!withdrawal) throw new BackendProblem("NOT_FOUND", 404);
  return withdrawal;
}

function requireSuperadmin(actor: PublicUser): void {
  if (actor.role !== "SUPERADMIN") throw new BackendProblem("FORBIDDEN", 403);
}
