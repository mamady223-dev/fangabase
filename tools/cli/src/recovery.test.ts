import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backup, restore } from "./recovery.js";

describe("backup and recovery", () => {
  it("plans a dry-run without writing", async () => {
    const directory = await fixture();
    const manifest = await backup({
      source: join(directory, "db.sqlite"),
      target: join(directory, "absent"),
      database: "sqlite",
      dryRun: true,
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(manifest.created_at).toBe("2026-01-01T00:00:00.000Z");
  });
  it("writes a timestamped integrity manifest", async () => {
    const directory = await fixture();
    const target = join(directory, "backup");
    const manifest = await backup({
      source: join(directory, "db.sqlite"),
      target,
      database: "sqlite",
      dryRun: false,
    });
    expect(manifest.files[0]?.sha256).toHaveLength(64);
    expect(
      JSON.parse(await readFile(join(target, "manifest.json"), "utf8")),
    ).toEqual(manifest);
  });
  it("restores only with explicit confirmation", async () => {
    const directory = await fixture();
    const target = join(directory, "backup");
    await backup({
      source: join(directory, "db.sqlite"),
      target,
      database: "sqlite",
      dryRun: false,
    });
    await expect(
      restore({
        backup: target,
        target: join(directory, "restored.sqlite"),
        environment: "test",
        confirm: false,
        dryRun: false,
      }),
    ).rejects.toThrow("--confirm");
  });
  it("verifies and restores into an isolated temporary target", async () => {
    const directory = await fixture();
    const target = join(directory, "backup");
    const restored = join(directory, "restored.sqlite");
    await backup({
      source: join(directory, "db.sqlite"),
      target,
      database: "sqlite",
      dryRun: false,
    });
    await restore({
      backup: target,
      target: restored,
      environment: "isolated-test",
      confirm: true,
      dryRun: false,
    });
    expect(await readFile(restored, "utf8")).toBe("isolated database");
  });
  it("refuses a corrupted archive", async () => {
    const directory = await fixture();
    const target = join(directory, "backup");
    await backup({
      source: join(directory, "db.sqlite"),
      target,
      database: "sqlite",
      dryRun: false,
    });
    await writeFile(join(target, "db.sqlite"), "corrupt");
    await expect(
      restore({
        backup: target,
        target: join(directory, "restored.sqlite"),
        environment: "test",
        confirm: false,
        dryRun: true,
      }),
    ).rejects.toThrow("integrity");
  });
});
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "fangabase-recovery-"));
  await writeFile(join(directory, "db.sqlite"), "isolated database");
  return directory;
}
