import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function tokenHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(value: string): Promise<string> {
  validatePassword(value);
  const salt = randomBytes(16);
  const derived = (await scrypt(value, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${derived.toString("base64")}`;
}

export async function verifyPassword(
  value: string,
  encoded: string,
): Promise<boolean> {
  const [, saltEncoded, digestEncoded] = encoded.split(":");
  if (!saltEncoded || !digestEncoded) return false;
  const expected = Buffer.from(digestEncoded, "base64");
  const actual = (await scrypt(
    value,
    Buffer.from(saltEncoded, "base64"),
    expected.length,
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validatePassword(value: string): void {
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  )
    throw new Error("VALIDATION_FAILED");
}

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("VALIDATION_FAILED");
  return email;
}

export function fingerprint(value: unknown): string {
  return tokenHash(canonicalJson(value));
}

export function seal(value: string, secret: string): string {
  if (secret.length < 32) throw new Error("SESSION_SECRET_TOO_SHORT");
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function unseal(value: string, secret: string): string {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("CIPHERTEXT_INVALID");
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
