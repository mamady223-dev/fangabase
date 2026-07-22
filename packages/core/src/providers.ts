import type { ProviderResult } from "@fangabase/contracts";

export type Capability =
  | "ONE_TIME_PAYMENT"
  | "MOBILE_MONEY"
  | "HOSTED_CHECKOUT"
  | "REDIRECT"
  | "SYNCHRONOUS_CONFIRMATION"
  | "ASYNCHRONOUS_CONFIRMATION"
  | "STATUS"
  | "WEBHOOK"
  | "FULL_REFUND"
  | "PARTIAL_REFUND"
  | "PAYOUT"
  | "SUBSCRIPTION"
  | "PORTAL";
export type ProviderActivation =
  | "IMPLEMENTED_NEEDS_SANDBOX_UAT"
  | "NEEDS_PROVIDER_CONTRACT"
  | "DISABLED"
  | "UNSUPPORTED";
export interface ProviderDescriptor {
  readonly activation: ProviderActivation;
  readonly capabilities: ReadonlySet<Capability>;
  readonly currencies: readonly string[];
  readonly countries: readonly string[];
}
export interface PaymentProvider {
  readonly name: string;
  readonly descriptor: ProviderDescriptor;
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
    if (
      !provider ||
      provider.descriptor.activation !== "IMPLEMENTED_NEEDS_SANDBOX_UAT" ||
      !provider.descriptor.capabilities.has(capability)
    )
      throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
    return provider;
  }
  status(): {
    provider: string;
    activation: ProviderActivation;
    capabilities: Capability[];
  }[] {
    return [...this.#providers.values()].map((provider) => ({
      provider: provider.name,
      activation: provider.descriptor.activation,
      capabilities: [...provider.descriptor.capabilities],
    }));
  }
}

export class ContractSimulator implements PaymentProvider {
  readonly descriptor: ProviderDescriptor = {
    activation: "IMPLEMENTED_NEEDS_SANDBOX_UAT",
    capabilities: new Set<Capability>([
      "ONE_TIME_PAYMENT",
      "HOSTED_CHECKOUT",
      "REDIRECT",
      "ASYNCHRONOUS_CONFIRMATION",
      "STATUS",
      "WEBHOOK",
      "FULL_REFUND",
      "PARTIAL_REFUND",
    ]),
    currencies: ["XOF", "EUR", "USD"],
    countries: [],
  };
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
  monero: "DISABLED",
} as const satisfies Record<string, ProviderActivation>;
