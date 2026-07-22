import { createHash } from "node:crypto";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

export type BackupManifest = {
  version: 1;
  created_at: string;
  database: "postgres" | "mysql" | "sqlite";
  files: Array<{ path: string; sha256: string; bytes: number }>;
  includes: string[];
};

export async function backup(options: {
  source: string;
  target: string;
  database: BackupManifest["database"];
  dryRun: boolean;
  now?: Date;
}): Promise<BackupManifest> {
  const source = resolve(options.source);
  const target = resolve(options.target);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile())
    throw new Error("backup source must be an explicit file export");
  const data = await readFile(source);
  const manifest: BackupManifest = {
    version: 1,
    created_at: (options.now ?? new Date()).toISOString(),
    database: options.database,
    files: [
      {
        path: basename(source),
        sha256: createHash("sha256").update(data).digest("hex"),
        bytes: data.byteLength,
      },
    ],
    includes: [
      "ledger",
      "accounts",
      "organizations",
      "entitlements",
      "outbox",
      "audit",
      "remote-storage-metadata",
      "non-secret-config",
    ],
  };
  if (!options.dryRun) {
    await mkdir(target, { recursive: true });
    await cp(source, join(target, basename(source)), {
      errorOnExist: true,
      force: false,
    });
    await writeFile(
      join(target, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: "wx" },
    );
  }
  return manifest;
}

export async function restore(options: {
  backup: string;
  target: string;
  environment: string;
  confirm: boolean;
  dryRun: boolean;
}): Promise<void> {
  if (!options.environment.trim())
    throw new Error("restore environment is required");
  if (!options.dryRun && !options.confirm)
    throw new Error("destructive restore requires --confirm");
  const directory = resolve(options.backup);
  const manifest = JSON.parse(
    await readFile(join(directory, "manifest.json"), "utf8"),
  ) as BackupManifest;
  for (const file of manifest.files) {
    const data = await readFile(join(directory, file.path));
    if (createHash("sha256").update(data).digest("hex") !== file.sha256)
      throw new Error(`integrity check failed for ${file.path}`);
    if (!options.dryRun)
      await cp(join(directory, file.path), resolve(options.target), {
        force: false,
        errorOnExist: true,
      });
  }
}
