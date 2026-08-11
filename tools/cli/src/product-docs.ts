import { cp, lstat, mkdir, readFile, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

export async function copyProductDocs(
  sourcePath: string,
  destinationRoot: string,
): Promise<string[]> {
  const source = resolve(sourcePath);
  const sourceInfo = await lstat(source);
  if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink())
    throw new Error("--product-docs doit désigner un dossier ordinaire.");
  const accepted: string[] = [];
  for (const name of await readdir(source)) {
    const path = join(source, name);
    const info = await lstat(path);
    if (
      name !== basename(name) ||
      extname(name).toLowerCase() !== ".md" ||
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.size > MAX_DOCUMENT_BYTES
    )
      throw new Error(`Document produit non sûr ou refusé: ${name}.`);
    if (/^(?:\.env|.*(?:secret|credential|private[-_]?key).*)/i.test(name))
      throw new Error(`Document produit sensible refusé: ${name}.`);
    const content = await readFile(path, "utf8");
    if (/décision\s*:\s*NO_GO_TEMPORAIRE/iu.test(content))
      throw new Error(
        "La décision NO_GO_TEMPORAIRE interdit la génération du projet.",
      );
    if (/décision\s*:\s*PIVOT/iu.test(content))
      throw new Error(
        "La décision PIVOT exige une nouvelle validation avant génération.",
      );
    accepted.push(name);
  }
  const target = join(destinationRoot, "docs/product");
  await mkdir(target, { recursive: true });
  for (const name of accepted) await cp(join(source, name), join(target, name));
  return accepted.sort();
}
