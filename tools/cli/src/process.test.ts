import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const example = join(root, "fangabase.config.example.yaml");

describe("CLI FangaBase", () => {
  it("produit un manifeste puis reste idempotent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-cli-"));
    const output = join(directory, "fangabase.config.yaml");
    const run = () =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve(import.meta.dirname, "index.ts"),
          "--config",
          example,
          "--output",
          output,
          "--json",
        ],
        { encoding: "utf8" },
      );
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    expect(JSON.parse(first.stdout).changed).toBe(true);
    expect(await readFile(output, "utf8")).toContain(
      "generator_version: 0.1.0",
    );
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).changed).toBe(false);
  });
  it("dry-run lists files without writing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-dry-"));
    const output = join(directory, "fangabase.config.yaml");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "--config",
        example,
        "--output",
        output,
        "--dry-run",
        "--json",
      ],
      { encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).deployment_files.length).toBeGreaterThan(
      0,
    );
    await expect(readFile(output, "utf8")).rejects.toThrow();
  });
  it("preserves a customized generated-path file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-conflict-"));
    const output = join(directory, "fangabase.config.yaml");
    const custom = join(directory, "deployment", "README.md");
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(join(directory, "deployment"), { recursive: true }),
    );
    await writeFile(custom, "custom user runbook\n");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "--config",
        example,
        "--output",
        output,
        "--json",
      ],
      { encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).conflicts).toContain(custom);
    expect(await readFile(custom, "utf8")).toBe("custom user runbook\n");
  });
});
it("accepte le questionnaire interactif minimal", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fangabase-interactive-"));
  const output = join(directory, "fangabase.config.yaml");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      resolve(import.meta.dirname, "index.ts"),
      "--output",
      output,
      "--json",
    ],
    {
      encoding: "utf8",
      input: "Fanga Interactif\nProfil test\n1\n1\n1\n3\n1\n1\n",
    },
  );
  expect(result.status, result.stderr).toBe(0);
  const manifest = await readFile(output, "utf8");
  expect(manifest).toContain("name: Fanga Interactif");
  expect(manifest).toContain("providers: []");
  expect(manifest).toContain("source: headless");
});
