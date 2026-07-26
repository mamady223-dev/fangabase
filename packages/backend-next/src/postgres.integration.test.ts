import { describe, expect, it } from "vitest";
import { PostgresStore } from "./store.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("PostgreSQL persistence", () => {
  it("serializes concurrent aggregate updates without losing data", async () => {
    const store = new PostgresStore(databaseUrl!);
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        store.transaction((state) => {
          state.audit.push({
            id: `postgres-${Date.now()}-${index}`,
            actorId: null,
            action: "test.concurrent",
            subjectType: "backend",
            subjectId: String(index),
            metadata: {},
            createdAt: new Date().toISOString(),
          });
        }),
      ),
    );
    const count = await store.transaction(
      (state) =>
        state.audit.filter((event) => event.action === "test.concurrent")
          .length,
    );
    expect(count).toBeGreaterThanOrEqual(8);
  });
});
