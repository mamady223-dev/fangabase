import { randomUUID } from "node:crypto";
import { backendContractRoutes, stableError } from "@fangabase/contracts";
import { BillingService } from "./billing.js";
import { BackendProblem, page } from "./common.js";
import {
  DisabledGoogleProvider,
  IdentityService,
  type GoogleOAuthProvider,
  type PublicUser,
  type SessionCredentials,
} from "./identity.js";
import { safeOutbox } from "./infrastructure.js";
import { OrganizationService } from "./organizations.js";
import { PaymentService } from "./payments.js";
import type { TransactionalStore } from "./store.js";
import { UserFeatureService } from "./user-features.js";
import { WithdrawalService } from "./withdrawals.js";
import type { BackendState } from "./state.js";
import { tokenHash } from "./crypto.js";

export type BackendRequest = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: unknown;
  rawBody?: string;
};

export type BackendResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  cookies?: {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    maxAge: number;
  }[];
};

export type BackendOptions = {
  secret: string;
  production?: boolean;
  sameSite?: "lax" | "strict" | "none";
  bootstrapSuperadminEmail?: string | null;
  exposeTestTokens?: boolean;
  googleProvider?: GoogleOAuthProvider;
  googleAudience?: string;
  stripeWebhookSecret?: string;
  payoutWebhookSecret?: string;
};

export class BackendApplication {
  private readonly identity: IdentityService;
  private readonly organizations = new OrganizationService();
  private readonly users = new UserFeatureService();
  private readonly billing = new BillingService();
  private readonly payments: PaymentService;
  private readonly withdrawals: WithdrawalService;
  private readonly google: GoogleOAuthProvider;

  constructor(
    private readonly store: TransactionalStore,
    private readonly options: BackendOptions,
  ) {
    if (options.secret.length < 32) throw new Error("SESSION_SECRET_TOO_SHORT");
    this.identity = new IdentityService(
      options.secret,
      options.bootstrapSuperadminEmail,
    );
    this.payments = new PaymentService(options.secret);
    this.withdrawals = new WithdrawalService(options.secret);
    this.google = options.googleProvider ?? new DisabledGoogleProvider();
  }

