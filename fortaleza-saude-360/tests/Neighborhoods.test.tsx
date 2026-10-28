import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function neighborhoodPath(container: HTMLElement, code: string) {
  const path = container.querySelector(`.layer-neighborhoods path[data-nb="${code}"]`);
  if (!path) throw new Error(`Bairro ${code} não renderizado`);
  return path;
}

describe("camada de bairros", () => {
  it("seleciona o mesmo bairro pelo mapa, pelo índice e pela URL", async () => {
    const user = userEvent.setup();
    const first = render(<Observatory model={demoModel()} />);
    const path = neighborhoodPath(first.container, "1");

    await user.click(path);
    expect(window.location.search).toBe("?neighborhood=1");
    expect(screen.getByRole("heading", { level: 2, name: "DEMO Bairro Oeste" })).toBeInTheDocument();
    const fromMap = first.container.querySelector(".neighborhood-selected")?.getAttribute("d");
    expect(fromMap).toBe(path.getAttribute("d"));
    first.unmount();
    window.history.replaceState(null, "", "/");

    const second = render(<Observatory model={demoModel()} />);
    await user.click(screen.getByRole("tab", { name: "Índice de bairros" }));
    const index = screen.getByRole("region", { name: "Índice de bairros" });
    await user.click(within(index).getByRole("button", { name: /DEMO Bairro Oeste/ }));
    expect(window.location.search).toBe("?neighborhood=1");
    expect(second.container.querySelector(".neighborhood-selected")?.getAttribute("d")).toBe(fromMap);
    second.unmount();

    const third = render(<Observatory model={demoModel()} />);
    expect(
      await screen.findByRole("heading", { level: 2, name: "DEMO Bairro Oeste" }),
    ).toBeInTheDocument();
    expect(third.container.querySelector(".neighborhood-selected")?.getAttribute("d")).toBe(fromMap);
  });

  it("anuncia ao leitor de tela o mesmo conteúdo do tooltip", async () => {
    const user = userEvent.setup();
    const { container } = render(<Observatory model={demoModel()} />);

    fireEvent.pointerMove(neighborhoodPath(container, "1"), { clientX: 40, clientY: 40 });
    const tooltip = container.querySelector(".map-tooltip");
    expect(tooltip).toHaveTextContent("DEMO Bairro Oeste");
    expect(tooltip).toHaveTextContent("1 UAPS no cadastro");

    await user.click(screen.getByRole("tab", { name: "Índice de bairros" }));
    const index = screen.getByRole("region", { name: "Índice de bairros" });
    await user.click(within(index).getByRole("button", { name: /DEMO Bairro Oeste/ }));
    expect(
      screen.getByText("Bairro selecionado: DEMO Bairro Oeste, 1 UAPS no cadastro"),
    ).toBeInTheDocument();
  });

  it("dispensa o tooltip com Esc sem mover o ponteiro (WCAG 1.4.13)", () => {
    const { container } = render(<Observatory model={demoModel()} />);
    fireEvent.pointerMove(neighborhoodPath(container, "2"), { clientX: 40, clientY: 40 });
    expect(container.querySelector(".map-tooltip")).toHaveTextContent("DEMO Bairro Leste");

    fireEvent.keyDown(screen.getByRole("region", { name: "Mapa interativo de Fortaleza" }), {
      key: "Escape",
    });

    expect(container.querySelector(".map-tooltip")).not.toBeInTheDocument();
  });
});
