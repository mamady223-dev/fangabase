#!/usr/bin/env node
import { readFile, writeFile, copyFile, access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import { Command } from "commander";
import { configSchema } from "./config.js";
import { promptConfigYaml } from "./interactive.js";

const generatorVersion = "0.1.0";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function initialize(
  configFile: string,
  outputFile: string,
  dryRun: boolean,
  json: boolean,
): Promise<void> {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const source = resolve(invocationDirectory, configFile);
  const target = resolve(invocationDirectory, outputFile);
  const parsed = configSchema.safeParse(parse(await readFile(source, "utf8")));
  if (!parsed.success) {
    const details = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Configuration FangaBase invalide:\n${details.join("\n")}`);
  }
  const manifest = { generator_version: generatorVersion, ...parsed.data };
  const serialized = stringify(manifest, { lineWidth: 100 });
  const current = (await exists(target))
    ? await readFile(target, "utf8")
    : null;
  const changed = current !== serialized;
  if (!dryRun && changed) {
    if (current !== null) await copyFile(target, `${target}.bak`);
    await writeFile(target, serialized, { encoding: "utf8", flag: "w" });
  }
  const result = {
    ok: true,
    changed,
    dry_run: dryRun,
    output: target,
    generator_version: generatorVersion,
    manifest,
  };
  process.stdout.write(
    json
      ? `${JSON.stringify(result)}\n`
      : `${changed ? "Configuration résolue" : "Configuration déjà à jour"}: ${target}\n`,
  );
}

const program = new Command().name("fangabase").version(generatorVersion);
program
  .option(
    "--config <path>",
    "configuration YAML; sinon questionnaire interactif",
  )
  .option("--output <path>", "manifeste résolu", "fangabase.config.yaml")
  .option("--dry-run", "n'écrit aucun fichier", false)
  .option("--json", "sortie JSON", false)
  .action(async (options) => {
    if (options.config)
      return initialize(
        options.config,
        options.output,
        options.dryRun,
        options.json,
      );
    const temporary = join(tmpdir(), `fangabase-${randomUUID()}.yaml`);
    await writeFile(temporary, await promptConfigYaml(), "utf8");
    try {
      await initialize(temporary, options.output, options.dryRun, options.json);
    } finally {
      await rm(temporary, { force: true });
    }
  });
program.command("doctor").action(() => {
  process.stdout.write(
    JSON.stringify({
      node: process.version,
      platform: process.platform,
      generator_version: generatorVersion,
      ok: true,
    }) + "\n",
  );
});
program.parseAsync().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
