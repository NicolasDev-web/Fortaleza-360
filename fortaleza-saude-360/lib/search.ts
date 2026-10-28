import { normalizeName } from "@/lib/geo";
import { neighborhoodSummary, type MapModel } from "@/lib/map-model";
import { unitTypeLabel } from "@/lib/sources";

export type SearchResult = {
  kind: "neighborhood" | "facility";
  group: "Bairros" | "Unidades";
  id: string;
  label: string;
  detail: string;
};

export const SEARCH_LIMIT_PER_GROUP = 7;

/** Busca só nos bairros e unidades do modelo carregado; nunca sugere itens fora dele. */
export function searchTerritory(model: MapModel, query: string): SearchResult[] {
  const term = normalizeName(query);
  const digits = query.trim();
  const matches = (value: string) => term === "" || normalizeName(value).includes(term);
  const neighborhoodNames = new Map(model.neighborhoods.map(({ code, name }) => [code, name]));

  const neighborhoods = model.neighborhoods
    .filter(({ name }) => matches(name))
    .slice(0, SEARCH_LIMIT_PER_GROUP)
    .map<SearchResult>((neighborhood) => ({
      kind: "neighborhood",
      group: "Bairros",
      id: neighborhood.code,
      label: neighborhood.name,
      detail: `Bairro · ${neighborhoodSummary(neighborhood)}`,
    }));

  const units = [...model.facilities, ...model.otherUnits]
    .filter(({ name, cnes }) => matches(name) || (cnes !== null && digits !== "" && cnes.includes(digits)))
    .slice(0, SEARCH_LIMIT_PER_GROUP)
    .map<SearchResult>(({ id, name, type, cnes, neighborhoodCode }) => ({
      kind: "facility",
      group: "Unidades",
      id,
      label: name,
      detail: [
        unitTypeLabel(type),
        neighborhoodCode ? neighborhoodNames.get(neighborhoodCode) : null,
        cnes ? `CNES ${cnes}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));

  return [...neighborhoods, ...units];
}
