import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("mantém a cobertura publicada ligada ao manifesto e ao denominador do Censo", () => {
  const dir = join(process.cwd(), "public", "data");
  const content = readFileSync(join(dir, "population-coverage.json"));
  const coverage = JSON.parse(content.toString("utf8"));
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const population = JSON.parse(readFileSync(join(dir, "neighborhood-population.json"), "utf8"));

  expect(manifest.population_coverage.sha256).toBe(
    createHash("sha256").update(content).digest("hex"),
  );
  expect(coverage.denominator.population).toBe(population.total_population);
  expect(coverage.reference_year).toBe(2022);
  expect(coverage.rows).toHaveLength(9);
  expect(new Set(coverage.rows.map((row: { scenario: string; minutes: number }) =>
    `${row.scenario}:${row.minutes}`)).size).toBe(9);
  expect(Object.keys(coverage.dictionary).sort()).toEqual(Object.keys(coverage.rows[0]).sort());
  expect(coverage.limitations.join(" ")).toMatch(/não representa atendimento/i);
  for (const source of coverage.sources) {
    expect(source.organization).toBeTruthy();
    expect(source.license).toBeTruthy();
    expect(source.collected_at).toBeTruthy();
  }
});