  async handle(request: BackendRequest): Promise<BackendResponse> {
    const requestId = randomUUID();
    try {
      if (request.method === "GET" && request.path === "/health")
        return response(200, {
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      if (request.method === "GET" && request.path === "/readiness") {
        await this.store.ping();
        return response(200, {
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      }
      const matched = matchRoute(request.method, request.path);
      if (!matched) throw new BackendProblem("NOT_FOUND", 404);
      return await this.store.transaction(async (state) => {
        const token = request.cookies?.fangabase_refresh ?? null;
        let actor: PublicUser | null = null;
        if (
          matched.route.auth !== "public" &&
          matched.pattern !== "/auth/refresh"
        )
          actor = this.identity.authenticate(state, token);
        if (matched.route.auth === "admin")
          this.organizations.requireSuperadmin(actor!);
        if (matched.route.csrf) {
          const csrfCookie = request.cookies?.fangabase_csrf ?? null;
          const csrfHeader = request.headers?.["x-csrf-token"] ?? null;
          if (matched.pattern === "/auth/refresh")
            this.identity.assertRefreshCsrf(
              state,
              token,
              csrfCookie,
              csrfHeader,
            );
          else this.identity.assertCsrf(state, token, csrfCookie, csrfHeader);
        }
        return this.dispatch(
          state,
          request,
          matched.pattern,
          matched.params,
          actor,
        );
      });
    } catch (error) {
      if (error instanceof BackendProblem)
        return response(error.status, stableError(error.code, requestId));
      return response(500, stableError("CONFLICT", requestId));
    }
  }

  private async dispatch(
    state: BackendState,
    request: BackendRequest,
    pattern: string,
    params: Record<string, string>,
    actor: PublicUser | null,
  ): Promise<BackendResponse> {
    const key = `${request.method} ${pattern}`;
    const body = objectBody(request.body);
    const idempotency = requiredHeader(request, "idempotency-key", false);
    switch (key) {
      case "POST /auth/register": {
        const result = await this.identity.register(state, {
          email: stringField(body, "email"),
          password: stringField(body, "password"),
          name: optionalString(body, "name"),
        });
        return response(201, {
          user: result.user,
          ...(this.options.exposeTestTokens
            ? { verificationToken: result.verificationToken }
            : {}),
        });
      }
      case "POST /auth/login":
        return sessionResponse(
          await this.identity.login(
            state,
            stringField(body, "email"),
            stringField(body, "password"),
          ),
          this.options,
        );
      case "GET /auth/me":
        return response(200, { user: actor });
      case "POST /auth/email/verification/request": {
        const result = this.identity.requestOneTimeToken(
          state,
          stringField(body, "email"),
          "email_verification",
        );
        return response(202, {
          accepted: true,
          ...(this.options.exposeTestTokens && result.token
            ? { verificationToken: result.token }
            : {}),
        });
      }
      case "POST /auth/email/verification/confirm":
        return response(200, {
          user: this.identity.confirmEmail(state, stringField(body, "token")),
        });
      case "POST /auth/password/forgot": {
        const result = this.identity.requestOneTimeToken(
          state,
          stringField(body, "email"),
          "password_reset",
        );
        return response(202, {
          accepted: true,
          ...(this.options.exposeTestTokens && result.token
            ? { resetToken: result.token }
            : {}),
        });
      }
      case "POST /auth/password/reset":
        await this.identity.resetPassword(
          state,
          stringField(body, "token"),
          stringField(body, "password"),
        );
        return response(200, { changed: true });
      case "POST /auth/password/change":
        await this.identity.changePassword(
          state,
          actor!,
          stringField(body, "currentPassword"),
          stringField(body, "newPassword"),
        );
        return clearSessionResponse({ changed: true }, this.options);
      case "POST /auth/refresh": {
        const refreshed = this.identity.refresh(
          state,
          request.cookies?.fangabase_refresh ?? "",
        );
        return refreshed
          ? sessionResponse(refreshed, this.options)
          : response(401, stableError("AUTH_REQUIRED", randomUUID()));
      }
      case "POST /auth/logout":
        this.identity.logout(state, request.cookies?.fangabase_refresh ?? "");
        return clearSessionResponse({ loggedOut: true }, this.options);
      case "POST /auth/logout-all":
        this.identity.logoutAll(state, actor!.id);
        return clearSessionResponse({ loggedOut: true }, this.options);
      case "GET /oauth/google/start": {
        const result = await this.identity.startGoogle(
          state,
          this.google,
          request.query?.return_path ?? "/",
        );
        return response(200, result);
      }
      case "GET /oauth/google/callback":
        return sessionResponse(
          await this.identity.finishGoogle(
            state,
            this.google,
            request.query?.state ?? "",
            request.query?.code ?? "",
            this.options.googleAudience ?? "",
          ),
          this.options,
        );
      case "GET /organizations":
        return response(200, { data: this.organizations.list(state, actor!) });
      case "POST /organizations":
        return response(
          201,
          this.organizations.create(state, actor!, {
            name: stringField(body, "name"),
            slug: stringField(body, "slug"),
          }),
        );
      case "GET /organizations/:organization":
        return response(
          200,
          this.organizations.show(
            state,
            actor!,
            pathParam(params, "organization"),
          ),
        );
      case "PATCH /organizations/:organization":
        return response(
          200,
          this.organizations.update(
            state,
            actor!,
            pathParam(params, "organization"),
            {
              name: optionalString(body, "name"),
            },
          ),
        );
      case "GET /organizations/:organization/members":
        return response(200, {
          data: this.organizations.members(
            state,
            actor!,
            pathParam(params, "organization"),
          ),
        });
      case "POST /organizations/:organization/invitations": {
        const invited = this.organizations.invite(
          state,
          actor!,
          pathParam(params, "organization"),
          {
            email: stringField(body, "email"),
            role: enumField(body, "role", ["ADMIN", "MEMBER"]),
          },
        );
        return response(202, {
          invitation: invited.invitation,
          ...(this.options.exposeTestTokens
            ? { invitationToken: invited.token }
            : {}),
        });
      }
      case "POST /organizations/:organization/invitations/:token/accept":
      case "POST /organizations/:organization/invitations/:token/refuse":
        this.organizations.respondInvitation(
          state,
          actor!,
          pathParam(params, "organization"),
          pathParam(params, "token"),
          key.endsWith("/accept"),
        );
        return response(200, { accepted: key.endsWith("/accept") });
      case "PATCH /organizations/:organization/members/:user":
        this.organizations.changeMember(
          state,
          actor!,
          pathParam(params, "organization"),
          pathParam(params, "user"),
          enumField(body, "role", ["ADMIN", "MEMBER"]),
        );
        return response(200, { updated: true });
      case "DELETE /organizations/:organization/members/:user":
        this.organizations.removeMember(
          state,
          actor!,
          pathParam(params, "organization"),
          pathParam(params, "user"),
        );
        return response(200, { removed: true });
      case "POST /organizations/:organization/leave":
        this.organizations.leave(
          state,
          actor!,
          pathParam(params, "organization"),
        );
        return response(200, { left: true });
      case "GET /notifications":
        return response(
          200,
          this.users.notifications(
            state,
            actor!,
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "GET /notifications/unread-count":
        return response(200, {
          count: this.users.unreadCount(state, actor!),
        });
      case "PATCH /notifications/preferences":
        return response(
          200,
          this.users.preferences(state, actor!, {
            email: booleanField(body, "email"),
            inApp: booleanField(body, "inApp"),
          }),
        );
      case "POST /notifications/:notification/read":
        return response(
          200,
          this.users.markRead(state, actor!, pathParam(params, "notification")),
        );
      case "GET /profile":
        return response(200, this.users.profile(state, actor!));
      case "PATCH /profile":
        return response(
          200,
          this.users.profile(state, actor!, {
            name: optionalString(body, "name"),
            locale: optionalString(body, "locale"),
          }),
        );
      case "POST /uploads":
        return response(
          201,
          this.users.upload(state, actor!, {
            name: stringField(body, "name"),
            mime: stringField(body, "mime"),
            contentBase64: stringField(body, "contentBase64"),
          }),
        );
      case "GET /uploads/:upload":
        return response(
          200,
          this.users.download(state, actor!, pathParam(params, "upload")),
        );
      case "GET /catalog":
        return response(200, { data: this.billing.catalog(state) });
      case "GET /billing/summary":
        return response(200, this.billing.summary(state, actor!));
      case "GET /billing/credits":
        return response(200, this.billing.credits(state, actor!));
      case "GET /billing/subscription":
        return response(200, {
          subscription: this.billing.subscription(state, actor!),
        });
      case "GET /billing/entitlements":
        return response(200, {
          data: this.billing.entitlements(state, actor!),
        });
      case "POST /billing/credits/purchase": {
        const result = this.billing.purchaseCredits(
          state,
          actor!,
          {
            priceId: stringField(body, "priceId"),
            amountMinor: numberField(body, "amountMinor"),
            currency: currencyField(body),
          },
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "POST /billing/subscriptions": {
        const result = this.billing.createSubscription(
          state,
          actor!,
          stringField(body, "priceId"),
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "POST /billing/subscriptions/:subscription/cancel":
        return response(
          200,
          this.billing.cancelSubscription(
            state,
            actor!,
            pathParam(params, "subscription"),
          ),
        );
      case "POST /payments/checkouts": {
        const result = this.payments.checkout(
          state,
          actor!,
          {
            priceId: stringField(body, "priceId"),
            provider: stringField(body, "provider"),
            amountMinor: numberField(body, "amountMinor"),
            currency: currencyField(body),
          },
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "POST /payments/orders/:order/refunds": {
        const result = this.payments.refund(
          state,
          actor!,
          pathParam(params, "order"),
          numberField(body, "amountMinor"),
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "POST /webhooks/stripe":
        return response(
          202,
          this.payments.stripeWebhook(
            state,
            request.rawBody ?? "",
            requiredHeader(request, "stripe-signature"),
            this.options.stripeWebhookSecret ?? "",
          ),
        );
      case "GET /withdrawals":
        return response(200, { data: this.withdrawals.list(state, actor!) });
      case "GET /withdrawals/balance":
        return response(200, this.withdrawals.balance(state, actor!));
      case "POST /payout-accounts":
        return response(
          201,
          this.withdrawals.account(state, actor!, {
            provider: stringField(body, "provider"),
            details: recordField(body, "details"),
          }),
        );
      case "POST /withdrawals": {
        const result = this.withdrawals.request(
          state,
          actor!,
          {
            payoutAccountId: stringField(body, "payoutAccountId"),
            amountMinor: numberField(body, "amountMinor"),
            currency: currencyField(body),
          },
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "POST /withdrawals/:withdrawal/cancel":
        return response(
          200,
          this.withdrawals.cancel(
            state,
            actor!,
            pathParam(params, "withdrawal"),
          ),
        );
      case "POST /webhooks/payouts/:provider":
        return response(
          202,
          this.withdrawals.callback(
            state,
            pathParam(params, "provider"),
            request.rawBody ?? "",
            requiredHeader(request, "x-fangabase-timestamp"),
            requiredHeader(request, "x-fangabase-signature"),
            this.options.payoutWebhookSecret ?? "",
          ),
        );
      case "GET /admin/users":
        return response(
          200,
          this.organizations.adminUsers(
            state,
            actor!,
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "PATCH /admin/users/:user":
        this.organizations.updateUserStatus(
          state,
          actor!,
          pathParam(params, "user"),
          {
            status: optionalEnum(body, "status", ["ACTIVE", "SUSPENDED"]),
            role: optionalEnum(body, "role", ["USER", "ADMIN", "SUPERADMIN"]),
          },
        );
        return response(200, { updated: true });
      case "GET /admin/organizations":
        return response(
          200,
          this.organizations.adminOrganizations(
            state,
            actor!,
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "PATCH /admin/organizations/:organization":
        this.organizations.updateOrganizationStatus(
          state,
          actor!,
          pathParam(params, "organization"),
          enumField(body, "status", ["ACTIVE", "SUSPENDED"]),
        );
        return response(200, { updated: true });
      case "POST /admin/catalog":
        return response(
          201,
          this.billing.createPrice(state, actor!, {
            productKey: stringField(body, "productKey"),
            label: stringField(body, "label"),
            amountMinor: numberField(body, "amountMinor"),
            currency: currencyField(body),
          }),
        );
      case "POST /admin/catalog/prices/:price/archive":
        this.billing.archivePrice(state, actor!, pathParam(params, "price"));
        return response(200, { archived: true });
      case "POST /admin/billing/credits/grant": {
        const result = this.billing.grant(
          state,
          actor!,
          {
            ownerId: stringField(body, "ownerId"),
            amountMinor: numberField(body, "amountMinor"),
            currency: currencyField(body),
            expiresAt: optionalString(body, "expiresAt"),
          },
          idempotency,
        );
        return response(result.status, result.body);
      }
      case "GET /admin/billing/events":
        return response(
          200,
          page(
            state.ledger,
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "GET /admin/withdrawals":
        return response(
          200,
          this.withdrawals.adminList(
            state,
            actor!,
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "POST /admin/withdrawals/:withdrawal/verify":
        return response(
          200,
          this.withdrawals.verify(
            state,
            actor!,
            pathParam(params, "withdrawal"),
          ),
        );
      case "POST /admin/withdrawals/:withdrawal/approve":
        return response(
          200,
          this.withdrawals.approve(
            state,
            actor!,
            pathParam(params, "withdrawal"),
          ),
        );
      case "GET /admin/audit":
        return response(
          200,
          page(state.audit, queryLimit(request), request.query?.cursor ?? null),
        );
      case "GET /admin/outbox":
        return response(
          200,
          page(
            state.outbox.map(safeOutbox),
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      case "GET /admin/rate-limits":
        return response(
          200,
          page(
            state.rateLimits.map((item) => ({
              keyHash: tokenHash(item.key),
              attempts: item.attempts.length,
            })),
            queryLimit(request),
            request.query?.cursor ?? null,
          ),
        );
      default:
        throw new BackendProblem("NOT_FOUND", 404);
    }
  }
}

function matchRoute(method: string, path: string) {
  const clean = `/${(path.split("?")[0] ?? "")
    .split("/")
    .filter(Boolean)
    .join("/")}`;
  for (const route of backendContractRoutes) {
    if (route.method !== method) continue;
    const names: string[] = [];
    const source = route.path
      .split("/")
      .map((part) => {
        if (part.startsWith(":")) {
          names.push(part.slice(1));
          return "([^/]+)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    const match = clean.match(new RegExp(`^${source}$`));
    if (!match) continue;
    return {
      route,
      pattern: route.path,
      params: Object.fromEntries(
        names.map((name, index) => [
          name,
          decodeURIComponent(match[index + 1] ?? ""),
        ]),
      ),
    };
  }
  return null;
}

function response(status: number, body: unknown): BackendResponse {
  return {
    status,
    body,
    headers: { "cache-control": "no-store" },
  };
}

function sessionResponse(
  session: SessionCredentials,
  options: BackendOptions,
): BackendResponse {
  const sameSite = options.sameSite ?? "lax";
  const secure = options.production ?? false;
  const maxAge = 30 * 24 * 60 * 60;
  return {
    ...response(200, { user: session.user, expiresAt: session.expiresAt }),
    cookies: [
      {
        name: "fangabase_refresh",
        value: session.token,
        httpOnly: true,
        secure,
        sameSite,
        maxAge,
      },
      {
        name: "fangabase_csrf",
        value: session.csrf,
        httpOnly: false,
        secure,
        sameSite,
        maxAge,
      },
    ],
  };
}

function clearSessionResponse(
  body: unknown,
  options: BackendOptions,
): BackendResponse {
  return {
    ...response(200, body),
    cookies: ["fangabase_refresh", "fangabase_csrf"].map((name) => ({
      name,
      value: "",
      httpOnly: name === "fangabase_refresh",
      secure: options.production ?? false,
      sameSite: options.sameSite ?? "lax",
      maxAge: 0,
    })),
  };
}

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string")
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

function optionalString(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string")
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

function numberField(body: Record<string, unknown>, field: string): number {
  const value = body[field];
  if (typeof value !== "number")
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

function booleanField(body: Record<string, unknown>, field: string): boolean {
  const value = body[field];
  if (typeof value !== "boolean")
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

function recordField(
  body: Record<string, unknown>,
  field: string,
): Record<string, string> {
  const value = body[field];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.values(value).some((item) => typeof item !== "string")
  )
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value as Record<string, string>;
}

function enumField<const Values extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  values: Values,
): Values[number] {
  const value = body[field];
  if (typeof value !== "string" || !values.includes(value))
    throw new BackendProblem("VALIDATION_FAILED", 422);
  return value;
}

function optionalEnum<const Values extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  values: Values,
): Values[number] | undefined {
  if (body[field] === undefined) return undefined;
  return enumField(body, field, values);
}

function currencyField(body: Record<string, unknown>): "XOF" | "EUR" | "USD" {
  return enumField(body, "currency", ["XOF", "EUR", "USD"]);
}

function requiredHeader(
  request: BackendRequest,
  name: string,
  required = true,
): string {
  const value = request.headers?.[name];
  if (required && !value) throw new BackendProblem("VALIDATION_FAILED", 422);
  return value ?? "";
}

function queryLimit(request: BackendRequest): number {
  return request.query?.limit ? Number(request.query.limit) : 25;
}

function pathParam(params: Record<string, string>, name: string): string {
  const value = params[name];
  if (!value) throw new BackendProblem("NOT_FOUND", 404);
  return value;
}
