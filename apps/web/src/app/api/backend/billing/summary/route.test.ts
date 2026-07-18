import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route.js";

describe("proxy de facturation", () => {
  const original = process.env.FANGABASE_API_ORIGIN;
  afterEach(() => {
    if (original === undefined) delete process.env.FANGABASE_API_ORIGIN;
    else process.env.FANGABASE_API_ORIGIN = original;
  });

  it("échoue sans exposer de détail quand le backend manque", async () => {
    delete process.env.FANGABASE_API_ORIGIN;
    const response = await GET(
      new NextRequest("http://localhost/api/backend/billing/summary"),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "NOT_CONFIGURED", message: "Service indisponible" },
    });
  });
});
