import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createFrontendClient, FrontendApiError } from "./frontend-client.js";

describe("neutral frontend client", () => {
  it("sends cookies and CSRF on a sensitive existing route", async () => {
    let request: RequestInit | undefined;
    const client = createFrontendClient({
      baseUrl: "https://api.example.test/api/",
      csrfToken: () => "csrf",
      fetcher: async (_url, init) => {
        request = init;
        return Response.json({ ok: true });
      },
    });
    await client.logout();
    expect(request?.credentials).toBe("include");
    expect(new Headers(request?.headers).get("X-CSRF-TOKEN")).toBe("csrf");
  });
  it("normalizes stable API errors", async () => {
    const client = createFrontendClient({
      baseUrl: "https://api.example.test/api/",
      csrfToken: () => null,
      fetcher: async () =>
        Response.json(
          {
            error: {
              code: "AUTH_REQUIRED",
              message: "Authentification requise",
              requestId: "req-1",
            },
          },
          { status: 401 },
        ),
    });
    await expect(client.organizations()).rejects.toEqual(
      expect.objectContaining<Partial<FrontendApiError>>({
        code: "AUTH_REQUIRED",
        requestId: "req-1",
      }),
    );
  });
  it("does not attach CSRF to read-only requests", async () => {
    let headers = new Headers();
    const client = createFrontendClient({
      baseUrl: "https://api.example.test/api/",
      csrfToken: () => "csrf",
      fetcher: async (_url, init) => {
        headers = new Headers(init?.headers);
        return Response.json({ data: [] });
      },
    });
    await client.entitlements();
    expect(headers.has("X-CSRF-TOKEN")).toBe(false);
  });
  it("uses only routes declared by Laravel", async () => {
    const routes = await readFile(
      resolve(import.meta.dirname, "../../../apps/server/routes/api.php"),
      "utf8",
    );
    for (const path of [
      "/register",
      "/login",
      "/refresh",
      "/logout",
      "/organizations",
      "/billing/summary",
      "/billing/entitlements",
    ])
      expect(routes).toContain(`'${path}'`);
  });
});
