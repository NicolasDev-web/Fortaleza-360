import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory, STORY_SEEN_KEY } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("UPAs e hospitais municipais", () => {
  it("ficam fora das contagens de UAPS", () => {
    const model = demoModel();

    expect(model.otherUnits.map(({ id, type }) => [id, type])).toEqual([
      ["upa-1", "UPA"],
      ["hospital-1", "HOSPITAL"],
    ]);
    expect(model.facilities).toHaveLength(3);
    expect(model.facilities.every(({ type }) => type === "UAPS")).toBe(true);
    expect(model.neighborhoods.flatMap(({ facilityIds }) => facilityIds)).not.toContain("upa-1");
    expect(model.otherUnits[0].neighborhoodCode).toBe("1");
  });

  it("têm filtro por tipo nas camadas e símbolo próprio na legenda", async () => {
    const user = userEvent.setup();
    const { container } = render(<Observatory model={demoModel()} />);

    const upaToggle = screen.getByRole("button", { name: /^UPA/ });
    const hospitalToggle = screen.getByRole("button", { name: /Hospitais municipais/ });
    expect(upaToggle).toHaveAttribute("aria-pressed", "true");
    expect(hospitalToggle).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-facility="upa-1"]')).toHaveClass("unit-upa");
    expect(container.querySelector('[data-facility="hospital-1"]')).toHaveClass("unit-hospital");

    await user.click(upaToggle);
    expect(upaToggle).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector('[data-facility="upa-1"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-facility="hospital-1"]')).toBeInTheDocument();

    const legend = screen.getByRole("heading", { name: "Legenda" }).parentElement!;
    expect(within(legend).getByText(/UPA \(pronto atendimento\)/)).toBeInTheDocument();
    expect(within(legend).getByText(/Hospital municipal/)).toBeInTheDocument();
  });

  it("aparecem na busca e abrem a ficha com campos ausentes e fonte própria", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    await user.click(screen.getByRole("button", { name: /buscar bairro ou uaps/i }));
    await user.type(screen.getByRole("combobox"), "DEMO UPA");
    const option = screen.getByRole("option", { name: /DEMO UPA Oeste/ });
    expect(option).toHaveTextContent("UPA · DEMO Bairro Oeste");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { level: 2, name: "DEMO UPA Oeste" })).toBeInTheDocument();
    expect(screen.getByText("UPA · ficha da unidade")).toBeInTheDocument();
    expect(screen.getAllByText("Não informado").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/camada 825/)).toBeInTheDocument();
    expect(screen.getByText(/não representa horário, capacidade, lotação/i)).toBeInTheDocument();
  });

  it("não entram no Modo História, que trata só de UAPS", () => {
    window.localStorage.removeItem(STORY_SEEN_KEY);
    const { container } = render(<Observatory model={demoModel()} />);

    expect(container.querySelector(".layer-units")).not.toBeInTheDocument();
  });
});
