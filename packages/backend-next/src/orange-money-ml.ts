import { BackendProblem } from "./common.js";
import { seal, unseal } from "./crypto.js";

export type OrangeMoneyMlConfiguration = {
  enabled: boolean;
  environment: "simulator" | "sandbox" | "production";
  country: "ML";
  currency: "XOF";
  oauthTokenUrl: string;
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  merchantAccount: string;
  merchantCode: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notificationUrl: string;
  timeoutSeconds: number;
};

export type OrangeCheckoutInput = {
  orderId: string;
  amountMinor: number;
  currency: "XOF";
};

export type OrangeNormalizedPayment = {
  reference: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "NEEDS_REVIEW";
  paymentUrl: string | null;
  amountMinor: number | null;
  currency: string | null;
  encryptedTokens?: string;
};

export interface OrangeMoneyMlGateway {
  oauth(
    configuration: OrangeMoneyMlConfiguration,
  ): Promise<{ accessToken: string; expiresIn: number }>;
  checkout(
    configuration: OrangeMoneyMlConfiguration,
    accessToken: string,
    input: OrangeCheckoutInput,
  ): Promise<Record<string, unknown>>;
  status(
    configuration: OrangeMoneyMlConfiguration,
    accessToken: string,
    reference: string,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

export class OrangeMoneyMlHttpGateway implements OrangeMoneyMlGateway {
  async oauth(configuration: OrangeMoneyMlConfiguration) {
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const response = await timedFetch(
      configuration.oauthTokenUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${configuration.clientId}:${configuration.clientSecret}`).toString("base64")}`,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
      configuration.timeoutSeconds,
    );
    const payload = await providerJson(response);
    if (typeof payload.access_token !== "string" || !payload.access_token)
      throw new BackendProblem("PAYMENT_PROVIDER_INVALID_RESPONSE", 502);
    return {
      accessToken: payload.access_token,
      expiresIn:
        typeof payload.expires_in === "number" ? payload.expires_in : 300,
    };
  }

  async checkout(
    configuration: OrangeMoneyMlConfiguration,
    accessToken: string,
    input: OrangeCheckoutInput,
  ) {
    const response = await timedFetch(
      `${configuration.apiBaseUrl.replace(/\/$/, "")}/webpayment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_key: configuration.merchantKey,
          merchant_account: configuration.merchantAccount,
          merchant_code: configuration.merchantCode,
          currency: input.currency,
          order_id: input.orderId,
          amount: input.amountMinor,
          return_url: configuration.returnUrl,
          cancel_url: configuration.cancelUrl,
          notif_url: configuration.notificationUrl,
          reference: input.orderId,
        }),
      },
      configuration.timeoutSeconds,
    );
    return providerJson(response);
  }

  async status(
    configuration: OrangeMoneyMlConfiguration,
    accessToken: string,
    reference: string,
    context: Record<string, unknown>,
  ) {
    const response = await timedFetch(
      `${configuration.apiBaseUrl.replace(/\/$/, "")}/transactionstatus`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_key: configuration.merchantKey,
          order_id: context.orderId ?? reference,
          amount: context.amountMinor,
          pay_token: context.payToken,
        }),
      },
      configuration.timeoutSeconds,
    );
    return providerJson(response);
  }
}

export class OrangeMoneyMlSimulator implements OrangeMoneyMlGateway {
  constructor(
    private readonly scenario:
      | "success"
      | "pending"
      | "failed"
      | "cancelled"
      | "timeout"
      | "unknown"
      | "outage" = "pending",
  ) {}

  async oauth() {
    return { accessToken: "simulator-token-not-a-secret", expiresIn: 120 };
  }

  async checkout(
    _configuration: OrangeMoneyMlConfiguration,
    _accessToken: string,
    input: OrangeCheckoutInput,
  ) {
    if (this.scenario === "timeout")
      throw new BackendProblem("PAYMENT_PROVIDER_TIMEOUT", 504);
    if (this.scenario === "outage")
      throw new BackendProblem("PAYMENT_PROVIDER_TEMPORARY", 503);
    return {
      status: this.scenario,
      reference: `sim-${input.orderId}`,
      order_id: input.orderId,
      payment_url: `https://orange-money-ml.simulator.invalid/checkout/${input.orderId}`,
      pay_token: `sim-pay-${input.orderId}`,
      notif_token: `sim-notif-${input.orderId}`,
      amount: input.amountMinor,
      currency: input.currency,
    };
  }

  async status(
    _configuration: OrangeMoneyMlConfiguration,
    _accessToken: string,
    reference: string,
    context: Record<string, unknown>,
  ) {
    return {
      status: this.scenario,
      reference,
      order_id: context.orderId,
      amount: context.amountMinor,
      currency: context.currency,
    };
  }
}

export class OrangeMoneyMlProvider {
  private cachedToken: { encrypted: string; expiresAt: number } | null = null;

  constructor(
    private readonly configuration: OrangeMoneyMlConfiguration,
    private readonly gateway: OrangeMoneyMlGateway,
    private readonly encryptionSecret: string,
  ) {}

  async checkout(input: OrangeCheckoutInput): Promise<OrangeNormalizedPayment> {
    this.assertConfigured();
    const response = await this.gateway.checkout(
      this.configuration,
      await this.token(),
      input,
    );
    const reference = firstString(response, ["reference", "order_id"]);
    const paymentUrl = firstString(response, [
      "payment_url",
      "paymentUrl",
      "url",
    ]);
    const tokens = {
      payToken: firstOptionalString(response, ["pay_token", "payToken"]),
      notifToken: firstOptionalString(response, ["notif_token", "notifToken"]),
    };
    return {
      reference,
      status: normalizeOrangeStatus(response.status),
      paymentUrl,
      amountMinor: input.amountMinor,
      currency: "XOF",
      encryptedTokens: seal(JSON.stringify(tokens), this.encryptionSecret),
    };
  }

  async status(
    reference: string,
    context: Record<string, unknown>,
  ): Promise<OrangeNormalizedPayment> {
    this.assertConfigured();
    const encrypted = context.encryptedTokens;
    const tokens =
      typeof encrypted === "string"
        ? (JSON.parse(unseal(encrypted, this.encryptionSecret)) as Record<
            string,
            unknown
          >)
        : {};
    const response = await withSafeRetry(async () =>
      this.gateway.status(this.configuration, await this.token(), reference, {
        ...context,
        ...tokens,
        encryptedTokens: undefined,
      }),
    );
    return {
      reference: firstOptionalString(response, ["reference"]) ?? reference,
      status: normalizeOrangeStatus(response.status),
      paymentUrl: null,
      amountMinor: typeof response.amount === "number" ? response.amount : null,
      currency:
        typeof response.currency === "string"
          ? response.currency.toUpperCase()
          : null,
    };
  }

  private assertConfigured() {
    if (!this.configuration.enabled)
      throw new BackendProblem("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
    if (this.configuration.environment === "simulator") return;
    for (const value of [
      this.configuration.oauthTokenUrl,
      this.configuration.apiBaseUrl,
      this.configuration.clientId,
      this.configuration.clientSecret,
      this.configuration.merchantAccount,
      this.configuration.merchantCode,
      this.configuration.merchantKey,
      this.configuration.returnUrl,
      this.configuration.cancelUrl,
      this.configuration.notificationUrl,
    ])
      if (!value)
        throw new BackendProblem("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
  }

  private async token() {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now())
      return unseal(this.cachedToken.encrypted, this.encryptionSecret);
    const result = await withSafeRetry(() =>
      this.gateway.oauth(this.configuration),
    );
    const margin = Math.min(60, Math.max(1, Math.floor(result.expiresIn / 10)));
    this.cachedToken = {
      encrypted: seal(result.accessToken, this.encryptionSecret),
      expiresAt: Date.now() + Math.max(1, result.expiresIn - margin) * 1000,
    };
    return result.accessToken;
  }
}

export function orangeMoneyMlConfiguration(
  environment: NodeJS.ProcessEnv,
): OrangeMoneyMlConfiguration {
  const mode = environment.ORANGE_MONEY_ENVIRONMENT;
  return {
    enabled: environment.ORANGE_MONEY_ENABLED === "true",
    environment:
      mode === "simulator" || mode === "production" ? mode : "sandbox",
    country: "ML",
    currency: "XOF",
    oauthTokenUrl: environment.ORANGE_MONEY_OAUTH_TOKEN_URL ?? "",
    apiBaseUrl: environment.ORANGE_MONEY_API_BASE_URL ?? "",
    clientId: environment.ORANGE_MONEY_CLIENT_ID ?? "",
    clientSecret: environment.ORANGE_MONEY_CLIENT_SECRET ?? "",
    merchantAccount: environment.ORANGE_MONEY_MERCHANT_ACCOUNT ?? "",
    merchantCode: environment.ORANGE_MONEY_MERCHANT_CODE ?? "",
    merchantKey: environment.ORANGE_MONEY_MERCHANT_KEY ?? "",
    returnUrl: environment.ORANGE_MONEY_RETURN_URL ?? "",
    cancelUrl: environment.ORANGE_MONEY_CANCEL_URL ?? "",
    notificationUrl: environment.ORANGE_MONEY_NOTIFICATION_URL ?? "",
    timeoutSeconds: Math.max(
      1,
      Number(environment.ORANGE_MONEY_HTTP_TIMEOUT_SECONDS ?? 15),
    ),
  };
}

function normalizeOrangeStatus(
  value: unknown,
): OrangeNormalizedPayment["status"] {
  switch (String(value ?? "").toUpperCase()) {
    case "SUCCESS":
    case "SUCCESSFUL":
    case "SUCCEEDED":
    case "PAID":
    case "OK":
      return "SUCCEEDED";
    case "FAILED":
    case "FAIL":
    case "ERROR":
      return "FAILED";
    case "CANCELLED":
    case "CANCELED":
    case "CANCEL":
    case "ABORTED":
      return "CANCELLED";
    case "EXPIRED":
      return "EXPIRED";
    case "PROCESSING":
    case "INITIATED":
      return "PROCESSING";
    case "":
    case "PENDING":
      return "PENDING";
    default:
      return "NEEDS_REVIEW";
  }
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutSeconds: number,
) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
  } catch {
    throw new BackendProblem("PAYMENT_PROVIDER_TIMEOUT", 504);
  }
}

async function providerJson(
  response: Response,
): Promise<Record<string, unknown>> {
  if (!response.ok)
    throw new BackendProblem(
      response.status >= 500
        ? "PAYMENT_PROVIDER_TEMPORARY"
        : "PAYMENT_PROVIDER_REJECTED",
      response.status >= 500 ? 503 : 502,
    );
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("invalid");
    return value as Record<string, unknown>;
  } catch {
    throw new BackendProblem("PAYMENT_PROVIDER_INVALID_RESPONSE", 502);
  }
}

function firstString(value: Record<string, unknown>, keys: string[]): string {
  const found = firstOptionalString(value, keys);
  if (!found)
    throw new BackendProblem("PAYMENT_PROVIDER_INVALID_RESPONSE", 502);
  return found;
}

function firstOptionalString(
  value: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys)
    if (typeof value[key] === "string" && value[key]) return value[key];
  return null;
}

async function withSafeRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === 1 ||
        !(error instanceof BackendProblem) ||
        !["PAYMENT_PROVIDER_TIMEOUT", "PAYMENT_PROVIDER_TEMPORARY"].includes(
          error.code,
        )
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
  throw new BackendProblem("PAYMENT_PROVIDER_TEMPORARY", 503);
}
