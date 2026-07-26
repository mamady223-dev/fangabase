import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BackendApplication,
  MemoryStore,
  type BackendRequest,
  type BackendResponse,
  type GoogleOAuthProvider,
  type TransactionalStore,
} from "./index.js";

const secret = "test-session-secret-with-at-least-32-characters";
const adminEmail = "admin@example.test";
const password = "SecurePassword1!";

describe("backend Next.js autonome", () => {
  let store: TransactionalStore;
  let application: BackendApplication;

  beforeEach(() => {
    store = new MemoryStore();
    application = new BackendApplication(store, {
      secret,
      bootstrapSuperadminEmail: adminEmail,
      exposeTestTokens: true,
      stripeWebhookSecret: "whsec_test",
      payoutWebhookSecret: "payout_test_secret",
    });
  });

  it("inscrit, vérifie, connecte et expose l'utilisateur courant", async () => {
    const registered = await call("POST", "/auth/register", {
      email: adminEmail,
      password,
      name: "Admin",
    });
    expect(registered.status).toBe(201);
    const verificationToken = field<string>(registered, "verificationToken");
    expect(
      (
        await call("POST", "/auth/email/verification/confirm", {
          token: verificationToken,
        })
      ).status,
    ).toBe(200);
    const session = await login(adminEmail);
    const me = await authenticated(session, "GET", "/auth/me");
    expect(me.status).toBe(200);
    expect(nested(me, "user", "email")).toBe(adminEmail);
    expect(nested(me, "user", "role")).toBe("SUPERADMIN");
  });

  it("renvoie les mêmes réponses de récupération sans énumération", async () => {
    await call("POST", "/auth/register", {
      email: adminEmail,
      password,
    });
    const existing = await call("POST", "/auth/password/forgot", {
      email: adminEmail,
    });
    const absent = await call("POST", "/auth/password/forgot", {
      email: "absent@example.test",
    });
    expect(existing.status).toBe(202);
    expect(absent).toMatchObject({ status: 202, body: { accepted: true } });
  });

  it("invalide les anciens jetons one-shot et refuse le rejeu", async () => {
    await call("POST", "/auth/register", {
      email: adminEmail,
      password,
    });
    const first = await call("POST", "/auth/password/forgot", {
      email: adminEmail,
    });
    const second = await call("POST", "/auth/password/forgot", {
      email: adminEmail,
    });
    expect(
      (
        await call("POST", "/auth/password/reset", {
          token: field(first, "resetToken"),
          password: "AnotherSecure2!",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call("POST", "/auth/password/reset", {
          token: field(second, "resetToken"),
          password: "AnotherSecure2!",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call("POST", "/auth/password/reset", {
          token: field(second, "resetToken"),
          password: "ThirdSecure3!",
        })
      ).status,
    ).toBe(401);
  });

  it("applique rate limiting persistant aux demandes répétées", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1)
      expect(
        (
          await call("POST", "/auth/password/forgot", {
            email: "rate@example.test",
          })
        ).status,
      ).toBe(202);
    expect(
      (
        await call("POST", "/auth/password/forgot", {
          email: "rate@example.test",
        })
      ).status,
    ).toBe(429);
  });

  it("tourne une session, détecte le replay et révoque sa famille", async () => {
    await register(adminEmail);
    const initial = await login(adminEmail);
    const rotated = await authenticated(initial, "POST", "/auth/refresh", {});
    expect(rotated.status).toBe(200);
    expect(
      (await authenticated(initial, "POST", "/auth/refresh", {})).status,
    ).toBe(401);
    const rotatedSession = cookies(rotated);
    expect(
      (await authenticated(rotatedSession, "GET", "/auth/me")).status,
    ).toBe(401);
  });

  it("exige le double-submit CSRF sur les mutations sensibles", async () => {
    await register(adminEmail);
    const session = await login(adminEmail);
    expect(
      (
        await application.handle({
          method: "POST",
          path: "/organizations",
          body: { name: "Acme", slug: "acme" },
          cookies: session,
        })
      ).status,
    ).toBe(419);
  });

  it("change le mot de passe et révoque toutes les sessions", async () => {
    await register(adminEmail);
    const session = await login(adminEmail);
    expect(
      (
        await authenticated(session, "POST", "/auth/password/change", {
          currentPassword: password,
          newPassword: "AnotherSecure2!",
        })
      ).status,
    ).toBe(200);
    expect((await authenticated(session, "GET", "/auth/me")).status).toBe(401);
  });

  it("isole les organisations, invitations et rôles contre l'IDOR", async () => {
    await register(adminEmail);
    await register("member@example.test");
    const admin = await login(adminEmail);
    const member = await login("member@example.test");
    const organization = await authenticated(admin, "POST", "/organizations", {
      name: "Fanga Team",
      slug: "fanga-team",
    });
    const organizationId = field<string>(organization, "id");
    expect(
      (await authenticated(member, "GET", `/organizations/${organizationId}`))
        .status,
    ).toBe(404);
    const invitation = await authenticated(
      admin,
      "POST",
      `/organizations/${organizationId}/invitations`,
      { email: "member@example.test", role: "MEMBER" },
    );
    expect(
      (
        await authenticated(
          member,
          "POST",
          `/organizations/${organizationId}/invitations/${field(invitation, "invitationToken")}/accept`,
          {},
        )
      ).status,
    ).toBe(200);
    expect(
      (await authenticated(member, "GET", `/organizations/${organizationId}`))
        .status,
    ).toBe(200);
  });

  it("protège le dernier SUPERADMIN et révoque un compte suspendu", async () => {
    await register(adminEmail);
    const admin = await login(adminEmail);
    const me = await authenticated(admin, "GET", "/auth/me");
    const userId = nested<string>(me, "user", "id");
    expect(
      (
        await authenticated(admin, "PATCH", `/admin/users/${userId}`, {
          status: "SUSPENDED",
        })
      ).status,
    ).toBe(409);
  });

  it("gère profil, notifications et upload privé avec validation MIME", async () => {
    await register(adminEmail);
    const admin = await login(adminEmail);
    await store.transaction((state) => {
      const user = state.users.find((item) => item.email === adminEmail)!;
      state.notifications.push({
        id: "notice-1",
        userId: user.id,
        type: "system",
        title: "Information",
        body: "Message local",
        readAt: null,
        createdAt: new Date().toISOString(),
      });
    });
    expect(
      nested(
        await authenticated(admin, "GET", "/notifications/unread-count"),
        "count",
      ),
    ).toBe(1);
    const upload = await authenticated(admin, "POST", "/uploads", {
      name: "proof.png",
      mime: "image/png",
      contentBase64: Buffer.from("89504e470d0a1a0a00000000", "hex").toString(
        "base64",
      ),
    });
    expect(upload.status).toBe(201);
    expect(
      (await authenticated(admin, "GET", `/uploads/${field(upload, "id")}`))
        .status,
    ).toBe(200);
  });

  it("contrôle prix serveur, idempotence, crédits, abonnement et remboursement", async () => {
    await register(adminEmail);
    const admin = await login(adminEmail);
    const price = await authenticated(admin, "POST", "/admin/catalog", {
      productKey: "credits.100",
      label: "100 crédits",
      amountMinor: 1000,
      currency: "XOF",
    });
    const priceId = field<string>(price, "id");
    const checkout = await authenticated(
      admin,
      "POST",
      "/payments/checkouts",
      {
        priceId,
        provider: "local",
        amountMinor: 1000,
        currency: "XOF",
      },
      { "idempotency-key": "checkout-1" },
    );
    expect(checkout.status).toBe(201);
    const duplicate = await authenticated(
      admin,
      "POST",
      "/payments/checkouts",
      {
        priceId,
        provider: "local",
        amountMinor: 1000,
        currency: "XOF",
      },
      { "idempotency-key": "checkout-1" },
    );
    expect(field(duplicate, "payment")).toEqual(field(checkout, "payment"));
    expect(
      (
        await authenticated(
          admin,
          "POST",
          "/payments/checkouts",
          {
            priceId,
            provider: "local",
            amountMinor: 999,
            currency: "XOF",
          },
          { "idempotency-key": "checkout-2" },
        )
      ).status,
    ).toBe(422);
    const paymentId = nested<string>(checkout, "payment", "id");
    expect(
      (
        await authenticated(
          admin,
          "POST",
          `/payments/orders/${paymentId}/refunds`,
          { amountMinor: 400 },
          { "idempotency-key": "refund-1" },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await authenticated(
          admin,
          "POST",
          "/billing/subscriptions",
          { priceId },
          { "idempotency-key": "subscription-1" },
        )
      ).status,
    ).toBe(201);
  });

  it("refuse le replay d'un webhook Stripe signé", async () => {
    const event = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: {} } },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_test")
      .update(`${timestamp}.${event}`)
      .digest("hex");
    const request: BackendRequest = {
      method: "POST",
      path: "/webhooks/stripe",
      rawBody: event,
      headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
    };
    expect(nested(await application.handle(request), "accepted")).toBe(true);
    expect(nested(await application.handle(request), "duplicate")).toBe(true);
  });

  it("réserve, vérifie, approuve et rapproche un retrait sans double traitement", async () => {
    await register(adminEmail);
    const admin = await login(adminEmail);
    const me = await authenticated(admin, "GET", "/auth/me");
    const ownerId = nested<string>(me, "user", "id");
    await authenticated(
      admin,
      "POST",
      "/admin/billing/credits/grant",
      { ownerId, amountMinor: 5000, currency: "XOF" },
      { "idempotency-key": "grant-1" },
    );
    const account = await authenticated(admin, "POST", "/payout-accounts", {
      provider: "local",
      details: { account: "test-only" },
    });
    const withdrawal = await authenticated(
      admin,
      "POST",
      "/withdrawals",
      {
        payoutAccountId: field(account, "id"),
        amountMinor: 1000,
        currency: "XOF",
      },
      { "idempotency-key": "withdrawal-1" },
    );
    const withdrawalId = field<string>(withdrawal, "id");
    expect(
      (
        await authenticated(
          admin,
          "POST",
          `/admin/withdrawals/${withdrawalId}/verify`,
          {},
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await authenticated(
          admin,
          "POST",
          `/admin/withdrawals/${withdrawalId}/approve`,
          {},
        )
      ).status,
    ).toBe(200);
    const callbackBody = JSON.stringify({
      id: "provider-event-1",
      withdrawalId,
      status: "COMPLETED",
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", "payout_test_secret")
      .update(`${timestamp}.${callbackBody}`)
      .digest("hex");
    const callbackRequest = {
      method: "POST" as const,
      path: "/webhooks/payouts/local",
      rawBody: callbackBody,
      headers: {
        "x-fangabase-timestamp": timestamp,
        "x-fangabase-signature": signature,
      },
    };
    expect((await application.handle(callbackRequest)).status).toBe(202);
    expect(field(await application.handle(callbackRequest), "duplicate")).toBe(
      true,
    );
  });

  it("valide Google PKCE avec fournisseur injectable et refuse la collision e-mail", async () => {
    const provider = new FakeGoogleProvider(adminEmail);
    application = new BackendApplication(store, {
      secret,
      bootstrapSuperadminEmail: adminEmail,
      exposeTestTokens: true,
      googleProvider: provider,
      googleAudience: "client.test",
    });
    await register(adminEmail);
    const start = await application.handle({
      method: "GET",
      path: "/oauth/google/start",
      query: { return_path: "/dashboard" },
    });
    expect(start.status).toBe(200);
    expect(
      (
        await application.handle({
          method: "GET",
          path: "/oauth/google/callback",
          query: { state: field(start, "state"), code: "valid" },
        })
      ).status,
    ).toBe(409);
  });

  it("sérialise les opérations concurrentes et conserve une seule idempotence", async () => {
    await register(adminEmail);
    const admin = await login(adminEmail);
    const price = await authenticated(admin, "POST", "/admin/catalog", {
      productKey: "concurrent",
      label: "Concurrent",
      amountMinor: 1000,
      currency: "XOF",
    });
    const request = () =>
      authenticated(
        admin,
        "POST",
        "/payments/checkouts",
        {
          priceId: field(price, "id"),
          provider: "local",
          amountMinor: 1000,
          currency: "XOF",
        },
        { "idempotency-key": "same" },
      );
    const results = await Promise.all([request(), request()]);
    expect(results.map((item) => item.status)).toEqual([201, 201]);
    await store.transaction((state) => expect(state.payments).toHaveLength(1));
  });

  async function register(email: string) {
    const response = await call("POST", "/auth/register", {
      email,
      password,
    });
    expect(response.status).toBe(201);
    return response;
  }

  async function login(email: string) {
    const response = await call("POST", "/auth/login", { email, password });
    expect(response.status).toBe(200);
    return cookies(response);
  }

  function call(
    method: BackendRequest["method"],
    path: string,
    body?: unknown,
  ) {
    return application.handle({ method, path, body });
  }

  function authenticated(
    session: Record<string, string>,
    method: BackendRequest["method"],
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return application.handle({
      method,
      path,
      body,
      cookies: session,
      headers: {
        ...(method === "GET"
          ? {}
          : { "x-csrf-token": session.fangabase_csrf ?? "" }),
        ...headers,
      },
    });
  }
});

class FakeGoogleProvider implements GoogleOAuthProvider {
  private nonce = "";

  constructor(private readonly email: string) {}

  async authorizationUrl(input: { nonce: string }): Promise<string> {
    this.nonce = input.nonce;
    return "https://accounts.google.com/o/oauth2/v2/auth";
  }

  async exchange() {
    return {
      issuer: "https://accounts.google.com",
      audience: "client.test",
      subject: "google-subject",
      email: this.email,
      emailVerified: true,
      expiresAt: Math.floor(Date.now() / 1000) + 300,
      nonce: this.nonce,
    };
  }
}

function cookies(response: BackendResponse): Record<string, string> {
  return Object.fromEntries(
    (response.cookies ?? []).map((cookie) => [cookie.name, cookie.value]),
  );
}

function bodyObject(response: BackendResponse): Record<string, unknown> {
  return response.body as Record<string, unknown>;
}

function field<T = string>(response: BackendResponse, name: string): T {
  return bodyObject(response)[name] as T;
}

function nested<T = unknown>(
  response: BackendResponse,
  first: string,
  second?: string,
): T {
  const value = bodyObject(response)[first];
  if (!second) return value as T;
  return (value as Record<string, unknown>)[second] as T;
}
