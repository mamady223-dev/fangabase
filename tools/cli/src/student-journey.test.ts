import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertGenerationAllowed,
  completionClaimAllowed,
  needsProjectValidation,
  newJourneySession,
  readJourneySession,
  recordBriefReady,
  recordGeneration,
  recordJourneyEvidence,
  resumeJourney,
  studentJourneyStates,
  validationBlocks,
  writeJourneySession,
} from "./student-journey.js";

const sourceRoot = join(import.meta.dirname, "../../..");

describe("parcours étudiant persistant", () => {
  it("retourne les preuves de non-génération et le premier bloc", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-journey-"));
    const response = await needsProjectValidation(
      "0.4.0-rc.1",
      root,
      sourceRoot,
    );
    expect(response).toEqual(
      expect.objectContaining({
        status: "NEEDS_PROJECT_VALIDATION",
        project_generated: false,
        student_project_ready: false,
        must_continue_in_same_turn: true,
        completion_claim_allowed: false,
        first_question_block: expect.arrayContaining([
          expect.objectContaining({ id: "validation.project_name" }),
        ]),
      }),
    );
    expect(response.first_question_block).toHaveLength(5);
    await expect(access(response.workflow_file)).resolves.toBeUndefined();
  });

  it("interprète OK comme une reprise, jamais comme une fin", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-journey-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      response: "OK",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.status).toBe("PROJECT_VALIDATION_IN_PROGRESS");
    expect(response.completion_claim_allowed).toBe(false);
    expect(response.first_question_block).toHaveLength(5);
  });

  it("conserve les réponses et propose uniquement le bloc suivant", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-journey-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const answers = Object.fromEntries(
      ["project_name", "idea", "problem", "target", "market"].map((id) => [
        `validation.${id}`,
        `réponse ${id}`,
      ]),
    );
    await writeFile(join(root, "answers.json"), JSON.stringify(answers));
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      validationAnswersPath: "answers.json",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.first_question_block[0]?.id).toBe(
      "validation.problem_context",
    );
    const persisted = await readJourneySession(root);
    expect(persisted?.validation_answers).toEqual(answers);
    expect(persisted?.completed_blocks).toEqual(["A"]);
  });

  it("interdit toute génération déclarée avant les preuves", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-blocked-"));
    const session = newJourneySession();
    session.status = "READY_FOR_DRY_RUN";
    session.confirmation_received = true;
    expect(await completionClaimAllowed(session)).toBe(false);
    await writeJourneySession(root, newJourneySession());
    await expect(assertGenerationAllowed(root)).rejects.toThrow(
      "NEEDS_PROJECT_VALIDATION",
    );
  });

  it("conserve NO_GO_TEMPORAIRE sans quitter FangaBase", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-no-go-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const answers = Object.fromEntries(
      Object.values(validationBlocks)
        .flat()
        .map(({ id }) => [id, `réponse ${id}`]),
    );
    await writeFile(join(root, "answers.json"), JSON.stringify(answers));
    await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      validationAnswersPath: "answers.json",
      generatorVersion: "0.4.0-rc.1",
    });
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      decision: "NO_GO_TEMPORAIRE",
      validationScore: 48,
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.status).toBe("NEEDS_PROJECT_DECISION");
    expect(response.validation_decision).toBe("NO_GO_TEMPORAIRE");
    expect(response.validation_score).toBe(48);
    expect(response.fangabase_active).toBe(true);
    await expect(assertGenerationAllowed(root)).rejects.toThrow(
      "NEEDS_PROJECT_DECISION",
    );
  });

  it("reporte seulement les entretiens et continue les autres questions", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-deferred-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      deferTerrain: "entretiens avec les commerçants",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.status).toBe("TERRAIN_VALIDATION_DEFERRED");
    expect(response.terrain_validation).toBe("DEFERRED");
    expect(response.fangabase_active).toBe(true);
    expect(response.deferred_steps).toEqual([
      "entretiens avec les commerçants",
    ]);
    expect(response.project_generated).toBe(false);
    expect(response.first_question_block).toHaveLength(5);
  });

  it("saute une information inconnue sans sauter son bloc", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-skipped-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      skipStep: "validation.market",
      skipReason: "marché initial à confirmer",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.status).toBe("VALIDATION_STEP_SKIPPED");
    expect(response.first_question_block).toHaveLength(4);
    expect(response.unknown_information).toContain("validation.market");
    expect(response.fangabase_active).toBe(true);
  });

  it("autorise un override volontaire sans changer le score analytique", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-override-"));
    const session = newJourneySession();
    Object.assign(session, {
      status: "NEEDS_PROJECT_DECISION",
      project_decision: "NO_GO_TEMPORAIRE",
      validation_decision: "NO_GO_TEMPORAIRE",
      validation_score: 48,
      terrain_validation: "DEFERRED",
    });
    await writeJourneySession(root, session);
    const response = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      overrideUnvalidated: true,
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response).toEqual(
      expect.objectContaining({
        status: "NEEDS_TECHNICAL_ANSWERS",
        validation_decision: "NO_GO_TEMPORAIRE",
        validation_score: 48,
        student_decision: "USER_OVERRIDE_UNVALIDATED",
        generation_allowed_with_warnings: true,
        technical_questionnaire_started: true,
        project_generated: false,
      }),
    );
    expect((await readJourneySession(root))?.technical_answers).toEqual({});
  });

  it("protège la sortie par une double confirmation exacte", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-exit-"));
    await needsProjectValidation("0.4.0-rc.1", root, sourceRoot);
    const requested = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      requestExit: true,
      generatorVersion: "0.4.0-rc.1",
    });
    expect(requested.status).toBe("EXIT_CONFIRMATION_REQUIRED");
    const ambiguous = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      response: "OK",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(ambiguous.status).toBe("EXIT_CONFIRMATION_REQUIRED");
    expect(ambiguous.fangabase_active).toBe(true);
    const abandoned = await resumeJourney({
      invocationDirectory: root,
      sourceRoot,
      confirmExit: "QUITTER",
      generatorVersion: "0.4.0-rc.1",
    });
    expect(abandoned.status).toBe("ABANDONED");
    expect(abandoned.fangabase_active).toBe(false);
    expect(abandoned.project_generated).toBe(false);
  });

  it("autorise projet prêt uniquement après toutes les gates et artefacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-ready-"));
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "generation-manifest.json"), "{}\n");
    await writeFile(join(root, "fangabase.config.yaml"), "version: 1\n");
    await writeFile(join(root, "docs-final.md"), "# Rapport\n");
    const session = newJourneySession();
    Object.assign(session, {
      project_generated: true,
      generated_destination: root,
      setup_completed: true,
      doctor_status: "PASS",
      migrations_completed: true,
      tests_completed: true,
      build_completed: true,
      smoke_auth_status: "PASS",
      final_report: join(root, "docs-final.md"),
    });
    await writeJourneySession(root, session);
    expect(await completionClaimAllowed(session)).toBe(true);
  });

  it("termine un parcours non validé en PASS_WITH_WARNINGS", async () => {
    const root = await mkdtemp(join(tmpdir(), "fangabase-warning-"));
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "generation-manifest.json"), "{}\n");
    await writeFile(join(root, "fangabase.config.yaml"), "version: 1\n");
    await writeFile(
      join(root, "docs-final.md"),
      "# Rapport\n\nMarché non validé sur le terrain\n\nDéveloppement volontaire\n\nUAT terrain restante\n",
    );
    const session = newJourneySession();
    Object.assign(session, {
      status: "NEEDS_TECHNICAL_ANSWERS",
      project_decision: "NO_GO_TEMPORAIRE",
      validation_decision: "NO_GO_TEMPORAIRE",
      student_decision: "USER_OVERRIDE_UNVALIDATED",
      terrain_validation: "DEFERRED",
      generation_allowed_with_warnings: true,
      technical_answers: {
        "product.name": "Projet volontaire",
        "product.description": "Projet non validé",
        "product.type": "internal",
        "deployment.family": "cloud",
        "database.provider": "postgres",
        "email.provider": "local_log",
        "payments.provider": "none",
        "billing.mode": "none",
        "design.source": "headless",
      },
      setup_completed: true,
      doctor_status: "PASS",
      migrations_completed: true,
      tests_completed: true,
      build_completed: true,
      smoke_auth_status: "PASS",
      final_report: join(root, "docs-final.md"),
    });
    await writeJourneySession(root, session);
    await recordBriefReady(root, "version: 1\n");
    await recordGeneration({
      invocationDirectory: root,
      destination: root,
      dryRun: true,
      generated: false,
    });
    expect((await readJourneySession(root))?.status).toBe(
      "NEEDS_GENERATION_CONFIRMATION",
    );
    await recordGeneration({
      invocationDirectory: root,
      destination: root,
      dryRun: false,
      generated: true,
    });
    const completed = await recordJourneyEvidence({
      invocationDirectory: root,
      step: "report",
      result: "pass",
      reportPath: "docs-final.md",
    });
    expect(completed.status).toBe("PASS_WITH_WARNINGS");
    expect(completed.validation_decision).toBe("NO_GO_TEMPORAIRE");
  });

  it("publie tous les états stables du parcours officiel", () => {
    expect(studentJourneyStates).toContain("READY_FOR_DRY_RUN");
    expect(studentJourneyStates).toContain("NEEDS_DESIGN_ACTIVATION");
    expect(studentJourneyStates).toContain("USER_OVERRIDE_UNVALIDATED");
    expect(studentJourneyStates).toContain("ABANDONED");
    expect(studentJourneyStates.at(-1)).toBe("FAIL");
  });
});
