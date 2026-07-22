const forbidden = /(APP_KEY|SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL)\s*[:=]/i;

export type SmokeOptions = {
  url: string;
  frontend?: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
};

export type SmokeResult = {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
};

export async function runSmoke(options: SmokeOptions): Promise<SmokeResult> {
  const fetcher = options.fetcher ?? fetch;
  const targets: Array<[string, string]> = [
    ["liveness", new URL("/up", options.url).toString()],
    ["readiness", new URL("/api/readiness", options.url).toString()],
    ["health", new URL("/api/health", options.url).toString()],
    ...(options.frontend
      ? ([["frontend", options.frontend]] as Array<[string, string]>)
      : []),
  ];
  const checks = [];
  for (const [name, target] of targets) {
    try {
      const response = await fetcher(target, {
        method: "GET",
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: { accept: "application/json,text/html" },
      });
      const body = await response.text();
      const safe = !forbidden.test(body);
      checks.push({
        name,
        ok: response.ok && safe,
        detail: !response.ok
          ? `HTTP ${response.status}`
          : safe
            ? "available and redacted"
            : "response exposes a forbidden secret field",
      });
    } catch (error) {
      checks.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : "request failed",
      });
    }
  }
  return { ok: checks.every((check) => check.ok), checks };
}
