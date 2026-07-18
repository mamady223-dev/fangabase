import { describe, expect, it } from "vitest";
import {
  assertCanChangeSuperadmin,
  csrfValid,
  hashPassword,
  normalizeEmail,
  safeReturnPath,
  SessionService,
  verifyPassword,
  type User,
} from "./security.js";

const user = (): User => ({
  id: "u1",
  email: "awa@example.test",
  passwordHash: null,
  role: "USER",
  status: "ACTIVE",
  sessionVersion: 1,
});
describe("s?curit? des comptes", () => {
  it("normalise l?e-mail", () =>
    expect(normalizeEmail(" AWA@Example.Test ")).toBe("awa@example.test"));
  it("hache et v?rifie sans conserver le mot de passe", async () => {
    const hash = await hashPassword("FangaBase-2026-solide");
    expect(hash).not.toContain("FangaBase");
    expect(await verifyPassword("FangaBase-2026-solide", hash)).toBe(true);
  });
  it("refuse CSRF si le cookie manque ou diff?re", () => {
    expect(csrfValid(undefined, "a")).toBe(false);
    expect(csrfValid("a", "b")).toBe(false);
    expect(csrfValid("meme", "meme")).toBe(true);
  });
  it("conserve chemin, query et fragment sans open redirect", () => {
    expect(safeReturnPath("/orders?page=2#latest")).toBe(
      "/orders?page=2#latest",
    );
    expect(safeReturnPath("//evil.test/x")).toBe("/dashboard");
  });
  it("r?voque imm?diatement toutes les sessions ? la suspension", () => {
    const account = user();
    const sessions = new SessionService();
    const issued = sessions.issue(account);
    sessions.suspend(account);
    expect(() => sessions.requireActive(account, issued.session.id)).toThrow(
      "ACCOUNT_SUSPENDED",
    );
  });
  it("d?tecte la r?utilisation d?un refresh token", () => {
    const account = user();
    const sessions = new SessionService();
    const issued = sessions.issue(account);
    sessions.rotate(account, issued.session.id, issued.refreshToken);
    expect(() =>
      sessions.rotate(account, issued.session.id, issued.refreshToken),
    ).toThrow("AUTH_REQUIRED");
  });
  it("prot?ge le dernier SUPERADMIN actif", () => {
    const admin: User = { ...user(), role: "SUPERADMIN" };
    expect(() =>
      assertCanChangeSuperadmin([admin], admin, "ADMIN", "ACTIVE"),
    ).toThrow("CONFLICT");
  });
});
