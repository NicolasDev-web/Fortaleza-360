/** População por bairro (SDD-033), gerada por `scripts/aggregate_population.py`. */

export type NeighborhoodPopulation = { population: number; low: number; high: number };

export type PopulationData = {
  referenceYear: number;
  total: number;
  byCode: Record<string, NeighborhoodPopulation>;
};

export type PeoplePerFacility = { central: number; low: number; high: number };

export const POPULATION_SOURCE = {
  agency: "IBGE",
  title: "Censo Demográfico 2022 — população por setor",
  reference: "2022",
  revision: "2026-05-20",
  pageUrl:
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/",
  license: "Licença do IBGE ainda não confirmada (página de termos indisponível na coleta)",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`População: ${label} inválido.`);
  }
  return value;
}

/** Valida o arquivo inteiro: um bairro faltando ou uma faixa incoerente invalida tudo. */
export function parsePopulation(data: unknown, neighborhoodCodes: string[]): PopulationData {
  if (!isRecord(data) || !Array.isArray(data.neighborhoods)) {
    throw new Error("População: arquivo sem lista de bairros.");
  }
  const byCode: Record<string, NeighborhoodPopulation> = {};
  for (const row of data.neighborhoods) {
    if (!isRecord(row) || typeof row.code !== "string") throw new Error("População: linha inválida.");
    const entry = {
      population: count(row.population, `bairro ${row.code}`),
      low: count(row.population_low, `bairro ${row.code}`),
      high: count(row.population_high, `bairro ${row.code}`),
    };
    if (!(entry.low <= entry.population && entry.population <= entry.high)) {
      throw new Error(`População: faixa incoerente no bairro ${row.code}.`);
    }
    byCode[row.code] = entry;
  }
  const missing = neighborhoodCodes.filter((code) => !(code in byCode));
  if (missing.length > 0) throw new Error(`População ausente para os bairros ${missing.join(", ")}.`);

  return {
    referenceYear: count(data.reference_year, "ano"),
    total: count(data.total_population, "total"),
    byCode,
  };
}

/** Pessoas por posto dentro do bairro. Sem posto, `null`: nunca divide por zero. */
export function peoplePerFacility(
  population: NeighborhoodPopulation,
  facilities: number,
): PeoplePerFacility | null {
  if (!Number.isInteger(facilities) || facilities <= 0) return null;
  return {
    central: population.population / facilities,
    low: population.low / facilities,
    high: population.high / facilities,
  };
}

/** Arredonda para leitura: centenas acima de mil, dezenas abaixo. */
export function roundForReading(value: number): number {
  const step = value >= 1000 ? 100 : 10;
  return Math.round(value / step) * step;
}
