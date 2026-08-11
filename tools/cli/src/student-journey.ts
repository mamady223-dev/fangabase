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

export type ValidationQuestion = { id: string; question: string };

export type JourneySession = {
  protocol_version: 1;
  status: StudentJourneyStatus;
  validation_answers: Record<string, string>;
  completed_blocks: string[];
  generated_documents: string[];
  project_decision: "GO_CONDITIONNEL" | "PIVOT" | "NO_GO_TEMPORAIRE" | null;
  technical_answers: Record<string, string>;
  resolved_config: string | null;
  planned_destination: string | null;
  confirmation_received: boolean;
  project_generated: boolean;
  generated_destination: string | null;
  setup_completed: boolean;
  doctor_status: "NOT_RUN" | "PASS" | "FAIL";
  migrations_completed: boolean;
  tests_completed: boolean;
  build_completed: boolean;
  smoke_auth_status: "NOT_AVAILABLE" | "NOT_RUN" | "PASS" | "FAIL";
  design_workflow: string | null;
  final_report: string | null;
  final_status: "IN_PROGRESS" | "PASS" | "PASS_WITH_WARNINGS" | "FAIL";
};

export const validationBlocks: Record<string, ValidationQuestion[]> = {
  A: [
    {
      id: "validation.project_name",
      question: "Quel nom provisoire donnes-tu au projet ?",
    },
    {
      id: "validation.idea",
      question:
        "Explique ton idée avec tes propres mots, comme si tu parlais à une personne qui ne connaît pas la technologie.",
    },
    {
      id: "validation.problem",
      question: "Quel problème concret souhaites-tu résoudre ?",
    },
    {
      id: "validation.target",
      question: "Qui rencontre exactement ce problème ?",
    },
    {
      id: "validation.market",
      question:
        "Dans quel pays, quelle ville ou quel marché souhaites-tu commencer ?",
    },
  ],
  B: [
    {
      id: "validation.problem_context",
      question: "Dans quelle situation précise le problème apparaît-il ?",
    },
    {
      id: "validation.frequency",
      question: "À quelle fréquence apparaît-il ?",
    },
    {
      id: "validation.consequences",
      question: "Quelles conséquences concrètes provoque-t-il ?",
    },
    {
      id: "validation.current_solution",
      question: "Comment les personnes le résolvent-elles aujourd’hui ?",
    },
    {
      id: "validation.observed_example",
      question: "Donne un exemple réel que tu as observé ou vécu.",
    },
  ],
  C: [
    {
      id: "validation.direct_user",
      question: "Qui utilisera directement le produit ?",
    },
    { id: "validation.buyer", question: "Qui décidera de l’acheter ?" },
    { id: "validation.payer", question: "Qui paiera réellement ?" },
    {
      id: "validation.roles_difference",
      question: "Ces personnes sont-elles identiques ou différentes ?",
    },
    {
      id: "validation.initial_segment",
      question: "Quel premier segment très précis veux-tu servir ?",
    },
  ],
  D: [
    {
      id: "validation.current_tools",
      question:
        "Quels outils, personnes ou méthodes sont utilisés actuellement ?",
    },
    {
      id: "validation.current_limits",
      question: "Pourquoi ces solutions sont-elles insuffisantes ?",
    },
    {
      id: "validation.current_strengths",
      question: "Qu’est-ce qui fonctionne déjà bien dans ces solutions ?",
    },
    {
      id: "validation.change_reason",
      question:
        "Pourquoi un utilisateur accepterait-il de changer ses habitudes ?",
    },
    {
      id: "validation.adoption_barrier",
      question: "Quel serait le principal obstacle à l’adoption ?",
    },
  ],
  E: [
    {
      id: "validation.promised_result",
      question: "Quel résultat principal le produit promet-il ?",
    },
    {
      id: "validation.time_to_value",
      question:
        "En combien de temps l’utilisateur doit-il percevoir ce résultat ?",
    },
    {
      id: "validation.improvement",
      question:
        "Quelle action deviendra plus rapide, moins chère, plus sûre ou plus simple ?",
    },
    {
      id: "validation.difference",
      question:
        "Pourquoi utiliser ce produit plutôt qu’une solution existante ?",
    },
    {
      id: "validation.proof",
      question: "Quelle preuve pourrait convaincre un premier utilisateur ?",
    },
  ],
  F: [
    { id: "validation.potential_payer", question: "Qui pourrait payer ?" },
    {
      id: "validation.paid_value",
      question: "Pour quelle valeur exacte cette personne paierait-elle ?",
    },
    {
      id: "validation.value_frequency",
      question: "À quelle fréquence cette valeur est-elle reçue ?",
    },
    {
      id: "validation.current_cost",
      question: "Combien paie-t-elle actuellement pour résoudre le problème ?",
    },
    {
      id: "validation.business_model",
      question: "Quel modèle économique souhaites-tu tester ?",
    },
  ],
  G: [
    {
      id: "validation.builder",
      question: "Qui construira et maintiendra le produit ?",
    },
    {
      id: "validation.budget_timeline",
      question: "Quel budget et quel délai sont disponibles ?",
    },
    {
      id: "validation.expertise",
      question:
        "Quelles connaissances techniques ou métier sont déjà disponibles ?",
    },
    {
      id: "validation.dependencies",
      question:
        "Le produit dépend-il d’un partenaire, d’une API, d’une autorisation ou d’une licence ?",
    },
    {
      id: "validation.main_risk",
      question: "Quel est le plus grand risque pouvant empêcher le lancement ?",
    },
  ],
  H: [
    {
      id: "validation.personal_data",
      question: "Quelles données personnelles seront collectées ?",
    },
    {
      id: "validation.sensitive_flows",
      question: "Y aura-t-il des paiements, retraits ou données sensibles ?",
    },
    {
      id: "validation.failure_response",
      question: "Que doit-il se passer en cas d’erreur ou de fraude ?",
    },
    {
      id: "validation.connectivity_languages",
      question:
        "Quelles contraintes de connexion, mobile et langues faut-il respecter ?",
    },
    {
      id: "validation.regulatory_checks",
      question:
        "Quelles obligations doivent être confirmées par un professionnel ?",
    },
  ],
};

