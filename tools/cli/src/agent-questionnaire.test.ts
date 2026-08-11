import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runAgentQuestionnaire } from "./agent-questionnaire.js";
import {
  configFromAnswers,
  interactiveAnswer,
  isQuestionVisible,
  questionRegistry,
  serializeConfig,
  type Answers,
} from "./questions.js";

function complete(overrides: Answers = {}): Answers {
  return {
    "product.name": "Campus Mali",
    "product.description": "Gestion universitaire",
    "product.type": "saas",
    "deployment.family": "cloud",
    "database.provider": "neon",
    "email.provider": "local_log",
    "payments.provider": "none",
    "billing.mode": "none",
    "design.source": "headless",
    ...overrides,
  };
}

async function run(answers?: unknown) {
  const root = await mkdtemp(join(tmpdir(), "fangabase-agent-test-"));
  if (answers !== undefined)
    await writeFile(join(root, "answers.json"), JSON.stringify(answers));
  return {
    root,
    response: await runAgentQuestionnaire({
      invocationDirectory: root,
      ...(answers !== undefined ? { answersPath: "answers.json" } : {}),
    }),
  };
}

describe("questionnaire agent", () => {
  it("retourne NEEDS_ANSWERS sans TTY avec un protocole versionné", async () => {
    const { response } = await run();
    expect(response.status).toBe("NEEDS_ANSWERS");
    expect(response.protocol_version).toBe(1);
    expect(response.generator_version).toBe("0.4.0-rc.1");
  });

  it("produit une structure JSON sérialisable", async () => {
    const { response } = await run();
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });

  it("conserve les identifiants ordonnés et uniques", () => {
    const ids = questionRegistry.map((question) => question.id);
    expect(ids).toEqual([
      "product.name",
      "product.description",
      "product.type",
      "deployment.family",
      "architecture.vps_variant",
      "architecture.shared_variant",
      "architecture.hybrid_frontend",
      "database.provider",
      "email.provider",
      "payments.provider",
      "billing.mode",
      "design.source",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("publie les valeurs par défaut du parcours PowerShell", async () => {
    const { response } = await run({ "deployment.family": "cloud" });
    expect(
      response.questions.find((question) => question.id === "database.provider")
        ?.default,
    ).toBe("neon");
    expect(
      questionRegistry.find((question) => question.id === "design.source")
        ?.default,
    ).toBe("headless");
  });

  it("affiche la variante VPS uniquement pour un VPS", () => {
    const question = questionRegistry.find(
      (item) => item.id === "architecture.vps_variant",
    )!;
    expect(isQuestionVisible(question, { "deployment.family": "vps" })).toBe(
      true,
    );
    expect(isQuestionVisible(question, { "deployment.family": "cloud" })).toBe(
      false,
    );
  });

  it("affiche le frontend hybride uniquement pour un profil hybride", () => {
    const question = questionRegistry.find(
      (item) => item.id === "architecture.hybrid_frontend",
    )!;
    expect(isQuestionVisible(question, { "deployment.family": "hybrid" })).toBe(
      true,
    );
    expect(isQuestionVisible(question, { "deployment.family": "vps" })).toBe(
      false,
    );
  });

  it("résout Laravel/Inertia comme une application VPS intégrée", () => {
    const config = configFromAnswers(
      complete({
        "deployment.family": "vps",
        "architecture.vps_variant": "laravel_inertia_react",
        "database.provider": "postgres",
      }),
    );
    expect(config.architecture).toEqual(
      expect.objectContaining({
        backend: "laravel",
        frontend: "react",
        ui: "inertia_react",
        integration: "inertia",
      }),
    );
    expect(config.frontend_connection).toBeUndefined();
  });

  it("résout Laravel/Inertia comme une application mutualisée intégrée", () => {
    const config = configFromAnswers(
      complete({
        "deployment.family": "shared",
        "architecture.shared_variant": "laravel_inertia_react",
        "database.provider": "mysql",
      }),
    );
    expect(config.architecture.integration).toBe("inertia");
    expect(config.deployment?.family).toBe("shared");
  });

  it("retourne uniquement les questions manquantes après des réponses partielles", async () => {
    const { response } = await run({
      "product.name": "Campus Mali",
      "deployment.family": "vps",
    });
    expect(response.status).toBe("NEEDS_ANSWERS");
    expect(response.questions.map((question) => question.id)).toContain(
      "architecture.vps_variant",
    );
    expect(response.questions.map((question) => question.id)).not.toContain(
      "product.name",
    );
  });

  it("retourne des erreurs précises pour une réponse inconnue", async () => {
    const { response } = await run({ "deployment.family": "bateau" });
    expect(response.status).toBe("INVALID_ANSWERS");
    expect(response.errors).toEqual([
      expect.objectContaining({
        question_id: "deployment.family",
        code: "INVALID_CHOICE",
      }),
    ]);
  });

  it("refuse une combinaison de base incompatible", async () => {
    const { response } = await run(complete({ "database.provider": "mysql" }));
    expect(response.status).toBe("INVALID_ANSWERS");
    expect(response.errors[0]?.code).toBe("INCOMPATIBLE_ANSWER");
  });

  it("retourne READY, le YAML résolu et le résumé pour des réponses complètes", async () => {
    const { response } = await run(complete());
    expect(response.status).toBe("READY");
    expect(parse(response.config_yaml!)).toEqual(configFromAnswers(complete()));
    expect(response.summary).toEqual(
      expect.objectContaining({ backend: "next", design: "headless" }),
    );
  });

  it("produit exactement la même configuration que les réponses interactives", () => {
    const raw = [
      "Campus Mali",
      "Gestion universitaire",
      "1",
      "1",
      "1",
      "1",
      "1",
      "1",
      "1",
    ];
    const interactive: Answers = {};
    let index = 0;
    for (const question of questionRegistry) {
      if (!isQuestionVisible(question, interactive)) continue;
      interactive[question.id] = interactiveAnswer(
        question,
        raw[index++]!,
        interactive,
      );
    }
    expect(parse(serializeConfig(interactive))).toEqual(
      configFromAnswers(complete()),
    );
  });

  it("n’écrit aucun fichier de projet en mode agent", async () => {
    const { root, response } = await run(complete());
    expect(response.status).toBe("READY");
    expect(await readdir(root)).toEqual(["answers.json"]);
    expect(await readFile(join(root, "answers.json"), "utf8")).toBe(
      JSON.stringify(complete()),
    );
  });

  it("refuse une réponse conditionnelle hors de son profil", async () => {
    const { response } = await run(
      complete({ "architecture.vps_variant": "next" }),
    );
    expect(response.status).toBe("INVALID_ANSWERS");
    expect(response.errors[0]).toEqual(
      expect.objectContaining({ question_id: "architecture.vps_variant" }),
    );
  });
});
