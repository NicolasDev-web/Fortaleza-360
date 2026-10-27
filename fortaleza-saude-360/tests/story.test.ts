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
    expect(chapters[0].title).toBe("Fortaleza, 2 bairros e 3 UAPS no cadastro.");
    expect(chapters[1].title).toBe("488,2 km² divididos em 2 bairros.");
    expect(chapters[3].title).toBe(
      "2 bairros têm ao menos uma UAPS dentro do contorno; 0, nenhuma.",
    );
    expect(chapters[4].body.join(" ")).toMatch(/1 unidade declara um bairro diferente/);
    expect(bigIdea(facts)).toBe("3 UAPS em 2 bairros: onde estão, não quanto atendem.");
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