export function newJourneySession(): JourneySession {
  return {
    protocol_version: 1,
    status: "NEEDS_PROJECT_VALIDATION",
    validation_answers: {},
    completed_blocks: [],
    generated_documents: [],
    project_decision: null,
    technical_answers: {},
    resolved_config: null,
    planned_destination: null,
    confirmation_received: false,
    project_generated: false,
    generated_destination: null,
    setup_completed: false,
    doctor_status: "NOT_RUN",
    migrations_completed: false,
    tests_completed: false,
    build_completed: false,
    smoke_auth_status: "NOT_RUN",
    design_workflow: null,
    final_report: null,
    final_status: "IN_PROGRESS",
  };
}

export function sessionPath(invocationDirectory: string): string {
  return join(invocationDirectory, ".fangabase", "session.json");
}

export async function readJourneySession(
  invocationDirectory: string,
): Promise<JourneySession | null> {
  try {
    return JSON.parse(
      await readFile(sessionPath(invocationDirectory), "utf8"),
    ) as JourneySession;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function writeJourneySession(
  invocationDirectory: string,
  session: JourneySession,
): Promise<void> {
  const path = sessionPath(invocationDirectory);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    flag: "w",
  });
}

export async function recordGeneration(options: {
  invocationDirectory: string;
  destination: string;
  dryRun: boolean;
  generated: boolean;
  configYaml?: string;
}): Promise<void> {
  const session = await readJourneySession(options.invocationDirectory);
  if (!session) return;
  if (
    ![
      "READY_FOR_DRY_RUN",
      "NEEDS_GENERATION_CONFIRMATION",
      "GENERATING",
    ].includes(session.status)
  )
    throw new Error(
      `Génération interdite tant que le parcours est à l’état ${session.status}.`,
    );
  session.planned_destination = options.destination;
  if (options.configYaml) session.resolved_config = options.configYaml;
  if (options.dryRun) {
    session.status = "NEEDS_GENERATION_CONFIRMATION";
  } else if (options.generated) {
    session.confirmation_received = true;
    session.project_generated = true;
    session.generated_destination = options.destination;
    session.status = "NEEDS_LOCAL_SETUP";
  }
  await writeJourneySession(options.invocationDirectory, session);
}

