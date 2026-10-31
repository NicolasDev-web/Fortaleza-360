import { describe, expect, it } from "vitest";
import { bigIdea, buildStoryChapters, buildStoryFacts } from "@/lib/story";
import { demoModel } from "./fixtures/demo-geo";

const FORBIDDEN = [/desassistid/i, /vulner[aá]ve/i, /cobertura (adequada|insuficiente)/i, /car[eê]ncia/i];

describe("Modo História (DEMO)", () => {
  const facts = buildStoryFacts(demoModel());
  const chapters = buildStoryChapters(facts);

  it("deriva os fatos das contagens do modelo", () => {
    expect(facts).toMatchObject({
      neighborhoods: 2,
      facilities: 3,
      areaKm2: 488.2,
      withFacility: 2,
      withoutFacility: 0,
      mismatches: 1,
      outsideNeighborhoods: 1,
    });
    expect([...facts.mismatchIds]).toEqual(["demo-2"]);
  });

  it("tem seis capítulos com títulos-conclusão calculados", () => {
    expect(chapters.map(({ phase }) => phase)).toEqual([
      "intro",
      "city",
      "facilities",
      "contours",
      "limits",
      "explore",
    ]);
    expect(chapters[0].title).toBe("Fortaleza, vista pelo caminho até o cuidado.");
    expect(chapters[1].title).toBe("Uma cidade, 2 bairros.");
    expect(chapters[3].title).toBe(
      "E no bairro que você conhece?",
    );
    expect(chapters[4].body.join(" ")).toMatch(/conjunto de postos/);
    expect(chapters[4].body.join(" ")).toMatch(/não diz quantas pessoas cada unidade atende/);
    expect(bigIdea(facts)).toBe("3 postos de saúde para 2 bairros. Aqui você vê onde ficam — não quanto conseguem atender.");
  });

  it("acompanha a contagem por contorno da ressalva sobre acesso", () => {
    const contours = chapters.find(({ phase }) => phase === "contours");
    expect(contours?.caveat).toMatch(/não mede acesso/i);
  });

  it("nunca rotula bairros como desassistidos ou vulneráveis", () => {
    const text = chapters
      .flatMap(({ kicker, title, body, caveat }) => [kicker, title, ...body, caveat ?? ""])
      .join(" ");

    for (const pattern of FORBIDDEN) expect(text).not.toMatch(pattern);
  });
});
