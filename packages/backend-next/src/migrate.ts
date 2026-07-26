import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const directUrl = process.env.DATABASE_DIRECT_URL;
if (!directUrl?.startsWith("postgres"))
  throw new Error("DATABASE_DIRECT_URL_REQUIRED");

const sql = postgres(directUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false,
});

try {
  const migration = await readFile(
    resolve(import.meta.dirname, "../migrations/0001_backend_state.sql"),
    "utf8",
  );
  await sql.unsafe(migration);
  process.stdout.write("Applied Next.js PostgreSQL migration 0001\n");
} finally {
  await sql.end({ timeout: 5 });
}
