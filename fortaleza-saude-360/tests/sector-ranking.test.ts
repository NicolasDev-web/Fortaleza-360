import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseSectorRanking } from "@/lib/sector-ranking";
import { nearestByStraightLine } from "@/lib/accessibility";
import type { FacilityPoint } from "@/lib/map-model";

it("valida os 4.408 setores, total/zero, ordem e integridade dos dados reais", () => {
  const read = (file: string) => JSON.parse(readFileSync(`public/data/${file}`, "utf8"));
  const neighborhoods = new Set<string>(read("neighborhoods.geojson").features.map((f: { properties: { code: string } }) => f.properties.code));
  const facilities = new Set<string>(read("facilities.geojson").features.map((f: { properties: { id: string } }) => f.properties.id));
  const raw = read("sector-ranking.json");
  const parsed = parseSectorRanking(raw, neighborhoods, facilities);
  expect(parsed.rows).toHaveLength(4408);
  expect(parsed.total_population).toBe(2428708);
  expect(parsed.rows.filter(row => row.population === 0)).toHaveLength(102);
  expect(() => parseSectorRanking({ ...raw, rows: [...raw.rows].reverse() }, neighborhoods, facilities)).toThrow();
  expect(() => parseSectorRanking({ ...raw, total_population: raw.total_population + 1 }, neighborhoods, facilities)).toThrow();
  expect(() => parseSectorRanking(raw, neighborhoods, new Set())).toThrow();
});

it("distância haversine do navegador usa o mesmo raio da geração offline", () => {
  const unit = { id: "DEMO", position: [-38.5, -3.8] } as FacilityPoint;
  const distance = nearestByStraightLine([-38.51, -3.8], [unit]);
  expect(distance?.distanceM).toBeCloseTo(1109.5, 0);
});
