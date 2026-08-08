import { lstat, readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { parse } from "yaml";
import { configSchema, type FangaBaseConfig } from "./config.js";

const MAX_BRIEF_BYTES = 512 * 1024;

export async function readBrief(path: string): Promise<FangaBaseConfig> {
  const source = resolve(path);
  const metadata = await lstat(source);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error("Le brief doit être un fichier Markdown ordinaire.");
  if (metadata.size > MAX_BRIEF_BYTES)
    throw new Error("Le brief dépasse la taille maximale de 512 Kio.");
  if (extname(source).toLowerCase() !== ".md")
    throw new Error("Le brief doit porter l'extension .md.");
  const content = await readFile(source, "utf8");
  const blocks = [
    ...content.matchAll(/```yaml\s+fangabase\s*\r?\n([\s\S]*?)\r?\n```/g),
  ];
  if (blocks.length !== 1)
    throw new Error(
      `Le brief ${basename(source)} doit contenir exactement un bloc \`yaml fangabase\`.`,
    );
  const result = configSchema.safeParse(parse(blocks[0]?.[1] ?? ""));
  if (!result.success)
    throw new Error(
      `Brief FangaBase invalide:\n${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  return result.data;
}
