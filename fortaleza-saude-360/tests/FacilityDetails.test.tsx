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

    expect(field("Tipo")).toBe("UAPS");
    expect(field("Natureza (fonte)")).toBe("DEMO ADMINISTRAÇÃO PÚBLICA");
    expect(field("Bairro declarado na fonte")).toBe("DEMO BAIRRO OESTE");
    expect(field("Bairro (associação espacial)")).toBe("DEMO Bairro Oeste");
    expect(field("Ano de referência")).toBe("2026");
    expect(field("Coleta")).toBe("2026-10-27");
    expect(screen.getByText(/camada 824/)).toBeInTheDocument();
  });

  it("deixa explícito todo campo ausente", async () => {
    await openFicha("demo-3", "DEMO UAPS no vazio");

    expect(field("CNES")).toBe("Não informado");
    expect(field("Natureza (fonte)")).toBe("Não informado");
    expect(field("Bairro declarado na fonte")).toBe("Não informado");
    expect(field("Atende SUS")).toBe("Não informado");
    expect(field("Bairro (associação espacial)")).toBe("Fora dos contornos de bairro");
  });

  it("não alega horário, lotação ou funcionamento", async () => {
    await openFicha("upa-1", "DEMO UPA Oeste");

    const panel = screen.getByRole("heading", { level: 2, name: "DEMO UPA Oeste" }).closest("section")!;
    expect(panel.textContent).not.toMatch(/aberto agora|horário de funcionamento:|lotação atual|tempo de espera:/i);
    expect(panel.textContent).toMatch(/não representa horário, capacidade, lotação/i);
    expect(field("Natureza (fonte)")).toBe("Não informado");
  });
});
