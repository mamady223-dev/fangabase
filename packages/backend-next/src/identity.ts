import { createHash, randomUUID } from "node:crypto";
import {
  hashPassword,
  normalizeEmail,
  randomToken,
  seal,
  tokenHash,
  unseal,
  validatePassword,
  verifyPassword,
} from "./crypto.js";
import { audit, BackendProblem, enqueue, expiresIn, now } from "./common.js";
import type {
  BackendState,
  OneTimeToken,
  SessionRecord,
  UserRecord,
} from "./state.js";

export type SessionCredentials = {
  token: string;
  csrf: string;
  expiresAt: string;
  user: PublicUser;
};

export type PublicUser = Omit<UserRecord, "passwordHash">;

export interface GoogleOAuthProvider {
  authorizationUrl(input: {
    state: string;
    nonce: string;
    codeChallenge: string;
    returnPath: string;
  }): Promise<string>;
  exchange(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<{
    issuer: string;
    audience: string;
    subject: string;
    email: string;
    emailVerified: boolean;
    expiresAt: number;
    nonce: string;
  }>;
}

export class DisabledGoogleProvider implements GoogleOAuthProvider {
  async authorizationUrl(): Promise<string> {
    throw new BackendProblem("PAYMENT_PROVIDER_UNAVAILABLE", 503);
  }

  async exchange(): Promise<never> {
    throw new BackendProblem("PAYMENT_PROVIDER_UNAVAILABLE", 503);
  }
}

export class IdentityService {
  constructor(
    private readonly secret: string,
    private readonly bootstrapSuperadminEmail: string | null = null,
  ) {}

  async register(
    state: BackendState,
    input: { email: string; password: string; name?: string | undefined },
  ): Promise<{ user: PublicUser; verificationToken: string }> {
    const email = normalizeEmail(input.email);
    if (state.users.some((user) => user.email === email))
      throw new BackendProblem("CONFLICT", 409);
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(input.password),
      role: this.bootstrapSuperadminEmail === email ? "SUPERADMIN" : "USER",
      status: "ACTIVE",
      emailVerifiedAt: null,
      name: input.name?.trim().slice(0, 120) ?? "",
      locale: "fr",
      createdAt: now(),
    };
    state.users.push(user);
    state.notificationPreferences[user.id] = { email: true, inApp: true };
    const verificationToken = this.issueToken(
      state,
      user,
      "email_verification",
      30 * 60,
    );
    enqueue(state, this.secret, "identity.email.verify", user.id, {
      token: verificationToken,
    });
    audit(state, user.id, "identity.registered", "user", user.id);
    return { user: publicUser(user), verificationToken };
  }

  async login(
    state: BackendState,
    emailInput: string,
    password: string,
  ): Promise<SessionCredentials> {
    const email = normalizeEmail(emailInput);
    const user = state.users.find((candidate) => candidate.email === email);
    const fake =
      "scrypt:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    const valid = await verifyPassword(password, user?.passwordHash ?? fake);
    if (!user || !valid) throw new BackendProblem("AUTH_REQUIRED", 401);
    this.assertActive(user);
    audit(state, user.id, "identity.login", "user", user.id);
    return this.issueSession(state, user);
  }

  authenticate(state: BackendState, rawToken: string | null): PublicUser {
    if (!rawToken) throw new BackendProblem("AUTH_REQUIRED", 401);
    const hash = tokenHash(rawToken);
    const session = state.sessions.find(
      (candidate) => candidate.tokenHash === hash,
    );
    if (!session) throw new BackendProblem("AUTH_REQUIRED", 401);
    const user = state.users.find(
      (candidate) => candidate.id === session.userId,
    );
    if (!user) throw new BackendProblem("AUTH_REQUIRED", 401);
    this.assertActive(user);
    if (session.revokedAt || session.expiresAt <= now())
      throw new BackendProblem("AUTH_REQUIRED", 401);
    return publicUser(user);
  }

  assertCsrf(
    state: BackendState,
    rawToken: string | null,
    cookie: string | null,
    header: string | null,
  ): void {
    if (!rawToken || !cookie || !header || cookie !== header)
      throw new BackendProblem("CSRF_INVALID", 419);
    const session = state.sessions.find(
      (item) => item.tokenHash === tokenHash(rawToken) && !item.revokedAt,
    );
    if (!session || session.csrfHash !== tokenHash(cookie))
      throw new BackendProblem("CSRF_INVALID", 419);
  }

  assertRefreshCsrf(
    state: BackendState,
    rawToken: string | null,
    cookie: string | null,
    header: string | null,
  ): void {
    if (!rawToken || !cookie || !header || cookie !== header)
      throw new BackendProblem("CSRF_INVALID", 419);
    const tokenDigest = tokenHash(rawToken);
    const csrfDigest = tokenHash(cookie);
    const session = state.sessions.find(
      (item) =>
        item.tokenHash === tokenDigest ||
        item.previousTokenHashes.includes(tokenDigest),
    );
    if (
      !session ||
      (session.csrfHash !== csrfDigest &&
        !session.previousCsrfHashes.includes(csrfDigest))
    )
      throw new BackendProblem("CSRF_INVALID", 419);
  }

