import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BackendApplication,
  MemoryStore,
  OrangeMoneyMlProvider,
  OrangeMoneyMlSimulator,
  PostgresStore,
  type TransactionalStore,
} from "@fangabase/backend-next";
import scenarios from "../../contracts/test-cases/behavioral-conformance.json" with { type: "json" };
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Flavor = "next" | "laravel";
type Result = {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;
};

class Client {
  private readonly cookies = new Map<string, string>();
  constructor(
    readonly flavor: Flavor,
    private readonly origin: string,
  ) {}

  async request(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<Result> {
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-fangabase-conformance": "1",
      ...extraHeaders,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.cookies.size)
      headers.cookie = [...this.cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    let response: Response;
    try {
      response = await fetch(`${this.origin}/api${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      const diagnostics =
        this.flavor === "laravel" ? `\n${laravelFailure()}` : "";
      throw new Error(
        `${method} ${path}: ${error instanceof Error ? error.message : String(error)}${diagnostics}`,
        { cause: error },
      );
    }
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";", 1);
      const separator = pair!.indexOf("=");
      this.cookies.set(pair!.slice(0, separator), pair!.slice(separator + 1));
    }
    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
      headers: response.headers,
    };
  }

  csrf(): string {
    return this.cookies.get("fangabase_csrf") ?? "";
  }

  mutate(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return this.request(method, path, body, {
      "x-csrf-token": this.csrf(),
      ...headers,
    });
  }
}

const root = resolve(import.meta.dirname, "../../..");
const sqlite = resolve(root, ".tmp/conformance.sqlite");
let laravel: ChildProcess;
let laravelLogs = "";
let nextServer: Server;
let laravelOrigin = "";
let nextOrigin = "";
let activeNext: BackendApplication;
let nextStore: TransactionalStore;

beforeAll(async () => {
  mkdirSync(resolve(root, ".tmp"), { recursive: true });
  writeFileSync(sqlite, "");
  const env = {
    ...process.env,
    APP_ENV: "testing",
    APP_KEY: "base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    DB_CONNECTION: "sqlite",
    DB_DATABASE: sqlite,
    FANGABASE_BOOTSTRAP_SUPERADMIN_EMAIL: "admin-laravel@example.test",
    CORS_ORIGINS: "http://student.example.test",
    CACHE_STORE: "array",
    STRIPE_WEBHOOK_SECRET: "conformance-stripe-secret",
    ORANGE_MONEY_ENABLED: "true",
    ORANGE_MONEY_ENVIRONMENT: "simulator",
    ORANGE_MONEY_SIMULATOR_SCENARIO: "success",
  };
  const migrated = spawnSync("php", ["artisan", "migrate:fresh", "--force"], {
    cwd: resolve(root, "apps/server"),
    env,
    encoding: "utf8",
  });
  if (migrated.status !== 0)
    throw new Error(`LARAVEL_MIGRATION_FAILED:${migrated.stderr}`);
  const laravelPort = await availablePort();
  laravelOrigin = `http://127.0.0.1:${laravelPort}`;
  laravel = spawn(
    "php",
    [
      "artisan",
      "serve",
      "--host=127.0.0.1",
      `--port=${laravelPort}`,
      "--tries=1",
      "--no-reload",
      "--no-ansi",
    ],
    {
      cwd: resolve(root, "apps/server"),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  captureLaravelOutput(laravel.stdout);
  captureLaravelOutput(laravel.stderr);
  await ready(`${laravelOrigin}/api/health`, () => laravelFailure());

  nextStore = process.env.DATABASE_URL
    ? new PostgresStore(
        process.env.DATABASE_URL,
        `conformance-${Date.now()}`,
        4,
      )
    : new MemoryStore();
  activeNext = new BackendApplication(nextStore, {
    secret: "conformance-session-secret-at-least-32-characters",
    exposeTestTokens: true,
    bootstrapSuperadminEmail: "admin-next@example.test",
    stripeWebhookSecret: "conformance-stripe-secret",
    payoutWebhookSecret: "conformance-payout-secret",
    orangeMoneyMlProvider: new OrangeMoneyMlProvider(
      {
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
      },
      new OrangeMoneyMlSimulator("success"),
      "conformance-session-secret-at-least-32-characters",
    ),
  });
  nextServer = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const headers = Object.fromEntries(
      Object.entries(request.headers).flatMap(([key, value]) =>
        value === undefined
          ? []
          : [[key, Array.isArray(value) ? value.join(",") : value]],
      ),
    );
    const cookies = Object.fromEntries(
      (headers.cookie ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const separator = part.indexOf("=");
          return [part.slice(0, separator), part.slice(separator + 1)];
        }),
    );
    const result = await activeNext.handle({
      method: request.method as "GET" | "POST" | "PATCH" | "DELETE",
      path: url.pathname.replace(/^\/api/, "") || "/",
      headers,
      cookies,
      query: Object.fromEntries(url.searchParams),
      rawBody,
      body: rawBody ? JSON.parse(rawBody) : undefined,
    });
    response.statusCode = result.status;
    response.setHeader("content-type", "application/json");
    for (const [name, value] of Object.entries(result.headers ?? {}))
      response.setHeader(name, String(value));
    if (headers.origin === "http://student.example.test") {
      response.setHeader("access-control-allow-origin", headers.origin);
      response.setHeader("access-control-allow-credentials", "true");
    }
    for (const cookie of result.cookies ?? [])
      response.appendHeader(
        "set-cookie",
        `${cookie.name}=${cookie.value}; Path=/; HttpOnly; SameSite=${cookie.sameSite}`,
      );
    response.end(JSON.stringify(result.body));
  });
  await new Promise<void>((resolveListen) =>
    nextServer.listen(0, "127.0.0.1", resolveListen),
  );
  const address = nextServer.address();
  if (!address || typeof address === "string")
    throw new Error("NEXT_SERVER_FAILED");
  nextOrigin = `http://127.0.0.1:${address.port}`;
}, 30_000);

afterAll(async () => {
  laravel?.kill();
  if (nextServer)
    await new Promise<void>((resolveClose) =>
      nextServer.close(() => resolveClose()),
    );
  await nextStore?.close();
});

describe.each([
  ["laravel", () => laravelOrigin],
  ["next", () => nextOrigin],
] as const)("conformité HTTP %s", (flavor, origin) => {
  it("exécute le référentiel comportemental partagé sur une base isolée", async () => {
    const covered = await runBehavioralSuite(flavor, origin());
    expect([...covered].sort()).toEqual([...scenarios].sort());
  }, 60_000);
});

async function runBehavioralSuite(
  flavor: Flavor,
  origin: string,
): Promise<Set<string>> {
  const covered = new Set<string>();
  const email = `admin-${flavor}@example.test`;
  const password = "SecurePassword1!";
  const client = new Client(flavor, origin);
  const registration = await client.request("POST", "/auth/register", {
    email,
    password,
    name: "Admin",
  });
  expect(registration.status, JSON.stringify(registration.body)).toBe(201);
  mark(covered, "registration");
  const verification = await client.request(
    "POST",
    "/auth/email/verification/request",
    { email },
  );
  expect(verification.status).toBe(202);
  const verificationToken = String(verification.body.verificationToken);
  expect(
    (
      await client.request("POST", "/auth/email/verification/confirm", {
        token: verificationToken,
      })
    ).status,
  ).toBe(200);
  mark(covered, "email_verification");

  expect(
    (await client.request("POST", "/auth/login", { email, password })).status,
  ).toBe(200);
  mark(covered, "login");
  expect((await client.request("GET", "/auth/me")).status).toBe(200);
  mark(covered, "current_user");

  const csrfFailure = await client.request("POST", "/auth/logout", {});
  expect(csrfFailure.status).toBe(419);
  expect(errorCode(csrfFailure)).toBe("CSRF_INVALID");
  mark(covered, "csrf", "error_codes");

  const forgot = await client.request("POST", "/auth/password/forgot", {
    email,
  });
  expect(forgot.status).toBe(202);
  const resetToken = String(forgot.body.resetToken);
  expect(
    (
      await client.request("POST", "/auth/password/reset", {
        token: resetToken,
        password: "ResetPassword2!",
      })
    ).status,
  ).toBe(200);
  mark(covered, "password_forgot_reset");
  await client.request("POST", "/auth/login", {
    email,
    password: "ResetPassword2!",
  });
  expect(
    (
      await client.mutate("POST", "/auth/password/change", {
        current_password: "ResetPassword2!",
        currentPassword: "ResetPassword2!",
        new_password: "ChangedPassword3!",
        newPassword: "ChangedPassword3!",
      })
    ).status,
  ).toBe(200);
  mark(covered, "password_change");
  await client.request("POST", "/auth/login", {
    email,
    password: "ChangedPassword3!",
  });
  expect((await client.mutate("POST", "/auth/refresh", {})).status).toBe(200);
  expect((await client.mutate("POST", "/auth/logout-all", {})).status).toBe(
    200,
  );
  mark(covered, "session_rotation_revocation");
  await client.request("POST", "/auth/login", {
    email,
    password: "ChangedPassword3!",
  });

  const organization = await client.mutate("POST", "/organizations", {
    name: "Conformance",
    slug: `conformance-${flavor}`,
  });
  expect(organization.status).toBe(201);
  const organizationId = String(
    (organization.body.organization as Record<string, unknown> | undefined)
      ?.id ?? organization.body.id,
  );
  mark(covered, "organizations");

  const guestEmail = `guest-${flavor}@example.test`;
  const guest = new Client(flavor, origin);
  const guestRegistration = await guest.request("POST", "/auth/register", {
    email: guestEmail,
    password,
  });
  const guestId = String(
    (guestRegistration.body.user as Record<string, unknown> | undefined)?.id,
  );
  const guestVerification = await guest.request(
    "POST",
    "/auth/email/verification/request",
    { email: guestEmail },
  );
  await guest.request("POST", "/auth/email/verification/confirm", {
    token: String(guestVerification.body.verificationToken),
  });
  await guest.request("POST", "/auth/login", { email: guestEmail, password });
  expect(
    (await guest.request("GET", `/organizations/${organizationId}`)).status,
  ).toBe(404);
  mark(covered, "anti_idor");
  const invitation = await client.mutate(
    "POST",
    `/organizations/${organizationId}/invitations`,
    { email: guestEmail, role: "MEMBER" },
  );
  expect(invitation.status).toBe(202);
  const invitationToken = String(
    invitation.body.token ?? invitation.body.invitationToken,
  );
  expect(
    (
      await guest.mutate(
        "POST",
        `/organizations/${organizationId}/invitations/${invitationToken}/accept`,
        {},
      )
    ).status,
  ).toBe(200);
  mark(covered, "invitations", "roles");

  expect((await client.request("GET", "/notifications")).status).toBe(200);
  mark(covered, "notifications");
  expect((await client.request("GET", "/admin/outbox")).status).toBe(200);
  mark(covered, "outbox");
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  expect(
    (
      await client.mutate(
        "POST",
        flavor === "laravel" ? "/files" : "/uploads",
        {
          name: "pixel.png",
          mime: "image/png",
          content_base64: png,
          contentBase64: png,
        },
      )
    ).status,
  ).toBe(201);
  mark(covered, "uploads");

  const price = await client.mutate(
    "POST",
    "/admin/catalog",
    flavor === "laravel"
      ? {
          slug: `credits-${flavor}`,
          name: "Credits",
          description: null,
          purchase_mode: "CREDITS",
          plan_slug: `plan-${flavor}`,
          plan_name: "Plan",
          amount_minor: 1000,
          currency: "XOF",
          interval: "ONE_TIME",
          included_credits: 100,
          features: ["credits"],
          terms_version: 1,
        }
      : {
          productKey: "credits.100",
          label: "100 credits",
          amountMinor: 1000,
          currency: "XOF",
        },
  );
  expect(price.status).toBe(201);
  const priceId = String(
    (price.body.price as Record<string, unknown> | undefined)?.id ??
      price.body.id ??
      price.body.priceId,
  );
  mark(covered, "catalog");

  const me = await client.request("GET", "/auth/me");
  const userId = String(
    (me.body.user as Record<string, unknown> | undefined)?.id,
  );
  const grant = await client.mutate(
    "POST",
    "/admin/billing/credits/grant",
    flavor === "laravel"
      ? {
          owner_type: "USER",
          owner_id: userId,
          quantity: 5000,
          reason: "Conformance grant",
          expires_at: null,
        }
      : {
          ownerId: userId,
          amountMinor: 5000,
          currency: "XOF",
        },
    { "idempotency-key": "grant-conformance" },
  );
  expect(grant.status).toBe(201);
  expect((await client.request("GET", "/billing/credits")).status).toBe(200);
  mark(covered, "credits");
  expect((await client.request("GET", "/billing/entitlements")).status).toBe(
    200,
  );
  mark(covered, "entitlements");

  const checkoutBody =
    flavor === "laravel"
      ? {
          price_id: priceId,
          provider: "local",
          purpose: "ONE_TIME",
          return_path: "/billing",
        }
      : {
          priceId,
          provider: "local",
          amountMinor: 1000,
          currency: "XOF",
        };
  const checkout = await client.mutate(
    "POST",
    "/payments/checkouts",
    checkoutBody,
    { "idempotency-key": "checkout-conformance" },
  );
  expect(checkout.status).toBe(201);
  const duplicate = await client.mutate(
    "POST",
    "/payments/checkouts",
    checkoutBody,
    { "idempotency-key": "checkout-conformance" },
  );
  expect(duplicate.status).toBe(201);
  mark(covered, "local_payment", "idempotency");
  const orangeCheckout = await client.mutate(
    "POST",
    "/payments/checkouts",
    flavor === "laravel"
      ? {
          price_id: priceId,
          provider: "orange_money_ml",
          purpose: "ONE_TIME",
          return_path: "/billing",
        }
      : {
          priceId,
          provider: "orange_money_ml",
        },
    { "idempotency-key": "orange-money-ml-conformance" },
  );
  expect(orangeCheckout.status).toBe(201);
  const orangePayload = JSON.stringify(orangeCheckout.body);
  expect(orangePayload).toContain("https://orange-money-ml.simulator.invalid/");
  expect(orangePayload).not.toMatch(
    /client_secret|merchant_key|pay_token|notif_token|sim-pay-|sim-notif-/,
  );
  const orangeOrderId = String(
    orangeCheckout.body.order_id ??
      (orangeCheckout.body.payment as Record<string, unknown> | undefined)?.id,
  );
  expect(
    (
      await client.request("POST", "/webhooks/orange-money-ml", {
        order_id: orangeOrderId,
      })
    ).status,
  ).toBe(202);
  expect(
    (
      await client.request("POST", "/webhooks/orange-money-ml", {
        order_id: orangeOrderId,
      })
    ).status,
  ).toBe(202);
  mark(covered, "orange_money_ml");
  const orderId = String(
    checkout.body.order_id ??
      checkout.body.id ??
      (checkout.body.payment as Record<string, unknown> | undefined)?.id,
  );
  const refund = await client.mutate(
    "POST",
    `/payments/orders/${orderId}/refunds`,
    flavor === "laravel"
      ? { amount_minor: 500, reason: "Conformance" }
      : { amountMinor: 500, reason: "Conformance" },
    { "idempotency-key": "refund-conformance" },
  );
  expect([200, 202]).toContain(refund.status);
  mark(covered, "refund");

  expect((await client.request("GET", "/billing/subscription")).status).toBe(
    200,
  );
  mark(covered, "subscriptions");
  const account = await client.mutate(
    "POST",
    "/payout-accounts",
    flavor === "laravel"
      ? {
          provider: "local",
          country: "ML",
          currency: "XOF",
          destination: { account: "conformance-only" },
        }
      : {
          provider: "local",
          details: { account: "conformance-only" },
        },
  );
  expect(account.status).toBe(201);
  const accountId = String(account.body.id);
  if (flavor === "laravel") {
    expect(
      (
        await client.mutate("PATCH", `/admin/payout-accounts/${accountId}`, {
          status: "VERIFIED",
          reason: "Conformance verification",
        })
      ).status,
    ).toBe(200);
  }
  const withdrawal = await client.mutate(
    "POST",
    "/withdrawals",
    flavor === "laravel"
      ? {
          payout_account_id: accountId,
          amount_minor: 999999,
          currency: "XOF",
        }
      : { payoutAccountId: accountId, amountMinor: 999999, currency: "XOF" },
    { "idempotency-key": "withdrawal-conformance" },
  );
  expect(withdrawal.status).toBe(409);
  mark(covered, "withdrawal");
  expect(
    (
      await client.mutate("POST", "/admin/reconciliation/withdrawals", {
        provider: "local",
      })
    ).status,
  ).toBe(200);
  mark(covered, "reconciliation");

  expect(
    (
      await client.mutate("PATCH", `/admin/users/${userId}`, {
        status: "SUSPENDED",
        reason: "Conformance last administrator protection",
      })
    ).status,
  ).toBe(409);
  mark(covered, "last_superadmin");
  expect(
    (
      await client.mutate("PATCH", `/admin/users/${guestId}`, {
        status: "SUSPENDED",
        reason: "Conformance suspension",
      })
    ).status,
  ).toBe(200);
  expect((await guest.request("GET", "/auth/me")).status).toBe(403);
  mark(covered, "suspension");

  const originResponse = await client.request("GET", "/health", undefined, {
    origin: "http://student.example.test",
  });
  expect(originResponse.headers.get("access-control-allow-origin")).toBe(
    "http://student.example.test",
  );
  mark(covered, "cors");

  const timestamp = Math.floor(Date.now() / 1000);
  const webhookBody =
    flavor === "laravel"
      ? {
          event_id: `evt-${flavor}-duplicate`,
          order_id: orderId,
          amount_minor: 1000,
          currency: "XOF",
        }
      : {
          id: `evt-${flavor}-duplicate`,
          type: "checkout.session.completed",
          data: {
            object: {
              metadata: { payment_id: orderId },
            },
          },
        };
  const rawWebhook = JSON.stringify(webhookBody);
  const webhookHeaders =
    flavor === "laravel"
      ? {}
      : {
          "stripe-signature": `t=${timestamp},v1=${createHmac("sha256", "conformance-stripe-secret").update(`${timestamp}.${rawWebhook}`).digest("hex")}`,
        };
  const webhookPath =
    flavor === "laravel" ? "/webhooks/local" : "/webhooks/stripe";
  expect(
    (await client.request("POST", webhookPath, webhookBody, webhookHeaders))
      .status,
  ).toBeLessThan(300);
  const webhookDuplicate = await client.request(
    "POST",
    webhookPath,
    webhookBody,
    webhookHeaders,
  );
  expect(webhookDuplicate.status).toBeLessThan(300);
  mark(covered, "duplicate_webhook");

  return covered;
}

function mark(covered: Set<string>, ...ids: string[]): void {
  for (const id of ids) covered.add(id);
}

function errorCode(result: Result): string {
  return String(
    (result.body.error as Record<string, unknown> | undefined)?.code ?? "",
  );
}

async function ready(url: string, diagnostics: () => string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (laravel.exitCode !== null || laravel.signalCode !== null)
      throw new Error(`SERVER_EXITED:${url}\n${diagnostics()}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Server startup is expected to race the first probes.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`SERVER_NOT_READY:${url}\n${diagnostics()}`);
}

async function availablePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolveListen, rejectListen) => {
    probe.once("error", rejectListen);
    probe.listen(0, "127.0.0.1", resolveListen);
  });
  const address = probe.address();
  if (!address || typeof address === "string") {
    probe.close();
    throw new Error("LARAVEL_PORT_ALLOCATION_FAILED");
  }
  await new Promise<void>((resolveClose, rejectClose) =>
    probe.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
  return address.port;
}

function captureLaravelOutput(stream: NodeJS.ReadableStream | null): void {
  stream?.on("data", (chunk: Buffer | string) => {
    laravelLogs = `${laravelLogs}${chunk.toString()}`.slice(-16_384);
  });
}

function laravelFailure(): string {
  const state = `Laravel process pid=${laravel.pid ?? "unknown"}, exit=${laravel.exitCode ?? "running"}, signal=${laravel.signalCode ?? "none"}`;
  const logs = laravelLogs.trim() || "Aucune sortie Laravel capturée.";
  return `${state}\n--- Laravel output ---\n${logs}`;
}
