#!/usr/bin/env node
import {
  readFile,
  writeFile,
  copyFile,
  access,
  rm,
  mkdir,
} from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import { Command } from "commander";
import { configSchema } from "./config.js";
import {
  promptConfigYaml,
  promptConfirmation,
  promptDestination,
} from "./interactive.js";
import { deploymentFiles } from "./deployment.js";
import { runSmoke } from "./smoke.js";
import { backup, restore } from "./recovery.js";
import { generateProject, planProject } from "./project-generator.js";
import { runDoctor } from "./doctor.js";
import { readBrief } from "./brief.js";
import { runAgentQuestionnaire } from "./agent-questionnaire.js";
import { generatorVersion } from "./questions.js";

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
  let changed = current !== serialized;
  const deploymentRoot = join(dirname(target), "deployment");
  const generated = deploymentFiles(parsed.data);
  const conflicts: string[] = [];
  if (!dryRun && changed) {
    await mkdir(dirname(target), { recursive: true });
    if (current !== null) await copyFile(target, `${target}.bak`);
    await writeFile(target, serialized, { encoding: "utf8", flag: "w" });
  }
  for (const file of generated) {
    const path = join(deploymentRoot, file.path);
    const existing = (await exists(path)) ? await readFile(path, "utf8") : null;
    if (existing === file.content) continue;
    if (existing !== null) {
      conflicts.push(path);
      continue;
    }
    changed = true;
    if (!dryRun) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content, { encoding: "utf8", flag: "wx" });
    }
  }
  const result = {
    ok: true,
    changed,
    dry_run: dryRun,
    output: target,
    generator_version: generatorVersion,
    manifest,
    deployment_files: generated.map((file) => join(deploymentRoot, file.path)),
    conflicts,
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
  .action(async (options, command) => {
    options = { ...command.optsWithGlobals(), ...options };
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
program
  .command("doctor")
  .option("--config <path>", "configuration du projet", "fangabase.config.yaml")
  .action(async (options) => {
    const result = await runDoctor(options.config);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === "FAIL") process.exitCode = 1;
  });
program
  .command("create")
  .option("--agent", "questionnaire JSON en lecture seule pour un agent", false)
  .option("--answers <path>", "réponses JSON du questionnaire agent")
  .option("--brief <path>", "brief Markdown contenant un bloc yaml fangabase")
  .option("--product-docs <path>", "dossier de documents produit Markdown")
  .option("--destination <path>", "nouveau dossier indépendant")
  .option(
    "--force",
    "autorise uniquement une destination vide existante",
    false,
  )
  .option("--yes", "confirmation explicite non interactive", false)
  .action(async (options, command) => {
    options = { ...command.optsWithGlobals(), ...options };
    const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
    if (options.answers && !options.agent)
      throw new Error("--answers est disponible uniquement avec --agent.");
    if (options.agent) {
      if (!options.json)
        throw new Error(
          "--agent exige --json afin de garantir un protocole stable.",
        );
      const incompatible = [
        "config",
        "brief",
        "productDocs",
        "destination",
        "force",
        "yes",
        "dryRun",
      ].filter((name) => options[name]);
      if (incompatible.length) {
        process.stdout.write(
          `${JSON.stringify({
            protocol_version: 1,
            generator_version: generatorVersion,
            status: "INVALID_ANSWERS",
            questions: [],
            errors: incompatible.map((name) => ({
              question_id: "$",
              code: "INCOMPATIBLE_OPTION",
              message: `L’option ${name} ne peut pas être utilisée avec --agent.`,
            })),
            next_action:
              "Relancez le questionnaire agent sans option de génération ni d’écriture.",
          })}\n`,
        );
        return;
      }
      process.stdout.write(
        `${JSON.stringify(
          await runAgentQuestionnaire({
            invocationDirectory,
            ...(options.answers ? { answersPath: options.answers } : {}),
          }),
        )}\n`,
      );
      return;
    }
    let config;
    if (options.config && options.brief)
      throw new Error("Utilisez soit --config, soit --brief, jamais les deux.");
    if (options.brief) {
      config = await readBrief(resolve(invocationDirectory, options.brief));
    } else if (options.config) {
      const source = resolve(invocationDirectory, options.config);
      const result = configSchema.safeParse(
        parse(await readFile(source, "utf8")),
      );
      if (!result.success)
        throw new Error(
          `Configuration FangaBase invalide:\n${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
        );
      config = result.data;
    } else {
      const temporary = parse(await promptConfigYaml());
      config = configSchema.parse(temporary);
    }
    const destination = resolve(
      invocationDirectory,
      options.destination ?? (await promptDestination()),
    );
    const sourceRoot = resolve(import.meta.dirname, "../../..");
    const plan = planProject(config, destination, sourceRoot);
    if (!options.json) {
      process.stdout.write(
        [
          `Projet: ${config.product.name}`,
          `Destination: ${plan.destination}`,
          `Backend: ${config.architecture.backend}`,
          `Frontend: ${config.architecture.frontend}`,
          `Déploiement: ${config.deployment?.family}`,
          `Base: ${config.database.engine}`,
          `E-mail: ${config.email.provider}`,
          `Paiement: ${config.payments.providers.join(", ") || "aucun"}`,
          `Facturation: ${config.billing.modes.join(", ")}`,
          `Design: ${config.design.source}`,
          `Inclus: ${plan.included.join(", ")}`,
          `Exclus: ${plan.excluded.join(", ")}`,
        ].join("\n") + "\n",
      );
    }
    const confirmed =
      options.dryRun ||
      options.yes ||
      (!options.config && (await promptConfirmation()));
    const result = await generateProject({
      config,
      destination,
      sourceRoot,
      force: options.force,
      confirmed,
      dryRun: options.dryRun,
      ...(options.productDocs
        ? { productDocs: resolve(invocationDirectory, options.productDocs) }
        : {}),
    });
    process.stdout.write(
      options.json
        ? `${JSON.stringify(result)}\n`
        : options.dryRun
          ? `Dry-run: ${result.files.length} sources prévues, aucune écriture.\n`
          : `Projet créé: ${result.destination}\nCommandes:\n${result.commands.join("\n")}\n`,
    );
  });
program
  .command("smoke")
  .requiredOption("--url <url>")
  .option("--frontend <url>")
  .option("--timeout <milliseconds>", "request timeout", "5000")
  .action(async (options) => {
    const result = await runSmoke({
      url: options.url,
      frontend: options.frontend,
      timeoutMs: Number(options.timeout),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
  });
program
  .command("backup")
  .requiredOption("--source <file>")
  .requiredOption("--target <directory>")
  .requiredOption("--database <engine>")
  .option("--dry-run", "plan only", false)
  .action(async (options) => {
    if (!["postgres", "mysql", "sqlite"].includes(options.database))
      throw new Error("database must be postgres, mysql or sqlite");
    process.stdout.write(
      `${JSON.stringify(await backup({ source: options.source, target: options.target, database: options.database, dryRun: options.dryRun }), null, 2)}\n`,
    );
  });
program
  .command("restore")
  .requiredOption("--backup <directory>")
  .requiredOption("--target <file>")
  .requiredOption("--environment <name>")
  .option("--confirm", "confirm destructive restore", false)
  .option("--dry-run", "verify only", false)
  .action((options) => restore(options));
program.parseAsync().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
