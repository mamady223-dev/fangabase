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

  it("persiste une décision et bloque NO_GO_TEMPORAIRE", async () => {
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
      generatorVersion: "0.4.0-rc.1",
    });
    expect(response.status).toBe("FAIL");
    await expect(assertGenerationAllowed(root)).rejects.toThrow("FAIL");
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

  it("publie tous les états stables du parcours officiel", () => {
    expect(studentJourneyStates).toContain("READY_FOR_DRY_RUN");
    expect(studentJourneyStates).toContain("NEEDS_DESIGN_ACTIVATION");
    expect(studentJourneyStates.at(-1)).toBe("FAIL");
  });
});
