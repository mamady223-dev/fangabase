import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const version = packageJson.version;
const outputDir = join(root, "dist", "release");
const archiveName = `fangabase-${version}.zip`;

const forbidden = [
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)vendor(\/|$)/,
  /(^|\/)(?:storage\/logs|test-results|playwright-report|coverage|tmp)(\/|$)/,
  /\.(?:log|sqlite|sqlite3|tmp)$/i,
];
const secretPatterns = [
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];

const tracked = execFileSync("git", ["ls-files", "--cached"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .map((path) => path.replaceAll("\\", "/"))
  .sort();

const sourceEntries = [];
for (const path of tracked) {
  if (path === ".env.example" || path.endsWith("/.env.example")) {
    sourceEntries.push(entry(path, readFileSync(join(root, path))));
    continue;
  }
  if (forbidden.some((pattern) => pattern.test(path))) continue;
  const data = readFileSync(join(root, path));
  scanSecrets(path, data);
  sourceEntries.push(entry(path, data));
}

for (const required of [
  "Fanga_design_stitch.md",
  "Fanga_design_Banani.md",
  "LICENSE-COMMERCIAL-DRAFT.md",
  "LICENSE-DECISION-REQUIRED.md",
  "THIRD_PARTY_NOTICES.md",
  "CHANGELOG.md",
  "README.md",
  "pnpm-lock.yaml",
  "apps/server/composer.lock",
]) {
  if (!sourceEntries.some((item) => item.path === required)) {
    throw new Error(`RELEASE_REQUIRED_FILE_MISSING: ${required}`);
  }
}

const manifest = {
  schema: 1,
  product: "FangaBase",
  version,
  licenseStatus: "DRAFT_PENDING_LEGAL_HOLDER",
  reproducibleTimestamp: "1980-01-01T00:00:00.000Z",
  files: sourceEntries.map(({ path, data }) => ({
    path,
    size: data.length,
    sha256: sha256(data),
  })),
};
const sbom = buildSbom(version);
const virtualEntries = [
  entry("release/VERSION", Buffer.from(`${version}\n`)),
  entry("release/manifest.json", jsonBuffer(manifest)),
  entry("release/sbom.cdx.json", jsonBuffer(sbom)),
];
const entries = [...sourceEntries, ...virtualEntries].sort((a, b) =>
  a.path.localeCompare(b.path),
);

mkdirSync(outputDir, { recursive: true });
const archive = createZip(entries);
const archivePath = join(outputDir, archiveName);
writeFileSync(archivePath, archive);
writeFileSync(
  join(outputDir, `${archiveName}.sha256`),
  `${sha256(archive)}  ${archiveName}\n`,
);
writeFileSync(join(outputDir, "release-manifest.json"), jsonBuffer(manifest));
writeFileSync(join(outputDir, "sbom.cdx.json"), jsonBuffer(sbom));
console.log(
  JSON.stringify({
    archive: archivePath,
    sha256: sha256(archive),
    files: entries.length,
  }),
);

function entry(path, data) {
  return { path: posix.normalize(path), data };
}

function jsonBuffer(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function scanSecrets(path, data) {
  if (data.includes(0)) return;
  const text = data.toString("utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) throw new Error(`RELEASE_SECRET_PATTERN: ${path}`);
  }
}

function buildSbom(releaseVersion) {
  const components = [];
  for (const manifestPath of [
    "package.json",
    "apps/web/package.json",
    "packages/core/package.json",
    "packages/contracts/package.json",
    "tools/cli/package.json",
  ]) {
    const manifest = JSON.parse(readFileSync(join(root, manifestPath), "utf8"));
    for (const group of ["dependencies", "devDependencies"]) {
      for (const [name, componentVersion] of Object.entries(
        manifest[group] ?? {},
      )) {
        if (String(componentVersion).startsWith("workspace:")) continue;
        components.push({
          type: "library",
          name,
          version: String(componentVersion),
          scope: group === "devDependencies" ? "optional" : "required",
          purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(String(componentVersion))}`,
        });
      }
    }
  }
  const composer = JSON.parse(
    readFileSync(join(root, "apps/server/composer.lock"), "utf8"),
  );
  for (const dependency of [
    ...(composer.packages ?? []),
    ...(composer["packages-dev"] ?? []),
  ]) {
    components.push({
      type: "library",
      name: dependency.name,
      version: dependency.version,
      licenses: (dependency.license ?? []).map((id) => ({ license: { id } })),
      purl: `pkg:composer/${dependency.name}@${encodeURIComponent(dependency.version)}`,
    });
  }
  const unique = [
    ...new Map(
      components.map((item) => [`${item.purl}|${item.scope ?? ""}`, item]),
    ).values(),
  ].sort((a, b) => a.purl.localeCompare(b.purl));
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${stableUuid(releaseVersion)}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: "FangaBase",
        version: releaseVersion,
      },
    },
    components: unique,
  };
}

function stableUuid(value) {
  const hash = createHash("sha256").update(`fangabase:${value}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const item of entries) {
    const name = Buffer.from(item.path, "utf8");
    const crc = crc32(item.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(item.data.length, 18);
    local.writeUInt32LE(item.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, item.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(item.data.length, 20);
    central.writeUInt32LE(item.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + item.data.length;
  }
  const centralData = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralData, end]);
}

function crc32(data) {
  const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1)
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
