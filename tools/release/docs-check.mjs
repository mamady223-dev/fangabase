import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const currentVersion = JSON.parse(
  await readFile("package.json", "utf8"),
).version;
const files = execFileSync(
  "git",
  ["ls-files", "*.md", "*.ts", "*.yaml", "*.yml"],
  {
    encoding: "utf8",
  },
)
  .trim()
  .split(/\r?\n/)
  .filter((file) => file);
const errors = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  if (/[ÃÂ]|â(?:€|€™|€œ|€œ|€“|€”)/u.test(content))
    errors.push(`${file}: texte UTF-8 corrompu`);
}
const readme = await readFile("README.md", "utf8");
if (!readme.includes(`Version en préparation : \`${currentVersion}\``))
  errors.push(`README.md: version courante différente de ${currentVersion}`);
if (
  !readme.includes(
    "git clone https://github.com/mamady223-dev/fangabase.git FangaBase",
  )
)
  errors.push("README.md: commande de clone canonique absente");
if (/Prérequis[^\n]*PHP[^\n]*Composer/u.test(readme))
  errors.push("README.md: PHP/Composer présentés comme prérequis universels");
if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else
  process.stdout.write(`Documentation cohérente avec ${currentVersion}.\n`);
