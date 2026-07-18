import type { ProviderResult } from "@fangabase/contracts";

export type Capability =
  | "PAYMENT"
  | "STATUS"
  | "WEBHOOK"
  | "REFUND"
  | "PAYOUT"
  | "SUBSCRIPTION"
  | "PORTAL";
export interface PaymentProvider {
  readonly name: string;
  readonly capabilities: ReadonlySet<Capability>;
  createPayment(
    input: {
      orderId: string;
      amountMinor: bigint;
      currency: string;
      returnUrl: string;
    },
    idempotencyKey: string,
  ): Promise<ProviderResult>;
  getPaymentStatus(reference: string): Promise<ProviderResult>;
  refund?(
    reference: string,
    amountMinor: bigint,
    idempotencyKey: string,
  ): Promise<ProviderResult>;
}
export class ProviderRegistry {
  #providers = new Map<string, PaymentProvider>();
  register(provider: PaymentProvider): void {
    if (this.#providers.has(provider.name)) throw new Error("CONFLICT");
    this.#providers.set(provider.name, provider);
  }
  require(name: string, capability: Capability): PaymentProvider {
    const provider = this.#providers.get(name);
    if (!provider || !provider.capabilities.has(capability))
      throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
    return provider;
  }
  status(): { provider: string; capabilities: Capability[] }[] {
    return [...this.#providers.values()].map((provider) => ({
      provider: provider.name,
      capabilities: [...provider.capabilities],
    }));
  }
}

export class ContractSimulator implements PaymentProvider {
  readonly capabilities = new Set<Capability>([
    "PAYMENT",
    "STATUS",
    "WEBHOOK",
    "REFUND",
  ]);
  constructor(readonly name: string) {}
  async createPayment(input: {
    orderId: string;
    amountMinor: bigint;
    currency: string;
    returnUrl: string;
  }): Promise<ProviderResult> {
    const url = new URL(input.returnUrl);
    if (!url.protocol.startsWith("http") || url.hostname === "localhost")
      throw new Error("VALIDATION_FAILED");
    return {
      provider: this.name,
      providerReference: `${this.name}_${input.orderId}`,
      status: "PENDING",
      paymentUrl: `https://sandbox.example.invalid/pay/${input.orderId}`,
      rawStatus: "pending",
      safeMetadata: {},
      capability: "PAYMENT",
    };
  }
  async getPaymentStatus(reference: string): Promise<ProviderResult> {
    return {
      provider: this.name,
      providerReference: reference,
      status: "PENDING",
      rawStatus: "pending",
      safeMetadata: {},
      capability: "STATUS",
    };
  }
  async refund(reference: string): Promise<ProviderResult> {
    return {
      provider: this.name,
      providerReference: reference,
      status: "REFUNDED",
      rawStatus: "refunded",
      safeMetadata: {},
      capability: "REFUND",
    };
  }
}

export const providerActivation = {
  stripe: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
  fedapay: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
  cinetpay: "NEEDS_PROVIDER_CONTRACT",
  paydunya: "NEEDS_PROVIDER_CONTRACT",
  orange_money: "NEEDS_PROVIDER_CONTRACT",
  bictorys: "NEEDS_PROVIDER_CONTRACT",
  paytech: "NEEDS_PROVIDER_CONTRACT",
  moneroo: "NEEDS_PROVIDER_CONTRACT",
  monero: "DISABLED_BY_DEFAULT",
} as const;
