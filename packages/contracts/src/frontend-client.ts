import type { ApiError, ErrorCode } from "./index.js";

export type FrontendClientOptions = {
  baseUrl: string;
  csrfToken: () => string | null;
  fetcher?: typeof fetch;
};

export class FrontendApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly requestId: string,
    message: string,
  ) {
    super(message);
  }
}

export function createFrontendClient(options: FrontendClientOptions) {
  const base = new URL(options.baseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error("VALIDATION_FAILED");
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrf = options.csrfToken();
      if (csrf) headers.set("X-CSRF-TOKEN", csrf);
    }
    const response = await fetcher(new URL(path, base), {
      ...init,
      headers,
      credentials: "include",
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const problem = payload as ApiError;
      throw new FrontendApiError(
        problem.error.code,
        problem.error.requestId,
        problem.error.message,
      );
    }
    return payload as T;
  }

  return {
    register: (email: string, password: string) =>
      request("auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    refresh: () => request("auth/refresh", { method: "POST" }),
    logout: () => request("auth/logout", { method: "POST" }),
    organizations: () => request("organizations"),
    billingSummary: () => request("billing/summary"),
    entitlements: () => request("billing/entitlements"),
  };
}
