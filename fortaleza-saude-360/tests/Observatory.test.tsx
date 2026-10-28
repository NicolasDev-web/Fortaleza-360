import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Observatory", () => {
  it("abre a busca com Ctrl+K, filtra, seleciona com Enter e devolve o foco", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    const trigger = screen.getByRole("button", { name: /buscar bairro ou posto/i });
    trigger.focus();
    await user.keyboard("{Control>}k{/Control}");

    const input = screen.getByRole("combobox", { name: /buscar bairro, posto ou código cnes/i });
    expect(input).toHaveFocus();

    await user.type(input, "leste");
    // A lista refiltra após a pausa de digitação (debounce, SDD-031).
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("DEMO Bairro Leste"),
      expect.stringContaining("DEMO UAPS Leste"),
    ]);

    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: "DEMO UAPS Leste" })).toBeInTheDocument();
    expect(window.location.search).toBe("?neighborhood=2&selected=demo-2");
  });

  it("fecha a busca com Esc sem alterar a seleção", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    await user.keyboard("/");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /postos de saúde para 2 bairros\. Aqui você vê onde ficam/ }),
    ).toBeInTheDocument();
  });

  it("abre a ficha do bairro pelo índice e explica ausência sem inferir desassistência", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    await user.click(screen.getByRole("tab", { name: "Lista de bairros" }));
    const index = screen.getByRole("region", { name: "Lista de bairros" });
    await user.click(within(index).getByRole("button", { name: /DEMO Bairro Oeste/ }));

    expect(screen.getByRole("heading", { level: 2, name: "DEMO Bairro Oeste" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /DEMO UAPS Oeste/ }));

    expect(screen.getByText("Prefeitura (gestão municipal)")).toBeInTheDocument();
    expect(screen.getByText(/não mostra horário, equipe/i)).toBeInTheDocument();
  });

  it("sinaliza divergência entre bairro declarado e bairro espacial", async () => {
    window.history.replaceState(null, "", "/?selected=demo-2");
    render(<Observatory model={demoModel()} />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "DEMO UAPS Leste" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/A Prefeitura lista este posto no bairro “DEMO OUTRO NOME”/)).toBeInTheDocument();
  });

  it("alterna camadas com estado acessível", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    const toggle = screen.getByRole("button", { name: /^Postos de saúde/ });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
