import { randomUUID } from "node:crypto";
import { ImmutableLedger } from "./finance.js";

export type WithdrawalStatus =
  | "REQUESTED"
  | "VERIFYING"
  | "APPROVED"
  | "SENT"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "RECONCILED";
export type Withdrawal = {
  id: string;
  ownerId: string;
  amountMinor: bigint;
  currency: "XOF";
  status: WithdrawalStatus;
  providerReference: string | null;
  createdAt: Date;
};
export interface PayoutPort {
  createPayout(
    withdrawal: Withdrawal,
    idempotencyKey: string,
  ): Promise<{
    reference: string;
    status: "PROCESSING" | "COMPLETED" | "FAILED";
  }>;
}
export class WithdrawalService {
  readonly withdrawals = new Map<string, Withdrawal>();
  #locked = new Set<string>();
  constructor(
    private readonly ledger: ImmutableLedger,
    private readonly payout: PayoutPort,
    private readonly minimum = 1000n,
    private readonly maximum = 1000000n,
  ) {}
  request(ownerId: string, amountMinor: bigint): Withdrawal {
    if (
      amountMinor < this.minimum ||
      amountMinor > this.maximum ||
      this.ledger.balance(ownerId, "XOF") < amountMinor
    )
      throw new Error("INSUFFICIENT_BALANCE");
    if (this.#locked.has(ownerId)) throw new Error("CONFLICT");
    this.#locked.add(ownerId);
    try {
      this.ledger.append({
        ownerId,
        amountMinor,
        currency: "XOF",
        kind: "RESERVE",
        reference: "withdrawal-reserve",
      });
      const item: Withdrawal = {
        id: randomUUID(),
        ownerId,
        amountMinor,
        currency: "XOF",
        status: "REQUESTED",
        providerReference: null,
        createdAt: new Date(),
      };
      this.withdrawals.set(item.id, item);
      return item;
    } finally {
      this.#locked.delete(ownerId);
    }
  }
  approve(id: string): void {
    const item = this.require(id);
    if (item.status !== "REQUESTED") throw new Error("CONFLICT");
    item.status = "VERIFYING";
    item.status = "APPROVED";
  }
  cancel(id: string): void {
    const item = this.require(id);
    if (
      item.status !== "REQUESTED" &&
      item.status !== "VERIFYING" &&
      item.status !== "APPROVED"
    )
      throw new Error("CONFLICT");
    item.status = "CANCELLED";
    this.ledger.append({
      ownerId: item.ownerId,
      amountMinor: item.amountMinor,
      currency: "XOF",
      kind: "RELEASE",
      reference: item.id,
    });
  }
  async process(id: string): Promise<void> {
    const item = this.require(id);
    if (item.status !== "APPROVED" && item.status !== "SENT")
      throw new Error("CONFLICT");
    item.status = "SENT";
    const result = await this.payout.createPayout(
      item,
      `withdrawal:${item.id}`,
    );
    item.providerReference = result.reference;
    item.status =
      result.status === "COMPLETED"
        ? "PAID"
        : result.status === "PROCESSING"
          ? "PENDING"
          : result.status;
    if (result.status === "FAILED")
      this.ledger.append({
        ownerId: item.ownerId,
        amountMinor: item.amountMinor,
        currency: "XOF",
        kind: "RELEASE",
        reference: item.id,
      });
  }
  private require(id: string): Withdrawal {
    const item = this.withdrawals.get(id);
    if (!item) throw new Error("NOT_FOUND");
    return item;
  }
}
