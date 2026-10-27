/**
 * Proveniência das camadas exibidas, transcrita de docs/DATA_SOURCES.md
 * (verificação de 2026-10-27). O manifesto público continua sob a SDD-023.
 */
export type LayerSourceId = "facilities" | "neighborhoods" | "boundary";

export type LayerSource = {
  id: LayerSourceId;
  title: string;
  agency: string;
  catalogId: number;
  reference: string;
  catalogUpdate: string;
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
      "Cadastro de localização. Não indica horário, capacidade, equipe ou disponibilidade de atendimento.",
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
      "Divisão administrativa do Decreto nº 14.498/2019; não é unidade de planejamento em saúde.",
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
    limitation: "Usado para enquadramento e controle de qualidade, não como indicador.",
  },
};