export async function assertGenerationAllowed(
  invocationDirectory: string,
): Promise<void> {
  const session = await readJourneySession(invocationDirectory);
  if (
    session &&
    ![
      "READY_FOR_DRY_RUN",
      "NEEDS_GENERATION_CONFIRMATION",
      "GENERATING",
    ].includes(session.status)
  )
    throw new Error(
      `Génération interdite tant que le parcours est à l’état ${session.status}.`,
    );
}

export async function recordBriefReady(
  invocationDirectory: string,
  configYaml: string,
): Promise<void> {
  const session = await readJourneySession(invocationDirectory);
  if (!session) return;
  if (session.project_decision !== "GO_CONDITIONNEL")
    throw new Error(
      "Le brief guidé exige une décision GO_CONDITIONNEL explicite.",
    );
  session.resolved_config = configYaml;
  session.status = "READY_FOR_DRY_RUN";
  await writeJourneySession(invocationDirectory, session);
}

export async function recordJourneyEvidence(options: {
  invocationDirectory: string;
  step:
    | "setup"
    | "doctor"
    | "migrations"
    | "tests"
    | "build"
    | "smoke"
    | "report";
  result: "pass" | "fail" | "not_available";
  reportPath?: string;
}): Promise<JourneySession> {
  const session = await readJourneySession(options.invocationDirectory);
  if (!session) throw new Error("Aucune session FangaBase à reprendre.");
  const pass = options.result === "pass";
  if (options.step === "setup") session.setup_completed = pass;
  if (options.step === "doctor") session.doctor_status = pass ? "PASS" : "FAIL";
  if (options.step === "migrations") session.migrations_completed = pass;
  if (options.step === "tests") session.tests_completed = pass;
  if (options.step === "build") session.build_completed = pass;
  if (options.step === "smoke")
    session.smoke_auth_status =
      options.result === "not_available"
        ? "NOT_AVAILABLE"
        : pass
          ? "PASS"
          : "FAIL";
  if (options.step === "report") {
    if (!pass || !options.reportPath)
      throw new Error("Le rapport final PASS exige --report-path.");
    const path = resolve(options.invocationDirectory, options.reportPath);
    await access(path);
    session.final_report = path;
  }
  if (options.result === "fail") {
    session.status = "FAIL";
    session.final_status = "FAIL";
  }
  const allowed = await completionClaimAllowed(session);
  if (allowed) {
    session.status = "PASS";
    session.final_status = "PASS";
  }
  await writeJourneySession(options.invocationDirectory, session);
  return session;
}

export async function resumeJourney(options: {
  invocationDirectory: string;
  sourceRoot: string;
  response?: string;
  validationAnswersPath?: string;
  decision?: "GO_CONDITIONNEL" | "PIVOT" | "NO_GO_TEMPORAIRE";
  generatorVersion: string;
}) {
  const session =
    (await readJourneySession(options.invocationDirectory)) ??
    newJourneySession();
  if (options.validationAnswersPath) {
    const answers = JSON.parse(
      await readFile(
        resolve(options.invocationDirectory, options.validationAnswersPath),
        "utf8",
      ),
    ) as Record<string, unknown>;
    for (const [id, value] of Object.entries(answers)) {
      if (
        !Object.values(validationBlocks)
          .flat()
          .some((item) => item.id === id)
      )
        throw new Error(`Réponse de validation inconnue: ${id}.`);
      if (typeof value !== "string" || !value.trim())
        throw new Error(`La réponse ${id} doit être une chaîne non vide.`);
      session.validation_answers[id] = value.trim();
    }
  }
  if (session.status === "NEEDS_PROJECT_VALIDATION")
    session.status = "PROJECT_VALIDATION_IN_PROGRESS";
  updateCompletedBlocks(session);
  if (options.decision) {
    if (
      session.completed_blocks.length !== Object.keys(validationBlocks).length
    )
      throw new Error(
        "La décision exige la fin de tous les blocs de validation.",
      );
    session.project_decision = options.decision;
    session.status =
      options.decision === "GO_CONDITIONNEL"
        ? "NEEDS_TECHNICAL_ANSWERS"
        : options.decision === "PIVOT"
          ? "PROJECT_VALIDATION_IN_PROGRESS"
          : "FAIL";
  } else if (
    session.completed_blocks.length === Object.keys(validationBlocks).length
  ) {
    session.status = "NEEDS_PROJECT_DECISION";
  }
  await writeJourneySession(options.invocationDirectory, session);
  return journeyResponse(
    session,
    options.invocationDirectory,
    options.sourceRoot,
    options.generatorVersion,
  );
}

