import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  configFromAnswers,
  generatorVersion,
  missingQuestions,
  questionnaireProtocolVersion,
  questionRegistry,
  validateAnswers,
  type Answers,
  type QuestionDefinition,
} from "./questions.js";
import { stringify } from "yaml";
import { componentRegistry, resolveComponents } from "./project-generator.js";

type QuestionnaireError = {
  question_id: string;
  code: string;
  message: string;
};

export type AgentQuestionnaireResult = {
  protocol_version: number;
  generator_version: string;
  status: "INVALID_ANSWERS" | "NEEDS_ANSWERS" | "READY";
  questions: ReturnType<typeof publicQuestion>[];
  errors: QuestionnaireError[];
  config_yaml?: string;
  summary?: Record<string, unknown>;
  next_action: string;
};

export async function runAgentQuestionnaire(options: {
  answersPath?: string;
  invocationDirectory: string;
}): Promise<AgentQuestionnaireResult> {
  if (!options.answersPath)
    return result("NEEDS_ANSWERS", questionRegistry, []);
  let rawAnswers: unknown = {};
  if (options.answersPath) {
    const path = resolve(options.invocationDirectory, options.answersPath);
    try {
      rawAnswers = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      return result(
        "INVALID_ANSWERS",
        [],
        [
          {
            question_id: "$",
            code: "INVALID_JSON",
            message: `Impossible de lire les réponses JSON: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      );
    }
  }
  const validated = validateAnswers(rawAnswers);
  if (validated.errors.length)
    return result("INVALID_ANSWERS", [], validated.errors, validated.answers);

  const compatibilityErrors = validateCompatibility(validated.answers);
  if (compatibilityErrors.length)
    return result(
      "INVALID_ANSWERS",
      [],
      compatibilityErrors,
      validated.answers,
    );

  const missing = missingQuestions(validated.answers);
  if (missing.length)
    return result("NEEDS_ANSWERS", missing, [], validated.answers);

  try {
    const config = configFromAnswers(validated.answers);
    const included = resolveComponents(config);
    const excluded = Object.keys(componentRegistry).filter(
      (id) => !included.includes(id),
    );
    return {
      ...result("READY", [], [], validated.answers),
      config_yaml: stringify(config),
      summary: {
        product: config.product.name,
        architecture: config.architecture.target,
        backend: config.architecture.backend,
        frontend: config.architecture.frontend,
        database: config.database.provider,
        email: config.email.provider,
        payments: config.payments.providers,
        billing: config.billing.modes,
        design: config.design.source,
        features: config.features,
        included_components: included,
        excluded_components: excluded,
      },
      next_action:
        "Enregistrez config_yaml dans un fichier, vérifiez le résumé avec l’étudiant, puis lancez pnpm create:project --config <fichier> --destination <dossier> --yes.",
    };
  } catch (error) {
    return result(
      "INVALID_ANSWERS",
      [],
      [
        {
          question_id: "$",
          code: "INCOMPATIBLE_ANSWERS",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      validated.answers,
    );
  }
}

function validateCompatibility(answers: Answers): QuestionnaireError[] {
  const family = answers["deployment.family"];
  const database = answers["database.provider"];
  const vps = answers["architecture.vps_variant"];
  const errors: QuestionnaireError[] = [];
  if (
    family === "cloud" &&
    database &&
    !["neon", "supabase", "postgres"].includes(database)
  )
    errors.push(
      incompatible(
        "database.provider",
        "Le profil cloud accepte uniquement neon, supabase ou postgres.",
      ),
    );
  if (family === "shared" && database && database !== "mysql")
    errors.push(
      incompatible("database.provider", "Le profil mutualisé impose mysql."),
    );
  if (family === "vps" && vps === "next" && database && database !== "postgres")
    errors.push(
      incompatible(
        "database.provider",
        "Le profil VPS Next.js autonome impose postgres.",
      ),
    );
  if (
    family &&
    family !== "vps" &&
    answers["architecture.vps_variant"] !== undefined
  )
    errors.push(
      incompatible(
        "architecture.vps_variant",
        "Cette réponse est autorisée uniquement pour deployment.family=vps.",
      ),
    );
  if (
    family &&
    family !== "hybrid" &&
    answers["architecture.hybrid_frontend"] !== undefined
  )
    errors.push(
      incompatible(
        "architecture.hybrid_frontend",
        "Cette réponse est autorisée uniquement pour deployment.family=hybrid.",
      ),
    );
  return errors;
}

function incompatible(questionId: string, message: string): QuestionnaireError {
  return { question_id: questionId, code: "INCOMPATIBLE_ANSWER", message };
}

function result(
  status: AgentQuestionnaireResult["status"],
  questions: readonly QuestionDefinition[],
  errors: QuestionnaireError[],
  answers: Answers = {},
): AgentQuestionnaireResult {
  return {
    protocol_version: questionnaireProtocolVersion,
    generator_version: generatorVersion,
    status,
    questions: questions.map((question) => publicQuestion(question, answers)),
    errors,
    next_action:
      status === "NEEDS_ANSWERS"
        ? "Posez uniquement les questions retournées, enregistrez les réponses par identifiant stable, puis relancez avec --answers <file.json>."
        : status === "INVALID_ANSWERS"
          ? "Corrigez uniquement les erreurs indiquées puis relancez avec --answers <file.json>."
          : "",
  };
}

function publicQuestion(question: QuestionDefinition, answers: Answers = {}) {
  const family = answers["deployment.family"];
  const vps = answers["architecture.vps_variant"];
  const defaultValue =
    question.id === "database.provider"
      ? family === "cloud"
        ? "neon"
        : family === "shared"
          ? "mysql"
          : "postgres"
      : question.default;
  const choices =
    question.id !== "database.provider"
      ? question.choices
      : family === "cloud"
        ? question.choices?.filter((item) => item.value !== "mysql")
        : family === "shared"
          ? question.choices?.filter((item) => item.value === "mysql")
          : family === "vps" && vps === "next"
            ? question.choices?.filter((item) => item.value === "postgres")
            : family === "vps" || family === "hybrid"
              ? question.choices?.filter((item) =>
                  ["postgres", "mysql"].includes(item.value),
                )
              : question.choices;
  return {
    id: question.id,
    label: question.label,
    type: question.type,
    required: question.required,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(choices
      ? {
          choices: choices.map(({ value, label }) => ({
            value,
            label,
          })),
        }
      : {}),
    ...(question.conditions ? { conditions: question.conditions } : {}),
    compatibility: question.compatibility ?? [],
    examples: question.examples,
  };
}
