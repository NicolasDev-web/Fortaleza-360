import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { Observatory } from "@/components/Observatory";
import { NeighborhoodComparison } from "@/components/NeighborhoodComparison";
import { demoModel } from "./fixtures/demo-geo";

describe("Comparar bairros", () => {
  it("seleciona por teclado, impede duplicação, inverte colunas e destaca os dois contornos", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);
    await user.click(screen.getByRole("tab", { name: "Comparar" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const first = screen.getByLabelText("Bairro A");
    first.focus();
    await user.selectOptions(first, "1");
    expect(within(screen.getByLabelText("Bairro B")).getByRole("option", { name: "DEMO Bairro Oeste" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Bairro B"), "2");
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "A · DEMO Bairro Oeste" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-comparison]")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Inverter A e B" }));
    expect(within(table).getByRole("columnheader", { name: "A · DEMO Bairro Leste" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Bairro B"), "");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("preserva zero de moradores, faixa e ausência de posto sem dividir por zero", async () => {
    const model = demoModel();
    model.neighborhoods.find(item => item.code === "1")!.facilityIds = [];
    model.population = { referenceYear: 2022, total: 1000, byCode: {
      "1": { population: 0, low: 0, high: 10 },
      "2": { population: 1000, low: 900, high: 1100 },
    } };
    const { container } = render(<NeighborhoodComparison model={model} codes={["1", "2"]} onChange={vi.fn()} onFrame={vi.fn()} />);
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("Faixa: 0 a 10");
    expect(table).toHaveTextContent("Sem posto no bairro");
    expect(table).toHaveTextContent("1.000");
    expect(table).toHaveTextContent("em linha reta");
    expect(table.textContent).not.toMatch(/Infinity|NaN/);
    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
  });

  it("distingue população ausente, rede vazia e mapa indisponível", () => {
    const model = demoModel();
    model.facilities = [];
    const { rerender } = render(<NeighborhoodComparison model={model} codes={["1", "2"]} onChange={vi.fn()} onFrame={vi.fn()} />);
    expect(within(screen.getByRole("table")).getAllByText("Não disponível").length).toBeGreaterThanOrEqual(4);
    rerender(<NeighborhoodComparison model={null} codes={["1", "2"]} onChange={vi.fn()} onFrame={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Dados do mapa indisponíveis");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
