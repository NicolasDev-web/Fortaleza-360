import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Insights, InsightsFooter } from "@/components/Insights";

describe("Insights", () => {
  it("orienta a leitura sem afirmar cobertura ou vulnerabilidade", () => {
    const { container } = render(
      <>
        <Insights />
        <InsightsFooter />
      </>,
    );

    expect(screen.getByText("Antes de tirar conclusões")).toBeInTheDocument();
    expect(
      screen.getByText(/Simular estima o ganho de acesso geográfico/i),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/bairro vulnerável/i);
    expect(container).not.toHaveTextContent(/cobertura (adequada|insuficiente)/i);
  });
});
