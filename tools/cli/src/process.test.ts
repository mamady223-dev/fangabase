import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { validationBlocks } from "./student-journey.js";

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
      expect.objectContaining({
        status: "NEEDS_PROJECT_VALIDATION",
        protocol_version: 1,
        project_generated: false,
        generator_ready: true,
        student_project_ready: false,
        must_continue_in_same_turn: true,
        completion_claim_allowed: false,
      }),
    );
    expect(response.first_question_block).toHaveLength(5);
    expect(response.workflow_file).toBe(
      join(root, "Fanga_validation_projet.md"),
    );
    expect(response).not.toHaveProperty("config_yaml");
    expect(response.assistant_instruction).toContain(
      "Ne termine pas ta réponse",
    );
    expect(automatic.stdout).not.toContain("Dossier de destination:");
    expect(automatic.stdout).not.toContain(
      "What destination path should I use?",
    );
    expect(automatic.stderr).not.toContain("Dossier de destination:");
    expect(await readdir(directory)).toEqual([".fangabase"]);
    const resumed = command(["--agent", "--json", "--resume", "OK"]);
    expect(resumed.status, resumed.stderr).toBe(0);
    expect(JSON.parse(resumed.stdout)).toEqual(
      expect.objectContaining({
        status: "PROJECT_VALIDATION_IN_PROGRESS",
        project_generated: false,
        completion_claim_allowed: false,
        first_question_block: expect.any(Array),
      }),
    );
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

  it("reprend le questionnaire technique après un override sans choisir l’architecture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-override-cli-"));
    const answers = Object.fromEntries(
      Object.values(validationBlocks)
        .flat()
        .map(({ id }) => [id, `réponse ${id}`]),
    );
    await writeFile(
      join(directory, "validation.json"),
      JSON.stringify(answers),
    );
    const command = (args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve(import.meta.dirname, "index.ts"),
          "create",
          "--agent",
          "--json",
          ...args,
        ],
        { encoding: "utf8", env: { ...process.env, INIT_CWD: directory } },
      );
    expect(command([]).status).toBe(0);
    expect(command(["--validation-answers", "validation.json"]).status).toBe(0);
    expect(
      command(["--decision", "NO_GO_TEMPORAIRE", "--validation-score", "48"])
        .status,
    ).toBe(0);
    const override = command(["--override-unvalidated"]);
    expect(override.status, override.stderr).toBe(0);
    expect(JSON.parse(override.stdout)).toEqual(
      expect.objectContaining({
        status: "NEEDS_TECHNICAL_ANSWERS",
        student_decision: "USER_OVERRIDE_UNVALIDATED",
        validation_score: 48,
      }),
    );
    const technical = command([]);
    expect(technical.status, technical.stderr).toBe(0);
    const technicalResponse = JSON.parse(technical.stdout);
    expect(technicalResponse.status).toBe("NEEDS_TECHNICAL_ANSWERS");
    expect(technicalResponse.questions).toHaveLength(1);
    expect(technicalResponse.questions[0].id).toBe("product.name");
    expect(technicalResponse.questions[0]).not.toHaveProperty("default");
    expect(technicalResponse).not.toHaveProperty("config_yaml");
    expect(await readdir(directory)).toEqual(
      expect.arrayContaining([".fangabase", "validation.json"]),
    );
  });

  it("ne contient aucun chemin de remplacement par un starter extérieur", async () => {
    const orchestration = await readFile(
      resolve(import.meta.dirname, "index.ts"),
      "utf8",
    );
    for (const forbidden of [
      "composer create-project",
      "npm create",
      "npx create-",
    ])
      expect(orchestration).not.toContain(forbidden);
  });

  it("refuse la génération avant validation, dry-run et confirmation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fangabase-blocked-cli-"));
    const destination = join(directory, "generated");
    const invoke = (args: string[]) =>
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
    expect(invoke([]).status).toBe(0);
    const blocked = invoke([
      "--config",
      example,
      "--destination",
      destination,
      "--yes",
    ]);
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain("NEEDS_PROJECT_VALIDATION");
    await expect(readdir(destination)).rejects.toThrow();
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

  it("passe un brief produit valide au dry-run dans le protocole agent", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(import.meta.dirname, "index.ts"),
        "create",
        "--agent",
        "--json",
        "--brief",
        join(root, "FANGABASE_INPUT.md"),
      ],
      { encoding: "utf8", env: { ...process.env, INIT_CWD: root } },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({
        status: "READY_FOR_DRY_RUN",
        config_yaml: expect.any(String),
      }),
    );
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
        status: "READY_FOR_DRY_RUN",
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