  requestOneTimeToken(
    state: BackendState,
    emailInput: string,
    purpose: "email_verification" | "password_reset",
  ): { accepted: true; token: string | null } {
    const email = normalizeEmail(emailInput);
    this.consumeRateLimit(state, `${purpose}:${email}`, 3, 15 * 60);
    const user = state.users.find((candidate) => candidate.email === email);
    if (!user) return { accepted: true, token: null };
    const token = this.issueToken(
      state,
      user,
      purpose,
      purpose === "password_reset" ? 15 * 60 : 30 * 60,
    );
    enqueue(state, this.secret, `identity.${purpose}`, user.id, { token });
    audit(state, user.id, `identity.${purpose}.requested`, "user", user.id);
    return { accepted: true, token };
  }

  confirmEmail(state: BackendState, rawToken: string): PublicUser {
    const record = this.consumeToken(state, rawToken, "email_verification");
    const user = requiredUser(state, record.userId);
    user.emailVerifiedAt = now();
    audit(state, user.id, "identity.email.verified", "user", user.id);
    return publicUser(user);
  }

  async resetPassword(
    state: BackendState,
    rawToken: string,
    password: string,
  ): Promise<void> {
    validatePassword(password);
    const record = this.consumeToken(state, rawToken, "password_reset");
    const user = requiredUser(state, record.userId);
    user.passwordHash = await hashPassword(password);
    this.revokeUserSessions(state, user.id);
    audit(state, user.id, "identity.password.reset", "user", user.id);
  }

  async changePassword(
    state: BackendState,
    actor: PublicUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = requiredUser(state, actor.id);
    if (!(await verifyPassword(currentPassword, user.passwordHash)))
      throw new BackendProblem("AUTH_REQUIRED", 401);
    user.passwordHash = await hashPassword(newPassword);
    this.revokeUserSessions(state, user.id);
    audit(state, user.id, "identity.password.changed", "user", user.id);
  }

  refresh(state: BackendState, rawToken: string): SessionCredentials | null {
    const hash = tokenHash(rawToken);
    const replayed = state.sessions.find((session) =>
      session.previousTokenHashes.includes(hash),
    );
    if (replayed) {
      for (const session of state.sessions)
        if (session.familyId === replayed.familyId) session.revokedAt = now();
      audit(
        state,
        replayed.userId,
        "identity.session.replay",
        "session_family",
        replayed.familyId,
      );
      return null;
    }
    const session = state.sessions.find(
      (candidate) =>
        candidate.tokenHash === hash &&
        !candidate.revokedAt &&
        candidate.expiresAt > now(),
    );
    if (!session) throw new BackendProblem("AUTH_REQUIRED", 401);
    const user = requiredUser(state, session.userId);
    this.assertActive(user);
    const nextToken = randomToken();
    const nextCsrf = randomToken();
    session.previousTokenHashes.push(session.tokenHash);
    session.previousCsrfHashes.push(session.csrfHash);
    session.tokenHash = tokenHash(nextToken);
    session.csrfHash = tokenHash(nextCsrf);
    session.expiresAt = expiresIn(30 * 24 * 60 * 60);
    audit(state, user.id, "identity.session.rotated", "session", session.id);
    return {
      token: nextToken,
      csrf: nextCsrf,
      expiresAt: session.expiresAt,
      user: publicUser(user),
    };
  }

  logout(state: BackendState, rawToken: string): void {
    const session = state.sessions.find(
      (item) => item.tokenHash === tokenHash(rawToken),
    );
    if (session) session.revokedAt = now();
  }

  logoutAll(state: BackendState, userId: string): void {
    this.revokeUserSessions(state, userId);
    audit(state, userId, "identity.sessions.revoked", "user", userId);
  }

  async startGoogle(
    state: BackendState,
    provider: GoogleOAuthProvider,
    returnPath: string,
  ): Promise<{ authorizationUrl: string; state: string }> {
    if (!/^\/(?!\/)[A-Za-z0-9/_-]*$/.test(returnPath))
      throw new BackendProblem("VALIDATION_FAILED", 422);
    const stateToken = randomToken();
    const nonce = randomToken();
    const verifier = randomToken(48);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    state.oneTimeTokens.push({
      id: randomUUID(),
      userId: "oauth",
      purpose: "oauth_state",
      tokenHash: tokenHash(stateToken),
      expiresAt: expiresIn(10 * 60),
      usedAt: null,
      metadata: {
        nonce,
        verifier: seal(verifier, this.secret),
        returnPath,
      },
    });
    return {
      authorizationUrl: await provider.authorizationUrl({
        state: stateToken,
        nonce,
        codeChallenge: challenge,
        returnPath,
      }),
      state: stateToken,
    };
  }

