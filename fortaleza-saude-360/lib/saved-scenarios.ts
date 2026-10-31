import type { Position } from "@/lib/geo";
import type { ScenarioResult } from "@/lib/scenario";

export const SCENARIOS_KEY = "f360:saved-scenarios:v1";
export const MAX_SAVED_SCENARIOS = 20;
export type SavedScenario = {
  id: string;
  name: string;
  savedAt: string;
  point: Position;
  modelSha: string;
  result: ScenarioResult;
};

function validResult(value: unknown): value is ScenarioResult {
  if (!value || typeof value !== "object") return false;
  const result = value as ScenarioResult;
  const count = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (!Number.isFinite(result.snapM) || result.snapM < 0 || !count(result.total) || !Array.isArray(result.rows) || result.rows.length !== 9) return false;
  const keys = new Set<string>();
  for (const row of result.rows) {
    if (!row || !["slow", "central", "fast"].includes(row.scenario) || ![10, 20, 30].includes(row.minutes) ||
      ![row.base, row.proposed, row.delta].every(count) || row.proposed > result.total || row.base > row.proposed ||
      row.delta !== row.proposed - row.base || !Number.isFinite(row.deltaPercentagePoints)) return false;
    keys.add(`${row.scenario}:${row.minutes}`);
  }
  return keys.size === 9;
}

export function parseSavedScenarios(raw: string | null): SavedScenario[] {
  if (raw === null) return [];
  if (raw.length > 100_000) throw new Error("Arquivo local de cenários inválido.");
  const value = JSON.parse(raw);
  if (value?.schema !== 1 || !Array.isArray(value.items) || value.items.length > MAX_SAVED_SCENARIOS) throw new Error("Formato local de cenários inválido.");
  const ids = new Set<string>();
  for (const row of value.items) {
    if (!row || typeof row.id !== "string" || row.id.length > 100 || !row.id || ids.has(row.id) ||
      typeof row.name !== "string" || !row.name.trim() || row.name.length > 60 ||
      typeof row.savedAt !== "string" || !Number.isFinite(Date.parse(row.savedAt)) ||
      !Array.isArray(row.point) || row.point.length !== 2 || !row.point.every(Number.isFinite) ||
      Math.abs(row.point[0]) > 180 || Math.abs(row.point[1]) > 90 ||
      typeof row.modelSha !== "string" || !/^[a-f0-9]{64}$/.test(row.modelSha) || !validResult(row.result)) throw new Error("Cenário local inválido.");
    ids.add(row.id);
  }
  return value.items;
}

export function readSavedScenarios(storage: Pick<Storage, "getItem">): SavedScenario[] {
  return parseSavedScenarios(storage.getItem(SCENARIOS_KEY));
}

export function writeSavedScenarios(storage: Pick<Storage, "setItem" | "removeItem">, items: SavedScenario[]): void {
  if (!items.length) { storage.removeItem(SCENARIOS_KEY); return; }
  const raw = JSON.stringify({ schema: 1, items });
  parseSavedScenarios(raw);
  storage.setItem(SCENARIOS_KEY, raw);
}
