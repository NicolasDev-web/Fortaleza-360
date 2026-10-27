import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("acessibilidade da página inicial", () => {
  it("não apresenta violações sérias ou críticas detectáveis pelo axe", async () => {
    const { container } = render(<Home />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    const blockingViolations = results.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );

    expect(blockingViolations).toEqual([]);
  });

  it("começa pelo atalho de conteúdo e alcança filtros pelo teclado", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.tab();
    expect(
      screen.getByRole("link", { name: "Pular para a investigação" }),
    ).toHaveFocus();

    await user.tab();
    const filterSummary = screen
      .getByText("Filtros e contexto")
      .closest("summary");

    expect(filterSummary).toHaveFocus();
    expect(filterSummary?.closest("details")).not.toHaveAttribute("open");
  });
});