function updateCompletedBlocks(session: JourneySession): void {
  for (const [block, questions] of Object.entries(validationBlocks)) {
    if (
      questions.every((question) => session.validation_answers[question.id]) &&
      !session.completed_blocks.includes(block)
    )
      session.completed_blocks.push(block);
  }
}

function currentValidationBlock(session: JourneySession): ValidationQuestion[] {
  const block = Object.keys(validationBlocks).find(
    (name) => !session.completed_blocks.includes(name),
  );
  return block ? validationBlocks[block]! : [];
}

export async function completionClaimAllowed(
  session: JourneySession,
): Promise<boolean> {
  if (
    !session.project_generated ||
    !session.generated_destination ||
    !session.setup_completed ||
    session.doctor_status !== "PASS" ||
    !session.migrations_completed ||
    !session.tests_completed ||
    !session.build_completed ||
    !["PASS", "NOT_AVAILABLE"].includes(session.smoke_auth_status) ||
    !session.final_report
  )
    return false;
  for (const name of ["generation-manifest.json", "fangabase.config.yaml"]) {
    try {
      await access(join(session.generated_destination, name));
    } catch {
      return false;
    }
  }
  try {
    await access(session.final_report);
  } catch {
    return false;
  }
  return true;
}

async function journeyResponse(
  session: JourneySession,
  invocationDirectory: string,
  sourceRoot: string,
  generatorVersion: string,
) {
  const allowed = await completionClaimAllowed(session);
  const block = currentValidationBlock(session);
  return {
    protocol_version: 1,
    generator_version: generatorVersion,
    status: session.status,
    project_generated: session.project_generated,
    generator_ready: true,
    student_project_ready: allowed,
    workflow_file: resolve(sourceRoot, "Fanga_validation_projet.md"),
    session_file: sessionPath(invocationDirectory),
    must_continue_in_same_turn: !allowed,
    completion_claim_allowed: allowed,
    assistant_instruction:
      session.status === "NEEDS_PROJECT_VALIDATION"
        ? "Ne termine pas ta réponse. Lis maintenant intégralement workflow_file, puis pose immédiatement uniquement le premier bloc de questions."
        : block.length > 0
          ? "Ne termine pas ta réponse. Lis maintenant intégralement workflow_file, puis pose immédiatement uniquement le bloc de questions retourné."
          : session.status === "NEEDS_PROJECT_DECISION"
            ? "Présente les preuves, le score et demande une décision explicite GO_CONDITIONNEL, PIVOT ou NO_GO_TEMPORAIRE."
            : "Poursuis immédiatement avec le questionnaire technique, une seule question à la fois.",
    first_question_block: block,
    forbidden_responses: [
      "Le projet est prêt.",
      "FangaBase est généré.",
      "La génération est terminée.",
      "Revenez lorsque vous aurez préparé le cahier des charges.",
    ],
    next_expected_status:
      block.length > 0
        ? ("PROJECT_VALIDATION_IN_PROGRESS" as const)
        : session.status === "NEEDS_PROJECT_DECISION"
          ? ("NEEDS_TECHNICAL_ANSWERS" as const)
          : ("READY_FOR_DRY_RUN" as const),
  };
}

export async function needsProjectValidation(
  generatorVersion: string,
  invocationDirectory: string,
  sourceRoot: string,
) {
  const session = newJourneySession();
  await writeJourneySession(invocationDirectory, session);
  return {
    ...(await journeyResponse(
      session,
      invocationDirectory,
      sourceRoot,
      generatorVersion,
    )),
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
    terminal_message:
      "FangaBase est installé, mais aucun projet étudiant n’a encore été généré. Agent Codex : ne termine pas ce tour. Lis maintenant le fichier indiqué et pose immédiatement les cinq questions affichées ci-dessous.",
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
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
