import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { buildStoryChapters, buildStoryFacts } from "@/lib/story";
import { demoModel } from "./fixtures/demo-geo";

/** Jargão da lista "Evite" de docs/VOICE.md. Pode aparecer só em "Como sabemos disso". */
const JARGON = [
  /ponto-no-pol[ií]gono/i,
  /associa[cç][aã]o espacial/i,
  /WGS ?84/i,
  /EPSG/i,
  /\bproxy\b/i,
  /aten[cç][aã]o prim[aá]ria/i,
  /cadastrad[ao]s?/i,
  /contornos? oficia/i,
  /explora[cç][aã]o territorial/i,
  /\bref\. /i,
  /cat[aá]logo/i,
  /n[aã]o informado\b/i,
];

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

/** Texto que a pessoa lê sem abrir nada técnico. */
function plainText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-technical], .visually-hidden, [aria-hidden='true']").forEach(
    (node) => node.remove(),
  );
  return clone.textContent ?? "";
}

function expectPlain(text: string) {
  for (const pattern of JARGON) expect(text).not.toMatch(pattern);
}

describe("linguagem simples (docs/VOICE.md)", () => {
  it.each([
    ["resumo", "/"],
    ["bairro com posto", "/?neighborhood=1"],
    ["posto de saúde", "/?selected=demo-1"],
    ["UPA sem dados de gestão", "/?selected=upa-1"],
  ])("a tela de %s não tem jargão fora de \"Como sabemos disso\"", async (_, url) => {
    window.history.replaceState(null, "", url);
    const { container } = render(<Observatory model={demoModel()} />);
    await screen.findAllByRole("heading", { level: 2 });

    expectPlain(plainText(container));
  });

  it("a história fala com qualquer pessoa", () => {
    const chapters = buildStoryChapters(buildStoryFacts(demoModel()));
    for (const chapter of chapters) {
      expectPlain([chapter.kicker, chapter.title, ...chapter.body, chapter.caveat ?? ""].join(" "));
    }
  });

  it("o detalhe técnico continua disponível para quem abrir", async () => {
    window.history.replaceState(null, "", "/?selected=demo-1");
    render(<Observatory model={demoModel()} />);
    await screen.findByRole("heading", { level: 2, name: "DEMO UAPS Oeste" });

    const summary = screen.getByText("Como sabemos disso");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).toHaveTextContent(/CNES/);
    expect(summary.closest("details")).toHaveTextContent(/camada 824/);
  });
});
