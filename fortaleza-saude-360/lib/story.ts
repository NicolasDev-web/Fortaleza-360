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
      title: "Fortaleza, vista pelo caminho até o cuidado.",
      body: [
        "Um posto de saúde faz parte da vida de um bairro. Mas onde ficam os postos de Fortaleza?",
        "Vamos olhar a cidade, conhecer os pontos no mapa e escolher um bairro para explorar juntos.",
      ],
    },
    {
      id: "a-cidade",
      phase: "city",
      kicker: "A cidade",
      title: `Uma cidade, ${bairros}.`,
      body: [
        "A linha de fora mostra Fortaleza. Cada contorno menor é um bairro: um jeito de localizar a conversa.",
        facts.areaKm2 === null ? "Os limites vêm da Prefeitura, com referência de 2019." : `São ${decimal.format(facts.areaKm2)} km², segundo o limite oficial de 2019. Bairro não é a área de atendimento de um posto.`,
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
      kicker: "Seu bairro",
      title: "E no bairro que você conhece?",
      body: ["Escolha um bairro. O mapa se aproxima e a história passa a ter um lugar que faz sentido para você."],
      caveat:
        "Contar postos dentro de um bairro não mede acesso: quem mora ali também pode usar um posto do bairro vizinho.",
    },
    {
      id: "o-que-nao-dizem",
      phase: "limits",
      kicker: "Como ler o mapa",
      title: "Estar perto é uma parte da história.",
      body: [
        "No Simular, estimamos quantos moradores ficam no alcance de uma caminhada de 10, 20 ou 30 minutos até algum posto.",
        "É uma estimativa para o conjunto de postos. Ela não diz quantas pessoas cada unidade atende, se há vagas ou quanto uma pessoa realmente leva no trajeto.",
      ],
    },
    {
      id: "sua-vez",
      phase: "explore",
      kicker: "Sua vez",
      title: "Agora, faça uma pergunta ao mapa.",
      body: [
        "Conheça um bairro, coloque dois lado a lado ou experimente uma nova localização para um posto.",
        "Cada escolha revela uma resposta. Você pode voltar a esta história quando quiser.",
      ],
    },
  ];
}
