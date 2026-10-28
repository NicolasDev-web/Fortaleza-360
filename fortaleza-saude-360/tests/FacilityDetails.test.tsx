import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function field(term: string) {
  const dt = screen.getByText(term, { selector: "dt" });
  return dt.nextElementSibling?.textContent;
}

async function openFicha(id: string, name: string) {
  window.history.replaceState(null, "", `/?selected=${id}`);
  render(<Observatory model={demoModel()} />);
  await screen.findByRole("heading", { level: 2, name });
}

describe("ficha da unidade", () => {
  it("mostra tipo, natureza, bairros, fonte e datas", async () => {
    await openFicha("demo-1", "DEMO UAPS Oeste");

    expect(field("Tipo")).toBe("Posto de saúde (UAPS)");
    expect(field("Natureza (fonte)")).toBe("DEMO ADMINISTRAÇÃO PÚBLICA");
    expect(field("Bairro informado pela Prefeitura")).toBe("DEMO BAIRRO OESTE");
    expect(field("Bairro")).toBe("DEMO Bairro Oeste");
    expect(field("Dados de")).toBe("2026");
    expect(field("Baixados em")).toBe("2026-10-27");
    expect(screen.getByText(/camada 824/)).toBeInTheDocument();
  });

  it("deixa explícito todo campo ausente", async () => {
    await openFicha("demo-3", "DEMO UAPS no vazio");

    expect(field("Código nacional (CNES)")).toBe("A Prefeitura não informa");
    expect(field("Natureza (fonte)")).toBe("A Prefeitura não informa");
    expect(field("Bairro informado pela Prefeitura")).toBe("A Prefeitura não informa");
    expect(field("Atende pelo SUS")).toBe("A Prefeitura não informa");
    expect(field("Bairro")).toBe("Fora dos limites dos bairros");
  });

  it("não alega horário, lotação ou funcionamento", async () => {
    await openFicha("upa-1", "DEMO UPA Oeste");

    const panel = screen.getByRole("heading", { level: 2, name: "DEMO UPA Oeste" }).closest("section")!;
    expect(panel.textContent).not.toMatch(/aberto agora|horário de funcionamento:|lotação atual|tempo de espera:/i);
    expect(panel.textContent).toMatch(/não mostra horário, lotação/i);
    expect(field("Natureza (fonte)")).toBe("A Prefeitura não informa");
  });
});
