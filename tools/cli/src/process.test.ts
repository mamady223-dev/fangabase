import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const example = join(root, "fangabase.config.example.yaml");

describe("CLI FangaBase", () => {
  it("bascule automatiquement vers le même questionnaire JSON sans TTY", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-agent-cli-"));
    const command = (args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve(import.meta.dirname, "index.ts"),
          "create",
          ...args,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, INIT_CWD: directory },
        },
      );
    const automatic = command([]);
    const explicit = command(["--agent", "--json"]);
    expect(automatic.status, automatic.stderr).toBe(0);
    expect(explicit.status, explicit.stderr).toBe(0);
    const response = JSON.parse(automatic.stdout);
    expect(response).toEqual(JSON.parse(explicit.stdout));
    expect(response).toEqual(
      expect.objectContaining({ status: "NEEDS_ANSWERS", protocol_version: 1 }),
    );
    expect(response).not.toHaveProperty("config_yaml");
    expect(response.next_action).toEqual(
      expect.objectContaining({
        actor: "coding_agent",
        instruction: expect.stringContaining("une seule question à la fois"),
      }),
    );
    expect(automatic.stdout).not.toContain("Dossier de destination:");
    expect(automatic.stdout).not.toContain(
      "What destination path should I use?",
    );
    expect(automatic.stderr).not.toContain("Dossier de destination:");
    expect(await readdir(directory)).toEqual([]);
  });

  it("préserve le parcours create non interactif avec une configuration", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-config-cli-"));
    const destination = join(directory, "generated");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "create",
        "--config",
        example,
        "--destination",
        destination,
        "--dry-run",
        "--json",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, INIT_CWD: directory },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({ destination, generatedFiles: [] }),
    );
    expect(await readdir(directory)).toEqual([]);
  });

  it("préserve le parcours create non interactif avec un brief", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-brief-cli-"));
    const brief = join(directory, "brief.md");
    await writeFile(
      brief,
      `# Brief étudiant\n\n\`\`\`yaml fangabase\n${await readFile(example, "utf8")}\`\`\`\n`,
    );
    const destination = join(directory, "generated");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "create",
        "--brief",
        brief,
        "--destination",
        destination,
        "--dry-run",
        "--json",
      ],
      { encoding: "utf8", env: { ...process.env, INIT_CWD: directory } },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({ destination, generatedFiles: [] }),
    );
    expect(await readdir(directory)).toEqual(["brief.md"]);
  });

  it("résout un fichier de réponses complet sans générer de projet", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-agent-ready-"));
    const answers = join(directory, "answers.json");
    await writeFile(
      answers,
      JSON.stringify({
        "product.name": "Campus Mali",
        "product.description": "Gestion universitaire",
        "product.type": "saas",
        "deployment.family": "cloud",
        "database.provider": "neon",
        "email.provider": "local_log",
        "payments.provider": "none",
        "billing.mode": "none",
        "design.source": "headless",
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "create",
        "--agent",
        "--json",
        "--answers",
        answers,
      ],
      { encoding: "utf8", env: { ...process.env, INIT_CWD: directory } },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({
        status: "READY",
        config_yaml: expect.any(String),
      }),
    );
    expect(await readdir(directory)).toEqual(["answers.json"]);
  });

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
      "generator_version: 0.4.0-rc.1",
    );
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).changed).toBe(false);
  }, 15_000);
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
  it("creates the parent directory for a nested output", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-nested-"));
    const output = join(
      directory,
      "profiles",
      "cloud",
      "fangabase.config.yaml",
    );
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
    expect(await readFile(output, "utf8")).toContain("source: headless");
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
      input: "Fanga Interactif\nProfil test\n1\n1\n1\n1\n1\n1\n1\n",
    },
  );
  expect(result.status, result.stderr).toBe(0);
  const manifest = await readFile(output, "utf8");
  expect(manifest).toContain("name: Fanga Interactif");
  expect(manifest).toContain("providers: []");
  expect(manifest).toContain("source: headless");
});
