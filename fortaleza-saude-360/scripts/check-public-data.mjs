import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function rejectMocks(value, file) {
  if (typeof value === "string" && /\bDEMO\b|\bmock\b|\bsynthetic\b|\bsint[eé]tic[oa]s?\b|example\.invalid/i.test(value)) {
    throw new Error(`DEMO/mock em dados públicos: ${file}`);
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) rejectMocks(item, file);
  }
}

export function checkPublicData(publicRoot = "public") {
  const root = realpathSync(resolve(publicRoot));
  const manifestPath = join(root, "data", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.mode !== "official" || !Array.isArray(manifest.layers) || !manifest.layers.length) {
    throw new Error("Publicação exige manifesto em modo official com camadas.");
  }
  rejectMocks(manifest, manifestPath);
  const entries = [...manifest.layers,
    ...["population", "population_coverage", "scenario", "basemap", "sector_ranking", "corridor_preview"].flatMap(key => manifest[key] ? [manifest[key]] : []),
    ...(manifest.corridor_preview?.images ?? [])];
  const registered = new Set();
  for (const entry of entries) {
    if (typeof entry.file !== "string" || !entry.file.startsWith("/") || entry.file.includes("://")) {
      throw new Error("Arquivo de dados deve ser local à pasta pública.");
    }
    const file = resolve(root, entry.file.slice(1));
    const local = relative(root, file);
    if (isAbsolute(local) || local === ".." || local.startsWith(`..${sep}`)) {
      throw new Error(`Arquivo fora da pasta pública: ${entry.file}`);
    }
    const real = realpathSync(file);
    const realLocal = relative(root, real);
    if (isAbsolute(realLocal) || realLocal === ".." || realLocal.startsWith(`..${sep}`)) {
      throw new Error("Link de arquivo aponta para fora da pasta pública.");
    }
    const digest = createHash("sha256").update(readFileSync(real)).digest("hex");
    if (digest !== entry.sha256) throw new Error(`Checksum divergente: ${entry.file}`);
    registered.add(real);
  }
  const inspect = directory => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`Link não permitido em dados públicos: ${file}`);
      if (item.isDirectory()) { inspect(file); continue; }
      if (file === manifestPath) continue;
      if (!registered.has(realpathSync(file))) throw new Error(`Arquivo não registrado: ${file}`);
      if (/\.(geojson|json)$/i.test(item.name)) rejectMocks(JSON.parse(readFileSync(file, "utf8")), file);
    }
  };
  inspect(join(root, "data"));
  return { files: registered.size, mode: manifest.mode };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkPublicData(process.argv[2] ?? "public");
    console.log(`Dados públicos verificados: ${result.files} arquivos, modo ${result.mode}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
