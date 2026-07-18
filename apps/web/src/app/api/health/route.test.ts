import { describe, expect, it } from "vitest";
import { GET } from "./route.js";

describe("health", () => {
  it("confirme seulement que le processus vit", async () =>
    expect(await GET().json()).toMatchObject({ status: "ok" }));
});
