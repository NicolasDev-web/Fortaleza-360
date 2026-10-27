import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/AppShell";
import { demoModel } from "./fixtures/demo-geo";

async function blockingViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
  });

  return results.violations.filter(
    ({ impact }) => impact === "critical" || impact === "serious",
  );
}

describe("acessibilidade da estação", () => {
  it("não apresenta violações sérias ou críticas com camadas carregadas", async () => {
    const { container } = render(<AppShell model={demoModel()} />);
    expect(await blockingViolations(container)).toEqual([]);
  });

  it("não apresenta violações sérias ou críticas no estado de erro", async () => {
    const { container } = render(<AppShell model={null} />);

    expect(screen.getByText("Não foi possível carregar as camadas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar bairro ou uaps/i })).toBeDisabled();
    expect(await blockingViolations(container)).toEqual([]);
  });

  it("começa pelo atalho de conteúdo e segue para modos e busca", async () => {
    const user = userEvent.setup();
    render(<AppShell model={demoModel()} />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Pular para a investigação" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("tab", { name: "Explorar" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /buscar bairro ou uaps/i })).toHaveFocus();
  });

  it("navega entre modos com as setas e mantém avisos de modo conceitual", async () => {
    const user = userEvent.setup();
    render(<AppShell model={demoModel()} />);

    screen.getByRole("tab", { name: "Explorar" }).focus();
    await user.keyboard("{ArrowRight}");

    const compare = screen.getByRole("tab", { name: /comparar/i });
    expect(compare).toHaveFocus();
    expect(compare).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Ilustração conceitual · não geográfica")).toBeInTheDocument();
    expect(screen.getByText(/nenhum bairro será classificado como vulnerável/i)).toBeInTheDocument();
  });

  it("mantém aviso de protótipo e de emergência sempre visíveis", () => {
    render(<AppShell model={demoModel()} />);

    expect(screen.getByRole("note")).toHaveTextContent(/protótipo/i);
    expect(screen.getByText(/não é serviço de emergência/i)).toBeInTheDocument();
  });
});
