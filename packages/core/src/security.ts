import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export type Role = "USER" | "ADMIN" | "SUPERADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type User = {
  id: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  status: UserStatus;
  sessionVersion: number;
};
export type Session = {
  id: string;
  userId: string;
  refreshHash: string;
  version: number;
  revokedAt: Date | null;
  expiresAt: Date;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("en-US");
}
export function validatePassword(password: string): void {
  const forbidden = new Set([
    "password",
    "motdepasse",
    "123456789012",
    "azertyuiop",
  ]);
  if (
    password.length < 12 ||
    password.length > 128 ||
    forbidden.has(password.toLowerCase()) ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  )
    throw new Error("VALIDATION_FAILED");
}
export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$v=1$n=16384$r=8$p=1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 7 || parts[0] !== "scrypt" || parts[1] !== "v=1") {
    await scrypt(password, Buffer.alloc(16), 64);
    return false;
  }
  const salt = Buffer.from(parts[5]!, "base64url");
  const expected = Buffer.from(parts[6]!, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}
export async function verifyPasswordEnumerationSafe(
  password: string,
  hash: string | null,
): Promise<boolean> {
  const fake =
    "scrypt$v=1$n=16384$r=8$p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  return verifyPassword(password, hash ?? fake);
}
export function csrfValid(
  cookie: string | undefined,
  header: string | undefined,
): boolean {
  if (!cookie || !header) return false;
  const left = Buffer.from(cookie);
  const right = Buffer.from(header);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function safeReturnPath(value: string): string {
  const decoded = decodeURIComponent(value);
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\")
  )
    return "/dashboard";
  const url = new URL(decoded, "https://fangabase.invalid");
  return `${url.pathname}${url.search}${url.hash}`;
}
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class SessionService {
  readonly sessions = new Map<string, Session>();
  issue(
    user: User,
    now = new Date(),
  ): { session: Session; refreshToken: string } {
    if (user.status !== "ACTIVE") throw new Error("ACCOUNT_SUSPENDED");
    const refreshToken = randomBytes(32).toString("base64url");
    const session: Session = {
      id: crypto.randomUUID(),
      userId: user.id,
      refreshHash: tokenHash(refreshToken),
      version: user.sessionVersion,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 30 * 86400000),
    };
    this.sessions.set(session.id, session);
    return { session, refreshToken };
  }
  rotate(user: User, sessionId: string, presented: string): string {
    const session = this.requireActive(user, sessionId);
    if (
      !timingSafeEqual(
        Buffer.from(session.refreshHash),
        Buffer.from(tokenHash(presented)),
      )
    ) {
      this.revokeAll(user.id);
      throw new Error("AUTH_REQUIRED");
    }
    const next = randomBytes(32).toString("base64url");
    session.refreshHash = tokenHash(next);
    return next;
  }
  requireActive(user: User, sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (
      !session ||
      session.userId !== user.id ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.version !== user.sessionVersion ||
      user.status !== "ACTIVE"
    )
      throw new Error(
        user.status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "AUTH_REQUIRED",
      );
    return session;
  }
  revokeAll(userId: string): void {
    for (const session of this.sessions.values())
      if (session.userId === userId) session.revokedAt = new Date();
  }
  suspend(user: User): void {
    user.status = "SUSPENDED";
    user.sessionVersion += 1;
    this.revokeAll(user.id);
  }
}

export function assertCanChangeSuperadmin(
  users: readonly User[],
  target: User,
  nextRole: Role,
  nextStatus: UserStatus,
): void {
  if (
    target.role !== "SUPERADMIN" ||
    (nextRole === "SUPERADMIN" && nextStatus === "ACTIVE")
  )
    return;
  const others = users.filter(
    (user) =>
      user.id !== target.id &&
      user.role === "SUPERADMIN" &&
      user.status === "ACTIVE",
  );
  if (others.length === 0) throw new Error("CONFLICT");
}
