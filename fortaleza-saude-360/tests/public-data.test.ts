import { afterEach, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { checkPublicData } from "../scripts/check-public-data.mjs";

const temporary: string[] = [];
afterEach(() => {
  // Diretórios temporários criados por esta fixture, nunca a pasta public real.
  for (const dir of temporary.splice(0)) {
    if (dirname(resolve(dir)) !== resolve(tmpdir()) || !basename(dir).startsWith("f360-public-guard-")) {
      throw new Error("Destino de limpeza fora do diretório temporário de testes.");
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "f360-public-guard-"));
  temporary.push(root);
  mkdirSync(join(root, "data"));
  // Caso positivo usa uma camada oficial existente; não inventa uma unidade.
  const bytes = readFileSync("public/data/facilities.geojson");
  const path = join(root, "data", "facilities.geojson");
  writeFileSync(path, bytes);
  const registry = { mode: "official", layers: [{ file: "/data/facilities.geojson",
    sha256: createHash("sha256").update(bytes).digest("hex") }] };
  const save = () => writeFileSync(join(root, "data", "manifest.json"), JSON.stringify(registry));
  save();
  return { root, path, registry, save };
}
it("aprova os arquivos reais registrados e os dados do projeto", () => {
  const f = fixture();
  expect(checkPublicData(f.root).files).toBe(1);
  expect(checkPublicData("public").files).toBeGreaterThanOrEqual(8);
});
it("rejeita alteração sem atualização do checksum", () => {
  const f = fixture();
  writeFileSync(f.path, readFileSync(f.path, "utf8") + " ");
  expect(() => checkPublicData(f.root)).toThrow(/checksum/i);
});
it("rejeita DEMO mesmo quando o checksum foi atualizado", () => {
  const f = fixture();
  const data = JSON.parse(readFileSync(f.path, "utf8"));
  data.features[0].properties.name = "DEMO unidade sintética";
  const bytes = JSON.stringify(data);
  writeFileSync(f.path, bytes);
  f.registry.layers[0].sha256 = createHash("sha256").update(bytes).digest("hex");
  f.save();
  expect(() => checkPublicData(f.root)).toThrow(/DEMO|mock/i);
});
it("rejeita arquivo de dados não registrado", () => {
  const f = fixture();
  writeFileSync(join(f.root, "data", "DEMO-extra.json"), "{}");
  expect(() => checkPublicData(f.root)).toThrow(/não registrado/i);
});
it("rejeita referência que saia da pasta pública", () => {
  const f = fixture();
  // Sem marcador DEMO: este caso deve exercitar a proteção de caminho,
  // independentemente dos separadores de diretório do sistema operacional.
  f.registry.layers[0].file = "/../arquivo-externo.json";
  f.save();
  expect(() => checkPublicData(f.root)).toThrow(/fora|local/i);
});
it("rejeita modo demonstrativo no build de publicação", () => {
  const f = fixture();
  f.registry.mode = "demo";
  f.save();
  expect(() => checkPublicData(f.root)).toThrow(/official/i);
});
it("retorna falha no CLI usado pelo prebuild quando há DEMO", () => {
  const f = fixture();
  const data = JSON.parse(readFileSync(f.path, "utf8"));
  data.features[0].properties.name = "DEMO teste do bloqueio de publicação";
  const content = JSON.stringify(data);
  writeFileSync(f.path, content);
  f.registry.layers[0].sha256 = createHash("sha256").update(content).digest("hex");
  f.save();
  const result = spawnSync(process.execPath, [resolve("scripts/check-public-data.mjs"), f.root], { encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/DEMO\/mock/);
});
