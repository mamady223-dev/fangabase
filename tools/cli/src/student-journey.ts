import type { AgentQuestionnaireResult } from "./agent-questionnaire.js";
import type { FangaBaseConfig } from "./config.js";
import { componentRegistry, resolveComponents } from "./project-generator.js";
import { stringify } from "yaml";

export const studentJourneyStates = [
  "NEEDS_PROJECT_VALIDATION",
  "PROJECT_VALIDATION_IN_PROGRESS",
  "NEEDS_PRODUCT_RESEARCH",
  "NEEDS_PROJECT_DECISION",
  "NEEDS_TECHNICAL_ANSWERS",
  "INVALID_ANSWERS",
  "READY_FOR_DRY_RUN",
  "NEEDS_GENERATION_CONFIRMATION",
  "GENERATING",
  "NEEDS_LOCAL_SETUP",
  "NEEDS_ENV_CONFIGURATION",
  "NEEDS_EXTERNAL_CREDENTIALS",
  "READY_FOR_SMOKE",
  "NEEDS_DESIGN_ACTIVATION",
  "DESIGN_IN_PROGRESS",
  "READY_FOR_FINAL_VALIDATION",
  "PASS",
  "PASS_WITH_WARNINGS",
  "FAIL",
] as const;

export type StudentJourneyStatus = (typeof studentJourneyStates)[number];

export function needsProjectValidation(generatorVersion: string) {
  return {
    protocol_version: 1,
    generator_version: generatorVersion,
    status: "NEEDS_PROJECT_VALIDATION" as const,
    workflow_file: "Fanga_validation_projet.md",
    required_documents: [
      "PRD.md",
      "CAHIER_DES_CHARGES.md",
      "RECHERCHE_MARCHE.md",
      "MVP.md",
      "PARCOURS_UTILISATEURS.md",
      "BACKLOG_MVP.md",
      "RISQUES_ET_HYPOTHESES.md",
      "FANGABASE_INPUT.md",
    ],
    next_action:
      "Lire intégralement le workflow, puis accompagner l’étudiant par blocs de cinq questions maximum.",
  };
}

export function readyFromBrief(
  config: FangaBaseConfig,
  generatorVersion: string,
) {
  const included = resolveComponents(config);
  return {
    protocol_version: 1,
    generator_version: generatorVersion,
    status: "READY_FOR_DRY_RUN" as const,
    questions: [],
    errors: [],
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
      excluded_components: Object.keys(componentRegistry).filter(
        (id) => !included.includes(id),
      ),
    },
    next_action: {
      actor: "coding_agent" as const,
      instruction:
        "Le brief est valide. Demandez maintenant une destination hors du dépôt, exécutez le dry-run réel et attendez OUI.",
    },
  };
}

export function journeyQuestionnaireResult(
  result: AgentQuestionnaireResult,
): AgentQuestionnaireResult {
  if (result.status === "NEEDS_ANSWERS")
    return { ...result, status: "NEEDS_TECHNICAL_ANSWERS" };
  if (result.status === "READY")
    return { ...result, status: "READY_FOR_DRY_RUN" };
  return result;
}
