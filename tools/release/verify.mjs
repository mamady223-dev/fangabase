import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const archivePath = resolve(
  process.argv[2] ??
    `dist/release/fangabase-${JSON.parse(readFileSync("package.json", "utf8")).version}.zip`,
);
const archive = readFileSync(archivePath);
const expectedLine = readFileSync(`${archivePath}.sha256`, "utf8").trim();
const actualHash = createHash("sha256").update(archive).digest("hex");
if (expectedLine !== `${actualHash}  ${basename(archivePath)}`)
  throw new Error("RELEASE_ARCHIVE_HASH_MISMATCH");

const entries = readStoredZip(archive);
const forbidden =
  /(^|\/)(?:\.git|node_modules|vendor|storage\/logs|test-results|playwright-report)(\/|$)|(^|\/)\.env(?:\.|$)|\.(?:log|sqlite|sqlite3|tmp)$/i;
const required = [
  "release/VERSION",
  "release/manifest.json",
  "release/sbom.cdx.json",
  "Fanga_design_stitch.md",
  "Fanga_design_Banani.md",
  "LICENSE-COMMERCIAL-DRAFT.md",
  "THIRD_PARTY_NOTICES.md",
];
for (const name of entries.keys()) {
  if (name === ".env.example" || name.endsWith("/.env.example")) continue;
  if (forbidden.test(name)) throw new Error(`RELEASE_FORBIDDEN_PATH: ${name}`);
}
for (const name of required)
  if (!entries.has(name))
    throw new Error(`RELEASE_REQUIRED_FILE_MISSING: ${name}`);

const manifest = JSON.parse(
  entries.get("release/manifest.json").toString("utf8"),
);
for (const file of manifest.files) {
  const data = entries.get(file.path);
  if (
    !data ||
    data.length !== file.size ||
    createHash("sha256").update(data).digest("hex") !== file.sha256
  )
    throw new Error(`RELEASE_MANIFEST_MISMATCH: ${file.path}`);
}
const secretPatterns = [
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
for (const [name, data] of entries) {
  if (data.includes(0)) continue;
  const text = data.toString("utf8");
  if (secretPatterns.some((pattern) => pattern.test(text)))
    throw new Error(`RELEASE_SECRET_PATTERN: ${name}`);
}
console.log(
  JSON.stringify({
    archive: archivePath,
    sha256: actualHash,
    files: entries.size,
    manifestFiles: manifest.files.length,
  }),
);

function readStoredZip(buffer) {
  const files = new Map();
  let offset = 0;
  while (
    offset + 4 <= buffer.length &&
    buffer.readUInt32LE(offset) === 0x04034b50
  ) {
    const method = buffer.readUInt16LE(offset + 8);
    if (method !== 0) throw new Error("RELEASE_ZIP_COMPRESSION_UNSUPPORTED");
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer
      .subarray(nameStart, nameStart + nameLength)
      .toString("utf8");
    files.set(name, buffer.subarray(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return files;
}
