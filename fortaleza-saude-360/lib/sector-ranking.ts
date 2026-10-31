export type SectorDistance = { geo_id: string; neighborhood_code: string; population: number; distance_m: number; facility_id: string };
export type SectorRankingData = { schema: number; reference_year: number; total_population: number; rows: SectorDistance[]; method: string; limitations: string[] };

export function parseSectorRanking(value: unknown, neighborhoods: Set<string>, facilities: Set<string>): SectorRankingData {
  const data = value as SectorRankingData;
  if (!data || data.schema !== 1 || data.reference_year !== 2022 || !Number.isSafeInteger(data.total_population) || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 10000 || typeof data.method !== "string" || !Array.isArray(data.limitations) || !data.limitations.every(item => typeof item === "string")) throw new Error("Lista de setores inválida.");
  let total = 0;
  const ids = new Set<string>();
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i], previous = data.rows[i - 1];
    if (!row || typeof row.geo_id !== "string" || !/^\d{15}$/.test(row.geo_id) || ids.has(row.geo_id) || !neighborhoods.has(row.neighborhood_code) || !facilities.has(row.facility_id) || !Number.isSafeInteger(row.population) || row.population < 0 || !Number.isFinite(row.distance_m) || row.distance_m < 0 || (previous && (previous.distance_m < row.distance_m || (previous.distance_m === row.distance_m && previous.geo_id > row.geo_id)))) throw new Error("Setor ou ordem inválidos.");
    total += row.population; ids.add(row.geo_id);
  }
  if (total !== data.total_population) throw new Error("População da lista não reconcilia.");
  return data;
}
