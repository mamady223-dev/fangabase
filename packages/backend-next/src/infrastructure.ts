import { now } from "./common.js";
import type { BackendState, OutboxRecord } from "./state.js";
import type { TransactionalStore } from "./store.js";
import { unseal } from "./crypto.js";
import { WithdrawalService } from "./withdrawals.js";

export interface DeliveryPort {
  deliver(message: {
    id: string;
    topic: string;
    ownerId: string;
    payload: unknown;
  }): Promise<void>;
}

export class LocalDeliveryPort implements DeliveryPort {
  readonly delivered: string[] = [];

  async deliver(message: { id: string }): Promise<void> {
    this.delivered.push(message.id);
  }
}

export class OutboxWorker {
  constructor(
    private readonly store: TransactionalStore,
    private readonly secret: string,
    private readonly delivery: DeliveryPort,
  ) {}

  async runOnce(limit = 25): Promise<{ sent: number; failed: number }> {
    const claimed = await this.store.transaction((state) => {
      const instant = now();
      const batch = state.outbox
        .filter(
          (message) =>
            (message.status === "PENDING" ||
              (message.status === "PROCESSING" &&
                Boolean(message.leaseUntil) &&
                message.leaseUntil! <= instant)) &&
            message.availableAt <= instant,
        )
        .slice(0, Math.min(Math.max(limit, 1), 100));
      const leaseUntil = new Date(Date.now() + 60_000).toISOString();
      for (const message of batch) {
        message.status = "PROCESSING";
        message.leaseUntil = leaseUntil;
      }
      return batch.map((message) => ({ ...message }));
    });
    let sent = 0;
    let failed = 0;
    for (const message of claimed) {
      try {
        await this.delivery.deliver({
          id: message.id,
          topic: message.topic,
          ownerId: message.ownerId,
          payload: JSON.parse(unseal(message.payloadCiphertext, this.secret)),
        });
        await this.finish(message.id, true);
        sent += 1;
      } catch {
        await this.finish(message.id, false);
        failed += 1;
      }
    }
    return { sent, failed };
  }

  private async finish(messageId: string, success: boolean): Promise<void> {
    await this.store.transaction((state) => {
      const message = state.outbox.find((item) => item.id === messageId);
      if (!message || message.status !== "PROCESSING") return;
      message.attempts += 1;
      message.leaseUntil = null;
      if (success) message.status = "SENT";
      else if (message.attempts >= 5) message.status = "DEAD";
      else {
        message.status = "PENDING";
        const delay = Math.min(3600, 2 ** message.attempts * 15);
        message.availableAt = new Date(Date.now() + delay * 1000).toISOString();
      }
    });
  }
}

export class Scheduler {
  constructor(
    private readonly store: TransactionalStore,
    private readonly outbox: OutboxWorker,
    private readonly withdrawals: WithdrawalService,
  ) {}

  async run(): Promise<{
    expiredSessions: number;
    expiredTokens: number;
    withdrawals: { processed: number; skipped: number };
    outbox: { sent: number; failed: number };
  }> {
    const cleanup = await this.store.transaction((state) => {
      const instant = now();
      const sessionCount = state.sessions.length;
      const tokenCount = state.oneTimeTokens.length;
      state.sessions = state.sessions.filter(
        (item) => !item.revokedAt && item.expiresAt > instant,
      );
      state.oneTimeTokens = state.oneTimeTokens.filter(
        (item) => !item.usedAt && item.expiresAt > instant,
      );
      const withdrawals = this.withdrawals.processBatch(state);
      return {
        expiredSessions: sessionCount - state.sessions.length,
        expiredTokens: tokenCount - state.oneTimeTokens.length,
        withdrawals,
      };
    });
    return { ...cleanup, outbox: await this.outbox.runOnce(50) };
  }
}

export function redactMetrics(state: BackendState) {
  const counts = (values: { status: string }[]) =>
    Object.fromEntries(
      [...new Set(values.map((item) => item.status))].map((status) => [
        status,
        values.filter((item) => item.status === status).length,
      ]),
    );
  return {
    sessionsActive: state.sessions.filter((item) => !item.revokedAt).length,
    outbox: counts(state.outbox),
    payments: counts(state.payments),
    withdrawals: counts(state.withdrawals),
  };
}

export function safeOutbox(message: OutboxRecord) {
  const { payloadCiphertext: _, ...safe } = message;
  return safe;
}
