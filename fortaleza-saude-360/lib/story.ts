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

/** Grande ideia (docs/VOICE.md): a frase que a tela inteira sustenta. */
export function bigIdea(facts: Pick<StoryFacts, "facilities" | "neighborhoods">): string {
  return `${plural(facts.facilities, "posto de saúde", "postos de saúde")} para ${plural(facts.neighborhoods, "bairro", "bairros")}. Aqui você vê onde ficam — não quanto conseguem atender.`;
}

export function buildStoryChapters(facts: StoryFacts): StoryChapter[] {
  const postos = plural(facts.facilities, "posto de saúde", "postos de saúde");
  const bairros = plural(facts.neighborhoods, "bairro", "bairros");

  return [
    {
      id: "terra-da-luz",
      phase: "intro",
      kicker: "Terra da Luz",
      title: `Fortaleza tem ${bairros} e ${postos}.`,
      body: [
        "O posto de saúde (UAPS) é a porta de entrada do SUS: é por onde a maioria das pessoas começa um atendimento na rede pública.",
        "Em seis telas curtas, você vê onde eles ficam — e o que os dados ainda não contam. Todo número vem de uma fonte pública.",
      ],
    },
    {
      id: "a-cidade",
      phase: "city",
      kicker: "A cidade",
      title:
        facts.areaKm2 === null
          ? `Uma cidade dividida em ${bairros}.`
          : `Uma cidade de ${decimal.format(facts.areaKm2)} km², dividida em ${bairros}.`,
      body: [
        "A linha de fora é o limite da cidade. As linhas finas são os bairros, definidos pela Prefeitura em 2019.",
        "Bairro é uma divisão da Prefeitura — não é a área que cada posto atende.",
      ],
    },
    {
      id: "portas-de-entrada",
      phase: "facilities",
      kicker: "Os postos",
      title: `${postos} na lista da Prefeitura.`,
      body: [
        "Cada ponto é um posto de saúde, na lista de 2026 da Secretaria Municipal da Saúde.",
        "A lista diz onde o posto fica. Não diz horário, equipe, se está aberto nem quanto consegue atender.",
      ],
    },
    {
      id: "contornos",
      phase: "contours",
      kicker: "Onde não tem ponto",
      title:
        facts.withoutFacility === 0
          ? `Todos os ${bairros} têm posto dentro do próprio limite.`
          : `${plural(facts.withFacility, "bairro tem", "bairros têm")} posto dentro do próprio limite. ${plural(facts.withoutFacility, "não tem", "não têm")}.`,
      body: ["Em destaque, os bairros com pelo menos um posto lá dentro."],
      caveat:
        "Isso não mede acesso: muita gente é atendida no posto do bairro vizinho. Para saber a distância de verdade, falta medir o caminho pelas ruas.",
    },
    {
      id: "o-que-nao-dizem",
      phase: "limits",
      kicker: "O que os dados não contam",
      title: "O mapa mostra onde — não quanto, nem para quem.",
      body: [
        "Ainda não estão aqui quantas pessoas moram perto de cada posto, quanto tempo se leva para chegar nem quantos atendimentos cada um faz.",
        facts.mismatches === 0
          ? "Todos os postos ficam no bairro que a própria Prefeitura informa."
          : `${plural(facts.mismatches, "posto aparece", "postos aparecem")} num bairro diferente do que a Prefeitura informa. A diferença aparece nos detalhes do posto, sem correção automática.`,
      ],
    },
    {
      id: "sua-vez",
      phase: "explore",
      kicker: "Sua vez",
      title: "Agora, procure o seu bairro.",
      body: [
        "Toque num bairro ou num posto para ver os detalhes e de onde vêm os dados.",
        "Ou use a busca (Ctrl+K) para achar pelo nome.",
      ],
    },
  ];
}
