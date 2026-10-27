import { hasNeighborhoodMismatch, type MapModel } from "@/lib/map-model";

/**
 * Modo História, inspirado em "Storytelling com Dados" (Cole Nussbaumer Knaflic):
 * cada capítulo tem um título-conclusão, um único foco no mapa e começo-meio-fim.
 * Todos os números vêm do modelo carregado; nenhum é escrito à mão.
 */
export type StoryPhase = "intro" | "city" | "facilities" | "contours" | "limits" | "explore";

export type StoryFacts = {
  neighborhoods: number;
  facilities: number;
  areaKm2: number | null;
  withFacility: number;
  withoutFacility: number;
  mismatches: number;
  outsideNeighborhoods: number;
  withFacilityCodes: ReadonlySet<string>;
  mismatchIds: ReadonlySet<string>;
};

export type StoryChapter = {
  id: string;
  phase: StoryPhase;
  kicker: string;
  title: string;
  body: string[];
  caveat?: string;
};

const integer = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function plural(count: number, singular: string, pluralForm: string): string {
  return `${integer.format(count)} ${count === 1 ? singular : pluralForm}`;
}

export function buildStoryFacts(model: MapModel): StoryFacts {
  const shapes = new Map(model.neighborhoods.map((item) => [item.code, item]));
  const withFacilityCodes = new Set(
    model.neighborhoods.filter(({ facilityIds }) => facilityIds.length > 0).map(({ code }) => code),
  );
  const mismatchIds = new Set(
    model.facilities
      .filter((facility) =>
        hasNeighborhoodMismatch(facility, shapes.get(facility.neighborhoodCode ?? "")),
      )
      .map(({ id }) => id),
  );

  return {
    neighborhoods: model.neighborhoods.length,
    facilities: model.facilities.length,
    areaKm2: model.areaKm2,
    withFacility: withFacilityCodes.size,
    withoutFacility: model.neighborhoods.length - withFacilityCodes.size,
    mismatches: mismatchIds.size,
    outsideNeighborhoods: model.facilities.filter(({ neighborhoodCode }) => !neighborhoodCode).length,
    withFacilityCodes,
    mismatchIds,
  };
}

/** Frase-tese (Big Idea) usada no painel de leitura. */
export function bigIdea(facts: Pick<StoryFacts, "facilities" | "neighborhoods">): string {
  return `${plural(facts.facilities, "UAPS", "UAPS")} em ${plural(facts.neighborhoods, "bairro", "bairros")}: onde estão, não quanto atendem.`;
}

export function buildStoryChapters(facts: StoryFacts): StoryChapter[] {
  const uaps = plural(facts.facilities, "UAPS", "UAPS");
  const bairros = plural(facts.neighborhoods, "bairro", "bairros");

  return [
    {
      id: "terra-da-luz",
      phase: "intro",
      kicker: "Terra da Luz",
      title: `Fortaleza, ${bairros} e ${uaps} no cadastro.`,
      body: [
        "Uma leitura guiada, em seis capítulos, sobre onde estão as Unidades de Atenção Primária à Saúde — a porta de entrada do SUS — no território da cidade.",
        "Cada número vem de uma fonte pública oficial, citada no próprio capítulo.",
      ],
    },
    {
      id: "a-cidade",
      phase: "city",
      kicker: "A cidade",
      title:
        facts.areaKm2 === null
          ? `${bairros} oficiais compõem a cidade.`
          : `${decimal.format(facts.areaKm2)} km² divididos em ${bairros}.`,
      body: [
        "O contorno é o limite administrativo (IPECE, 2019); as linhas internas são os bairros oficiais (IPLANFOR, Decreto nº 14.498/2019).",
        "Bairro é uma divisão administrativa — não é a área de responsabilidade de uma unidade de saúde.",
      ],
    },
    {
      id: "portas-de-entrada",
      phase: "facilities",
      kicker: "As portas de entrada",
      title: `${plural(facts.facilities, "unidade", "unidades")} de atenção primária no cadastro da SMS (2026).`,
      body: [
        "Cada ponto é a localização cadastrada de uma UAPS.",
        "O cadastro diz onde a unidade está — não informa horário, equipe, capacidade nem se está atendendo.",
      ],
    },
    {
      id: "contornos",
      phase: "contours",
      kicker: "Onde o contorno não tem ponto",
      title: `${plural(facts.withFacility, "bairro tem", "bairros têm")} ao menos uma UAPS dentro do contorno; ${integer.format(facts.withoutFacility)}, nenhuma.`,
      body: ["Em destaque, os bairros com ao menos uma unidade dentro dos próprios limites."],
      caveat:
        "Isso não mede acesso. Moradores são atendidos por unidades de bairros vizinhos, e a distância real depende das ruas, que ainda não foram modeladas (SDD-035).",
    },
    {
      id: "o-que-nao-dizem",
      phase: "limits",
      kicker: "O que os dados não dizem",
      title: "O cadastro mostra onde — não quanto, nem para quem.",
      body: [
        "Esta base ainda não tem população por bairro, tempo de deslocamento nem capacidade de atendimento.",
        facts.mismatches === 0
          ? "Todas as unidades caem no bairro que a própria fonte declara."
          : `${plural(facts.mismatches, "unidade declara", "unidades declaram")} um bairro diferente daquele em que o ponto cai. A diferença aparece na ficha, sem correção automática.`,
      ],
    },
    {
      id: "sua-vez",
      phase: "explore",
      kicker: "Sua vez",
      title: "Agora, explore o território.",
      body: [
        "Clique em um bairro ou em uma UAPS para abrir a ficha, sempre com fonte e ano.",
        "Use Ctrl+K para buscar por nome ou CNES, ou percorra o Índice de bairros.",
      ],
    },
  ];
}
