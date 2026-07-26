import { describe, expect, it } from "vitest";
import {
  OrangeMoneyMlProvider,
  OrangeMoneyMlSimulator,
  orangeMoneyMlConfiguration,
  type OrangeMoneyMlConfiguration,
  type OrangeMoneyMlGateway,
} from "./orange-money-ml.js";
import { BackendProblem } from "./common.js";
import { PaymentService } from "./payments.js";
import { emptyState } from "./state.js";

const secret = "orange-money-ml-test-secret-at-least-32-characters";
const simulatorConfiguration: OrangeMoneyMlConfiguration = {
  enabled: true,
  environment: "simulator",
  country: "ML",
  currency: "XOF",
  oauthTokenUrl: "",
  apiBaseUrl: "",
  clientId: "",
  clientSecret: "",
  merchantAccount: "",
  merchantCode: "",
  merchantKey: "",
  returnUrl: "",
  cancelUrl: "",
  notificationUrl: "",
  timeoutSeconds: 1,
};

describe("Orange Money Mali Next.js", () => {
  it("reste désactivé et sans secrets par défaut", async () => {
    const provider = new OrangeMoneyMlProvider(
      orangeMoneyMlConfiguration({}),
      new OrangeMoneyMlSimulator(),
      secret,
    );
    await expect(
      provider.checkout({
        orderId: "order-1",
        amountMinor: 100,
        currency: "XOF",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_NOT_CONFIGURED" });
  });

  it.each([
    ["success", "SUCCEEDED"],
    ["pending", "PENDING"],
    ["failed", "FAILED"],
    ["cancelled", "CANCELLED"],
    ["unknown", "NEEDS_REVIEW"],
  ] as const)("normalise le scénario %s", async (scenario, expected) => {
    const provider = new OrangeMoneyMlProvider(
      simulatorConfiguration,
      new OrangeMoneyMlSimulator(scenario),
      secret,
    );
    const payment = await provider.checkout({
      orderId: `order-${scenario}`,
      amountMinor: 2500,
      currency: "XOF",
    });
    expect(payment.status).toBe(expected);
    expect(payment.paymentUrl).toMatch(
      /^https:\/\/orange-money-ml\.simulator\.invalid/,
    );
    expect(payment.encryptedTokens).not.toContain("sim-pay");
    expect(JSON.stringify(payment)).not.toContain("merchantKey");
  });

  it("traite le timeout ambigu sans créer une seconde opération", async () => {
    const provider = new OrangeMoneyMlProvider(
      simulatorConfiguration,
      new OrangeMoneyMlSimulator("timeout"),
      secret,
    );
    await expect(
      provider.checkout({
        orderId: "order-timeout",
        amountMinor: 500,
        currency: "XOF",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_TIMEOUT" });
  });

  it("respecte expires_in et réutilise le token OAuth chiffré en mémoire", async () => {
    let oauthCalls = 0;
    const gateway: OrangeMoneyMlGateway = {
      async oauth() {
        oauthCalls += 1;
        return { accessToken: "oauth-test-value", expiresIn: 3600 };
      },
      async checkout(_configuration, _accessToken, input) {
        return {
          status: "PENDING",
          reference: input.orderId,
          payment_url: `https://orange-money-ml.simulator.invalid/${input.orderId}`,
        };
      },
      async status() {
        return { status: "PENDING" };
      },
    };
    const provider = new OrangeMoneyMlProvider(
      simulatorConfiguration,
      gateway,
      secret,
    );
    await provider.checkout({
      orderId: "one",
      amountMinor: 100,
      currency: "XOF",
    });
    await provider.checkout({
      orderId: "two",
      amountMinor: 100,
      currency: "XOF",
    });
    expect(oauthCalls).toBe(1);
  });

  it("exige toutes les variables contractuelles hors simulateur", async () => {
    const provider = new OrangeMoneyMlProvider(
      { ...simulatorConfiguration, environment: "sandbox" },
      new OrangeMoneyMlSimulator(),
      secret,
    );
    await expect(
      provider.checkout({
        orderId: "order-2",
        amountMinor: 100,
        currency: "XOF",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_NOT_CONFIGURED" });
  });

  it("propage un refus OAuth sous un code stable sans exposer de secret", async () => {
    const gateway: OrangeMoneyMlGateway = {
      async oauth() {
        throw new BackendProblem("PAYMENT_PROVIDER_REJECTED", 502);
      },
      async checkout() {
        return {};
      },
      async status() {
        return {};
      },
    };
    const provider = new OrangeMoneyMlProvider(
      simulatorConfiguration,
      gateway,
      secret,
    );
    await expect(
      provider.checkout({
        orderId: "oauth-refused",
        amountMinor: 100,
        currency: "XOF",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_REJECTED" });
  });

  it.each([
    ["amount", 999, "XOF"],
    ["currency", 1000, "EUR"],
  ] as const)(
    "place en revue une divergence de %s et déduplique la notification",
    async (_kind, amount, currency) => {
      const gateway: OrangeMoneyMlGateway = {
        async oauth() {
          return { accessToken: "oauth-test-value", expiresIn: 300 };
        },
        async checkout() {
          return {};
        },
        async status(_configuration, _token, reference) {
          return { status: "SUCCESS", reference, amount, currency };
        },
      };
      const provider = new OrangeMoneyMlProvider(
        simulatorConfiguration,
        gateway,
        secret,
      );
      const service = new PaymentService(secret, provider);
      const state = emptyState();
      state.payments.push({
        id: "orange-order",
        ownerId: "owner",
        priceId: "price",
        provider: "orange_money_ml",
        providerReference: "orange-reference",
        safeMetadata: {
          orderId: "orange-order",
          amountMinor: 1000,
          currency: "XOF",
        },
        amountMinor: 1000,
        currency: "XOF",
        status: "PENDING",
        refundedMinor: 0,
        createdAt: new Date().toISOString(),
      });
      const raw = JSON.stringify({ order_id: "orange-order" });
      expect(await service.orangeMoneyMlWebhook(state, raw)).toMatchObject({
        status: "NEEDS_REVIEW",
        duplicate: false,
      });
      expect(await service.orangeMoneyMlWebhook(state, raw)).toMatchObject({
        duplicate: true,
      });
      expect(state.audit.at(-1)?.action).toBe("payment.provider_mismatch");
    },
  );
});
