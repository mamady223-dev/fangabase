import postgres, { type Sql } from "postgres";
import { emptyState, type BackendState } from "./state.js";

export interface TransactionalStore {
  transaction<T>(
    operation: (state: BackendState) => Promise<T> | T,
  ): Promise<T>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export class MemoryStore implements TransactionalStore {
  private state: BackendState;
  private queue = Promise.resolve();

  constructor(seed: BackendState = emptyState()) {
    this.state = structuredClone(seed);
  }

  async transaction<T>(
    operation: (state: BackendState) => Promise<T> | T,
  ): Promise<T> {
    const previous = this.queue;
    let release = () => {};
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const working = structuredClone(this.state);
    try {
      const result = await operation(working);
      this.state = working;
      return result;
    } finally {
      release();
    }
  }

  async ping(): Promise<void> {}

  async close(): Promise<void> {}
}

export class PostgresStore implements TransactionalStore {
  private readonly sql: Sql;
  private readonly scope: string;

  constructor(databaseUrl: string, scope = "default", maxConnections = 1) {
    if (!databaseUrl.startsWith("postgres"))
      throw new Error("POSTGRES_DATABASE_URL_REQUIRED");
    this.scope = scope;
    this.sql = postgres(databaseUrl, {
      max: maxConnections,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  async transaction<T>(
    operation: (state: BackendState) => Promise<T> | T,
  ): Promise<T> {
    return this.sql.begin(async (tx) => {
      await tx`
        INSERT INTO fangabase_aggregates (scope, revision, payload)
        VALUES (${this.scope}, 0, ${tx.json(emptyState() as never)})
        ON CONFLICT (scope) DO NOTHING
      `;
      const rows = await tx<
        { revision: string; payload: BackendState }[]
      >`SELECT revision, payload FROM fangabase_aggregates WHERE scope = ${this.scope} FOR UPDATE`;
      const current = rows[0];
      if (!current) throw new Error("BACKEND_STATE_UNAVAILABLE");
      const state = structuredClone(current.payload);
      const result = await operation(state);
      await tx`
        UPDATE fangabase_aggregates
        SET revision = revision + 1, payload = ${tx.json(state as never)}, updated_at = NOW()
        WHERE scope = ${this.scope} AND revision = ${current.revision}
      `;
      return result;
    }) as Promise<T>;
  }

  async ping(): Promise<void> {
    await this.sql`SELECT 1`;
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}

export function runtimeStore(environment = process.env): TransactionalStore {
  if (
    environment.FANGABASE_STORE === "memory" &&
    environment.NODE_ENV !== "production"
  )
    return new MemoryStore();
  const url = environment.DATABASE_POOL_URL ?? environment.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_REQUIRED");
  return new PostgresStore(url, environment.FANGABASE_STATE_SCOPE ?? "default");
}
