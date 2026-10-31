import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("linha de distância no mapa", () => {
  it("orienta sem seleção, atualiza com o bairro e some ao desativar", async () => {
    const user = userEvent.setup();
    const { container } = render(<Observatory model={demoModel()} />);
    const toggle = screen.getByRole("button", { name: /^Distância até o posto/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/Selecione um bairro para ver a distância/)).toBeInTheDocument();
    expect(container.querySelector("[data-distance-proxy]")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Lista de bairros" }));
    const index = screen.getByRole("region", { name: "Lista de bairros" });
    await user.click(within(index).getByRole("button", { name: /DEMO Bairro Oeste/ }));
    expect(container.querySelectorAll("[data-distance-proxy]")).toHaveLength(1);
    expect(container.querySelector(".map-distance-caption")).toHaveTextContent("DEMO Bairro Oeste");
    expect(container.querySelector(".map-distance-caption")).toHaveTextContent("não é percurso nem tempo");
    await user.click(toggle);
    expect(container.querySelector("[data-distance-proxy]")).toBeNull();
    expect(container.querySelector(".map-distance-caption")).toBeNull();
  });

  it("sem UAPS mantém a distância indisponível", async () => {
    const model = demoModel();
    model.facilities = [];
    window.history.replaceState(null, "", "/?neighborhood=1");
    const user = userEvent.setup();
    const { container } = render(<Observatory model={model} />);
    await user.click(screen.getByRole("button", { name: /^Distância até o posto/ }));
    expect(screen.getByText("Nenhuma UAPS disponível para calcular a distância.")).toBeInTheDocument();
    expect(container.querySelector("[data-distance-proxy]")).toBeNull();
  });
});
