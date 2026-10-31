import { nearestByStraightLine } from "@/lib/accessibility";
import { unproject } from "@/lib/geo";
import type { MapModel, NeighborhoodShape } from "@/lib/map-model";
import { peoplePerFacility, POPULATION_SOURCE } from "@/lib/population";
import { LAYER_SOURCES, SOURCE_COLLECTED_AT, SOURCE_LICENSE } from "@/lib/sources";

/** Exportação em CSV (SDD-034): uma linha por bairro, com método e fonte em toda linha. */
export const CSV_COLUMNS = [
  "codigo_bairro",
  "bairro",
  "postos_uaps_no_bairro",
  "populacao_censo",
  "populacao_minima",
  "populacao_maxima",
  "pessoas_por_posto",
  "pessoas_por_posto_minimo",
  "pessoas_por_posto_maximo",
  "uaps_mais_proxima",
  "distancia_uaps_mais_proxima_m",
  "metodo_distancia",
  "fonte_postos",
  "ano_postos",
  "fonte_bairros",
  "ano_bairros",
  "licenca_postos_bairros",
  "fonte_populacao",
  "ano_populacao",
  "licenca_populacao",
  "data_coleta",
  "observacao",
] as const;

type Column = (typeof CSV_COLUMNS)[number];

const BOM = "﻿";
const EOL = "\r\n";

const NOTE =
  "Bairro é divisão administrativa, não a área que cada posto atende. " +
  "A população é do Censo e não é a população atendida. " +
  "A distância é em linha reta (aproximação), não é caminho nem tempo de deslocamento.";

export function csvFileName(): string {
  return "f360-bairros-fortaleza.csv";
}

/** Texto que a planilha leria como fórmula ganha um apóstrofo na frente. */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "number" ? String(value) : neutralizeFormula(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function sourceLabel(source: { title: string; agency: string; catalogId: number; pageUrl: string }) {
  return `${source.title} (${source.agency}, camada ${source.catalogId} do Fortaleza em Mapas) ${source.pageUrl}`;
}

function rowFor(model: MapModel, neighborhood: NeighborhoodShape): Record<Column, string | number | null> {
  const population = model.population?.byCode[neighborhood.code] ?? null;
  const facilities = neighborhood.facilityIds.length;
  const ratio = population ? peoplePerFacility(population, facilities) : null;
  const nearest = nearestByStraightLine(
    unproject(model.projection, ...neighborhood.centroid),
    model.facilities,
  );
  const nearestFacility = nearest
    ? model.facilities.find(({ id }) => id === nearest.facilityId)
    : undefined;

  return {
    codigo_bairro: neighborhood.code,
    bairro: neighborhood.name,
    postos_uaps_no_bairro: facilities,
    populacao_censo: population?.population ?? null,
    populacao_minima: population?.low ?? null,
    populacao_maxima: population?.high ?? null,
    pessoas_por_posto: ratio ? oneDecimal(ratio.central) : null,
    pessoas_por_posto_minimo: ratio ? oneDecimal(ratio.low) : null,
    pessoas_por_posto_maximo: ratio ? oneDecimal(ratio.high) : null,
    uaps_mais_proxima: nearestFacility?.name ?? null,
    distancia_uaps_mais_proxima_m: nearest ? Math.round(nearest.distanceM) : null,
    metodo_distancia: nearest ? nearest.method : null,
    fonte_postos: sourceLabel(LAYER_SOURCES.facilities),
    ano_postos: LAYER_SOURCES.facilities.reference,
    fonte_bairros: sourceLabel(LAYER_SOURCES.neighborhoods),
    ano_bairros: LAYER_SOURCES.neighborhoods.reference,
    licenca_postos_bairros: SOURCE_LICENSE,
    fonte_populacao: population
      ? `${POPULATION_SOURCE.title} (${POPULATION_SOURCE.agency}) ${POPULATION_SOURCE.pageUrl}`
      : null,
    ano_populacao: population ? POPULATION_SOURCE.reference : null,
    licenca_populacao: population ? POPULATION_SOURCE.license : null,
    data_coleta: SOURCE_COLLECTED_AT,
    observacao: NOTE,
  };
}

/**
 * CSV UTF-8 (com BOM, para o Excel acertar os acentos) dos bairros recebidos, na ordem recebida.
 * Quem chama passa a mesma lista que a tela mostra; o que não existe sai vazio, nunca zero.
 */
export function buildNeighborhoodCsv(
  model: MapModel,
  neighborhoods: readonly NeighborhoodShape[],
): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...neighborhoods.map((neighborhood) => {
      const row = rowFor(model, neighborhood);
      return CSV_COLUMNS.map((column) => cell(row[column])).join(",");
    }),
  ];
  return BOM + lines.join(EOL) + EOL;
}

/** Entrega o CSV pelo navegador, sem enviar nada a servidor. */
export function downloadCsv(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
