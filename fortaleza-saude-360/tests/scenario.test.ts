import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { computeScenario, validateScenarioData, type ScenarioData } from "@/lib/scenario";

const demo = (): ScenarioData => ({
  schema: 1, nodes: [[-38.5, -3.8], [-38.501, -3.8], [-38.51, -3.81], [-38.511, -3.81]],
  edges: [[0, 1, 20], [2, 3, 20]], seeds: [0], snapScale: .99, maxSnapM: 300,
  sectors: [[100, 511, [[0, 0]]], [200, 0, [[2, 0]]], [50, 0, [[3, 0]]]],
  sectorIds: ["DEMO-1", "DEMO-2", "DEMO-3"], total: 350, bufferM: 25,
  speeds: { slow: 4, central: 4.8, fast: 5.5 },
  order: ["slow", "central", "fast"].flatMap(s => [10, 20, 30].map(t => [s, t] as [string, number])),
  baseline: [], boundary: { type: "Polygon", coordinates: [[[-38.6, -3.9], [-38.4, -3.9], [-38.4, -3.7], [-38.6, -3.7], [-38.6, -3.9]]] },
});

describe("simulador com corredores DEMO", () => {
  it("separa base e candidato, não duplica quem já estava incluído", () => {
    const data = demo();
    const before = JSON.stringify(data);
    const result = computeScenario(data, [-38.51, -3.81]);
    const central = result.rows.filter(r => r.scenario === "central");
    expect(central.map(r => r.delta)).toEqual([200, 250, 250]);
    expect(central.map(r => r.base)).toEqual([100, 100, 100]);
    expect(JSON.stringify(data)).toBe(before);
    expect(computeScenario(data, data.nodes[0]).rows.every(r => r.delta === 0)).toBe(true);
  });
  it("rejeita ponto fora do município e ponto longe da malha", () => {
    expect(() => computeScenario(demo(), [0, 0])).toThrow(/município/);
    expect(() => computeScenario(demo(), [-38.59, -3.89])).toThrow(/300/);
    expect(() => computeScenario(demo(), [NaN, -3.8])).toThrow();
  });
  it("bloqueia dados inválidos e divergência da base", () => {
    const data = demo();
    data.sectors[0][1] = 0;
    expect(() => validateScenarioData(data)).toThrow(/base/);
  });
});

it("reproduz os 39.672 casos da base real publicada", () => {
  const data = JSON.parse(readFileSync("public/data/scenario-model.json", "utf8")) as ScenarioData;
  expect(() => validateScenarioData(data)).not.toThrow();
  expect(computeScenario(data, data.nodes[data.seeds[0]]).rows.every(r => r.delta === 0)).toBe(true);
});