  async finishGoogle(
    state: BackendState,
    provider: GoogleOAuthProvider,
    stateToken: string,
    code: string,
    expectedAudience: string,
  ): Promise<SessionCredentials & { returnPath: string }> {
    const record = this.consumeToken(state, stateToken, "oauth_state");
    const claims = await provider.exchange({
      code,
      codeVerifier: unseal(record.metadata.verifier ?? "", this.secret),
      nonce: record.metadata.nonce ?? "",
    });
    if (
      !["https://accounts.google.com", "accounts.google.com"].includes(
        claims.issuer,
      ) ||
      claims.audience !== expectedAudience ||
      claims.expiresAt <= Date.now() / 1000 ||
      claims.nonce !== record.metadata.nonce ||
      !claims.emailVerified
    )
      throw new BackendProblem("AUTH_REQUIRED", 401);
    const existingLink = state.oauthLinks.find(
      (link) => link.provider === "google" && link.subject === claims.subject,
    );
    let user = existingLink
      ? state.users.find((candidate) => candidate.id === existingLink.userId)
      : undefined;
    if (!user) {
      const email = normalizeEmail(claims.email);
      const collision = state.users.find(
        (candidate) => candidate.email === email,
      );
      if (collision) throw new BackendProblem("CONFLICT", 409);
      user = {
        id: randomUUID(),
        email,
        passwordHash: await hashPassword(`${randomToken()}Aa1!`),
        role: "USER",
        status: "ACTIVE",
        emailVerifiedAt: now(),
        name: "",
        locale: "fr",
        createdAt: now(),
      };
      state.users.push(user);
      state.oauthLinks.push({
        provider: "google",
        subject: claims.subject,
        userId: user.id,
        createdAt: now(),
      });
    }
    this.assertActive(user);
    return {
      ...this.issueSession(state, user),
      returnPath: record.metadata.returnPath ?? "/",
    };
  }

  private issueSession(
    state: BackendState,
    user: UserRecord,
  ): SessionCredentials {
    const token = randomToken();
    const csrf = randomToken();
    const session: SessionRecord = {
      id: randomUUID(),
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: tokenHash(token),
      previousTokenHashes: [],
      csrfHash: tokenHash(csrf),
      previousCsrfHashes: [],
      expiresAt: expiresIn(30 * 24 * 60 * 60),
      revokedAt: null,
    };
    state.sessions.push(session);
    return {
      token,
      csrf,
      expiresAt: session.expiresAt,
      user: publicUser(user),
    };
  }

  private issueToken(
    state: BackendState,
    user: UserRecord,
    purpose: OneTimeToken["purpose"],
    lifetimeSeconds: number,
  ): string {
    for (const record of state.oneTimeTokens)
      if (
        record.userId === user.id &&
        record.purpose === purpose &&
        !record.usedAt
      )
        record.usedAt = now();
    const token = randomToken();
    state.oneTimeTokens.push({
      id: randomUUID(),
      userId: user.id,
      purpose,
      tokenHash: tokenHash(token),
      expiresAt: expiresIn(lifetimeSeconds),
      usedAt: null,
      metadata: {},
    });
    return token;
  }

  private consumeToken(
    state: BackendState,
    rawToken: string,
    purpose: OneTimeToken["purpose"],
  ): OneTimeToken {
    const record = state.oneTimeTokens.find(
      (candidate) =>
        candidate.tokenHash === tokenHash(rawToken) &&
        candidate.purpose === purpose,
    );
    if (!record || record.usedAt || record.expiresAt <= now())
      throw new BackendProblem("AUTH_REQUIRED", 401);
    record.usedAt = now();
    return record;
  }

  private consumeRateLimit(
    state: BackendState,
    key: string,
    limit: number,
    windowSeconds: number,
  ): void {
    const threshold = Date.now() - windowSeconds * 1000;
    let record = state.rateLimits.find((candidate) => candidate.key === key);
    if (!record) {
      record = { key, attempts: [] };
      state.rateLimits.push(record);
    }
    record.attempts = record.attempts.filter(
      (attempt) => Date.parse(attempt) >= threshold,
    );
    if (record.attempts.length >= limit)
      throw new BackendProblem("RATE_LIMITED", 429);
    record.attempts.push(now());
  }

  private revokeUserSessions(state: BackendState, userId: string): void {
    for (const session of state.sessions)
      if (session.userId === userId) session.revokedAt = now();
  }

  private assertActive(user: UserRecord): void {
    if (user.status !== "ACTIVE")
      throw new BackendProblem("ACCOUNT_SUSPENDED", 403);
  }
}

function publicUser(user: UserRecord): PublicUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

function requiredUser(state: BackendState, userId: string): UserRecord {
  const user = state.users.find((candidate) => candidate.id === userId);
  if (!user) throw new BackendProblem("AUTH_REQUIRED", 401);
  return user;
}
