import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copyProductDocs } from "./product-docs.js";

describe("documents produit", () => {
  it.each(["NO_GO_TEMPORAIRE", "PIVOT"])(
    "bloque la génération pour la décision %s",
    async (decision) => {
      const root = await mkdtemp(join(tmpdir(), "fangabase-product-docs-"));
      const source = join(root, "source");
      const destination = join(root, "destination");
      await mkdir(source);
      await writeFile(
        join(source, "VALIDATION_PROJET.md"),
        `# Validation\n\nDécision : ${decision}\n`,
      );
      await expect(copyProductDocs(source, destination)).rejects.toThrow(
        decision,
      );
    },
  );
});
