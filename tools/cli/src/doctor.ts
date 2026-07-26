import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parse } from "yaml";
import { configSchema, type FangaBaseConfig } from "./config.js";

export type DoctorCheck = {
  name: string;
  status: "PASS" | "WARNING" | "FAIL";
  explanation: string;
};

export async function runDoctor(configPath: string): Promise<{
  status: "PASS" | "WARNING" | "FAIL";
  checks: DoctorCheck[];
}> {
  const checks: DoctorCheck[] = [];
  let config: FangaBaseConfig;
  try {
    config = configSchema.parse(
      parse(await readFile(resolve(configPath), "utf8")),
    );
    checks.push(check("configuration", "PASS", "Le manifeste est valide."));
  } catch (error) {
    checks.push(
      check(
        "configuration",
        "FAIL",
        `Configuration illisible ou invalide: ${safeMessage(error)}`,
      ),
    );
    return { status: "FAIL", checks };
  }
  checks.push(check("node", "PASS", `Node ${process.version} est disponible.`));
  checks.push(tool("pnpm", "pnpm", ["--version"]));
  if (config.architecture.backend === "laravel") {
    checks.push(tool("php", "php", ["--version"]));
    checks.push(tool("composer", "composer", ["--version"]));
  }
  checks.push(
    check(
      "database",
      process.env.DATABASE_URL ? "PASS" : "WARNING",
      process.env.DATABASE_URL
        ? `${config.database.engine} est configuré sans afficher les identifiants.`
        : `DATABASE_URL doit être renseignée pour ${config.database.engine}.`,
    ),
  );
  if (config.architecture.target === "hybrid") {
    const origin = process.env.FRONTEND_ORIGIN;
    const cors = process.env.CORS_ALLOWED_ORIGINS;
    checks.push(
      check(
        "cors-csrf-cookies",
        origin && cors && cors.split(",").includes(origin) ? "PASS" : "FAIL",
        origin && cors && cors.split(",").includes(origin)
          ? "Origine frontend exacte, CORS avec credentials et cookies sécurisés requis."
          : "FRONTEND_ORIGIN doit figurer exactement dans CORS_ALLOWED_ORIGINS.",
      ),
    );
  }
  for (const provider of config.payments.providers) {
    const status = [
      "moneroo",
      "cinetpay",
      "paydunya",
      "bictorys",
      "paytech",
    ].includes(provider)
      ? "WARNING"
      : provider === "orange_money_ml" && !process.env.ORANGE_MONEY_CLIENT_ID
        ? "WARNING"
        : "PASS";
    checks.push(
      check(
        `payment:${provider}`,
        status,
        status === "PASS"
          ? "Fournisseur sélectionné; les secrets ne sont pas affichés."
          : ["moneroo", "cinetpay", "paydunya", "bictorys", "paytech"].includes(
                provider,
              )
            ? "NEEDS_PROVIDER_CONTRACT; reste désactivé sans contrat vérifié."
            : "Identifiants marchands et UAT sandbox encore requis.",
      ),
    );
  }
  const migrations =
    config.architecture.backend === "laravel"
      ? resolve("apps/server/artisan")
      : resolve("packages/backend-next/src/migrate.ts");
  checks.push(
    check(
      "migrations",
      (await exists(migrations)) ? "PASS" : "FAIL",
      (await exists(migrations))
        ? "Le runner de migrations du profil existe."
        : "Runner de migrations absent.",
    ),
  );
  const status = checks.some((item) => item.status === "FAIL")
    ? "FAIL"
    : checks.some((item) => item.status === "WARNING")
      ? "WARNING"
      : "PASS";
  return { status, checks };
}

function tool(name: string, command: string, args: string[]): DoctorCheck {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return result.status === 0
    ? check(name, "PASS", `${name} est disponible.`)
    : check(
        name,
        "FAIL",
        `${name} est requis par ce profil mais indisponible.`,
      );
}

function check(
  name: string,
  status: DoctorCheck["status"],
  explanation: string,
): DoctorCheck {
  return { name, status, explanation };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function safeMessage(error: unknown): string {
  return error instanceof Error
    ? (error.message.split("\n")[0] ?? "erreur inconnue")
    : "erreur inconnue";
}
