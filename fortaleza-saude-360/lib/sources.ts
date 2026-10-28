/**
 * Proveniência das camadas exibidas, transcrita de docs/DATA_SOURCES.md
 * (verificação de 2026-10-27). `tests/manifest.test.ts` garante que cada camada
 * coincide com sua entrada em `public/data/manifest.json` (SDD-023).
 */
export type LayerSourceId = "facilities" | "upas" | "hospitals" | "neighborhoods" | "boundary";

export type LayerSource = {
  id: LayerSourceId;
  title: string;
  agency: string;
  catalogId: number;
  reference: string;
  /** `null` quando a API não informa a data (camadas 823 e 825). */
  catalogUpdate: string | null;
  pageUrl: string;
  limitation: string;
};

export const SOURCE_ATTRIBUTION =
  "Fonte: Prefeitura Municipal de Fortaleza - Fortaleza em Mapas (Ipplan Fortaleza). Acesso via API de Dados Abertos.";

export const SOURCE_LICENSE =
  "Termos de Uso da API Fortaleza em Mapas — reutilização livre com atribuição obrigatória";

export const SOURCE_TERMS_URL = "https://mapas.fortaleza.ce.gov.br/dados-abertos/api";

export const SOURCE_COLLECTED_AT = "2026-10-27";

export const LAYER_SOURCES: Record<LayerSourceId, LayerSource> = {
  facilities: {
    id: "facilities",
    title: "Unidades de Atenção Primária à Saúde",
    agency: "SMS Fortaleza",
    catalogId: 824,
    reference: "2026",
    catalogUpdate: "2026-06-08",
    pageUrl:
      "https://mapas.fortaleza.ce.gov.br/mapa/824/unidades-de-atencao-primaria-a-saude-uaps",
    limitation:
      "O mapa mostra onde o posto fica. Não mostra horário, equipe, se está aberto nem quanto consegue atender.",
  },
  upas: {
    id: "upas",
    title: "Unidades de Pronto Atendimento (UPA)",
    agency: "SMS Fortaleza",
    catalogId: 825,
    reference: "2026",
    catalogUpdate: null,
    pageUrl: "https://mapas.fortaleza.ce.gov.br/mapa/825/unidades-de-pronto-atendimento-upa",
    limitation:
      "O mapa mostra onde a UPA fica. Não mostra horário, lotação nem quanto tempo se espera.",
  },
  hospitals: {
    id: "hospitals",
    title: "Hospitais municipais",
    agency: "SMS Fortaleza",
    catalogId: 823,
    reference: "2026",
    catalogUpdate: null,
    pageUrl: "https://mapas.fortaleza.ce.gov.br/mapa/823/hospitais-municipais",
    limitation:
      "Só aparecem os hospitais da Prefeitura; os do Estado, os federais e os particulares não estão aqui. O mapa não mostra leitos, lotação nem vagas.",
  },
  neighborhoods: {
    id: "neighborhoods",
    title: "Bairros de Fortaleza",
    agency: "IPLANFOR",
    catalogId: 21,
    reference: "2019",
    catalogUpdate: "2023-09-22",
    pageUrl: "https://mapas.fortaleza.ce.gov.br/mapa/21/bairros-de-fortaleza",
    limitation:
      "Bairro é uma divisão da Prefeitura (Decreto nº 14.498/2019). Não é a área que cada posto atende.",
  },
  boundary: {
    id: "boundary",
    title: "Limite administrativo de Fortaleza",
    agency: "IPECE",
    catalogId: 12,
    reference: "2019",
    catalogUpdate: "2023-07-25",
    pageUrl:
      "https://mapas.fortaleza.ce.gov.br/mapa/12/limite-administrativo-da-cidade-de-fortaleza",
    limitation: "Serve para desenhar a cidade, não para calcular números.",
  },
};

export function catalogUpdateLabel(source: LayerSource): string {
  return source.catalogUpdate ?? "sem data informada";
}

/** Fonte da camada de origem de uma unidade, pelo tipo do contrato `facility`. */
export function sourceForUnitType(type: string): LayerSource {
  if (type === "UPA") return LAYER_SOURCES.upas;
  if (type === "HOSPITAL") return LAYER_SOURCES.hospitals;
  return LAYER_SOURCES.facilities;
}

export function unitTypeLabel(type: string): string {
  if (type === "UAPS") return "Posto de saúde (UAPS)";
  if (type === "UPA") return "UPA (pronto atendimento)";
  if (type === "HOSPITAL") return "Hospital municipal";
  return "Unidade de saúde";
}
