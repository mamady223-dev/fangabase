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
import { shouldUseAutomaticAgentMode } from "./create-mode.js";
import {
  assertGenerationAllowed,
  journeyQuestionnaireResult,
  needsProjectValidation,
  readJourneySession,
  recordBriefReady,
  recordGeneration,
  recordJourneyEvidence,
  recordTechnicalQuestionnaire,
  readyFromBrief,
  resumeJourney,
} from "./student-journey.js";

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
  .option("--resume <text>", "reprend la session guidée (usage agent interne)")
  .option(
    "--validation-answers <path>",
    "réponses JSON de validation (usage agent interne)",
  )
  .option(
    "--decision <decision>",
    "GO_CONDITIONNEL, PIVOT ou NO_GO_TEMPORAIRE (usage agent interne)",
  )
  .option("--validation-score <number>", "score analytique sur 100")
  .option("--skip-step <id>", "reporte une question de validation précise")
  .option("--skip-reason <text>", "raison du saut limité")
  .option("--defer-terrain <text>", "validation terrain reportée")
  .option("--override-unvalidated", "continue malgré les preuves manquantes")
  .option("--quit-fangabase", "demande protégée de sortie complète")
  .option("--confirm-exit <text>", "QUITTER ou CONTINUER")
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
    const sourceRoot = resolve(import.meta.dirname, "../../..");
    if (options.answers && !options.agent)
      throw new Error("--answers est disponible uniquement avec --agent.");
    const automaticAgent = shouldUseAutomaticAgentMode(
      process.stdin.isTTY === true,
      options,
    );
    if (options.agent || automaticAgent) {
      if (!options.json && !automaticAgent)
        throw new Error(
          "--agent exige --json afin de garantir un protocole stable.",
        );
      const incompatible = [
        "config",
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
            next_action: {
              actor: "coding_agent",
              instruction:
                "Relancez le questionnaire agent sans option de génération ni d’écriture.",
            },
          })}\n`,
        );
        return;
      }
      if (
        options.resume ||
        options.validationAnswers ||
        options.decision ||
        options.skipStep ||
        options.deferTerrain ||
        options.overrideUnvalidated ||
        options.quitFangabase ||
        options.confirmExit
      ) {
        if (
          options.decision &&
          !["GO_CONDITIONNEL", "PIVOT", "NO_GO_TEMPORAIRE"].includes(
            options.decision,
          )
        )
          throw new Error("Décision de projet invalide.");
        const validationScore =
          options.validationScore === undefined
            ? undefined
            : Number(options.validationScore);
        if (
          validationScore !== undefined &&
          (!Number.isInteger(validationScore) ||
            validationScore < 0 ||
            validationScore > 100)
        )
          throw new Error(
            "Le score de validation doit être un entier de 0 à 100.",
          );
        process.stdout.write(
          `${JSON.stringify(
            await resumeJourney({
              invocationDirectory,
              sourceRoot,
              generatorVersion,
              ...(options.resume ? { response: options.resume } : {}),
              ...(options.validationAnswers
                ? { validationAnswersPath: options.validationAnswers }
                : {}),
              ...(options.decision ? { decision: options.decision } : {}),
              ...(validationScore !== undefined ? { validationScore } : {}),
              ...(options.skipStep ? { skipStep: options.skipStep } : {}),
              ...(options.skipReason ? { skipReason: options.skipReason } : {}),
              ...(options.deferTerrain
                ? { deferTerrain: options.deferTerrain }
                : {}),
              ...(options.overrideUnvalidated
                ? { overrideUnvalidated: true }
                : {}),
              ...(options.quitFangabase ? { requestExit: true } : {}),
              ...(options.confirmExit
                ? { confirmExit: options.confirmExit }
                : {}),
            }),
          )}\n`,
        );
        return;
      }
      if (!options.answers && !options.brief) {
        const currentSession = await readJourneySession(invocationDirectory);
        if (currentSession?.technical_questionnaire_started) {
          process.stdout.write(
            `${JSON.stringify(
              journeyQuestionnaireResult(
                await runAgentQuestionnaire({ invocationDirectory }),
              ),
            )}\n`,
          );
          return;
        }
        process.stdout.write(
          `${JSON.stringify(
            await needsProjectValidation(
              generatorVersion,
              invocationDirectory,
              sourceRoot,
            ),
          )}\n`,
        );
        return;
      }
      if (options.brief) {
        const config = await readBrief(
          resolve(invocationDirectory, options.brief),
        );
        await recordBriefReady(invocationDirectory, stringify(config));
        process.stdout.write(
          `${JSON.stringify(readyFromBrief(config, generatorVersion))}\n`,
        );
        return;
      }
      process.stdout.write(
        `${JSON.stringify(
          await (async () => {
            const result = journeyQuestionnaireResult(
              await runAgentQuestionnaire({
                invocationDirectory,
                ...(options.answers ? { answersPath: options.answers } : {}),
              }),
            );
            await recordTechnicalQuestionnaire({
              invocationDirectory,
              result,
              ...(options.answers ? { answersPath: options.answers } : {}),
            });
            return result;
          })(),
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
    await assertGenerationAllowed(invocationDirectory);
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
    await recordGeneration({
      invocationDirectory,
      destination,
      dryRun: options.dryRun,
      generated: !options.dryRun,
      configYaml: stringify(config),
    });
    const journey = await readJourneySession(invocationDirectory);
    const journeyContext = journey
      ? {
          validation_decision: journey.validation_decision,
          validation_score: journey.validation_score,
          student_decision: journey.student_decision,
          terrain_validation: journey.terrain_validation,
          warnings: journey.warnings,
          generation_allowed_with_warnings:
            journey.generation_allowed_with_warnings,
          ...(journey.student_decision === "USER_OVERRIDE_UNVALIDATED"
            ? {
                confirmation_prompt:
                  "Le projet n’a pas été validé sur le terrain, mais tu as choisi de continuer en connaissance de cause. Réponds exactement OUI pour générer avec FangaBase, ou NON pour annuler.",
              }
            : {}),
        }
      : null;
    process.stdout.write(
      options.json
        ? `${JSON.stringify({ ...result, ...(journeyContext ? { journey: journeyContext } : {}) })}\n`
        : options.dryRun
          ? `Dry-run: ${result.files.length} sources prévues, aucune écriture.\n`
          : `Projet créé: ${result.destination}\nCommandes:\n${result.commands.join("\n")}\n`,
    );
  });
program
  .command("journey")
  .description("état persistant du parcours guidé (usage agent interne)")
  .option("--status", "affiche l’état courant")
  .option(
    "--record <step>",
    "enregistre setup, doctor, migrations, tests, build, smoke ou report",
  )
  .option("--result <result>", "pass, fail ou not_available")
  .option("--report-path <path>", "rapport final réellement produit")
  .action(async (options) => {
    const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
    if (options.status) {
      process.stdout.write(
        `${JSON.stringify(await readJourneySession(invocationDirectory))}\n`,
      );
      return;
    }
    if (!options.record || !options.result)
      throw new Error("journey exige --status ou --record avec --result.");
    if (
      ![
        "setup",
        "doctor",
        "migrations",
        "tests",
        "build",
        "smoke",
        "report",
      ].includes(options.record) ||
      !["pass", "fail", "not_available"].includes(options.result)
    )
      throw new Error("Étape ou résultat de parcours invalide.");
    process.stdout.write(
      `${JSON.stringify(
        await recordJourneyEvidence({
          invocationDirectory,
          step: options.record,
          result: options.result,
          ...(options.reportPath ? { reportPath: options.reportPath } : {}),
        }),
      )}\n`,
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
