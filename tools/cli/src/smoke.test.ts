import { describe, expect, it } from "vitest";
import { runSmoke } from "./smoke.js";

describe("deployment smoke", () => {
  it("passes read-only endpoints", async () => {
    const result = await runSmoke({
      url: "https://api.example.test",
      timeoutMs: 50,
      fetcher: async () => new Response('{"ok":true,"version":"1"}'),
    });
    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(3);
  });
  it("reports an unavailable endpoint", async () => {
    const result = await runSmoke({
      url: "https://api.example.test",
      timeoutMs: 50,
      fetcher: async () => new Response("down", { status: 503 }),
    });
    expect(result.ok).toBe(false);
    expect(result.checks[0]?.detail).toBe("HTTP 503");
  });
  it("reports timeout errors", async () => {
    const result = await runSmoke({
      url: "https://api.example.test",
      timeoutMs: 1,
      fetcher: async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
    });
    expect(result.ok).toBe(false);
  });
  it("rejects secret-shaped response fields", async () => {
    const result = await runSmoke({
      url: "https://api.example.test",
      timeoutMs: 50,
      fetcher: async () => new Response("APP_KEY=exposed"),
    });
    expect(result.ok).toBe(false);
  });
});
