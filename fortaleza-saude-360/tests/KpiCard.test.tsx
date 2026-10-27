import { render, screen } from "@testing-library/react";
import { Hospital } from "lucide-react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/components/KpiCard";

describe("KpiCard", () => {
  it("diferencia ausência de dados de um valor numérico válido", () => {
    const { rerender } = render(
      <KpiCard
        icon={Hospital}
        label="Unidades cadastradas"
        note="Aguardando integração real"
        value={null}
      />,
    );

    expect(screen.getByLabelText("Sem dados")).toHaveTextContent("—");

    rerender(
      <KpiCard
        icon={Hospital}
        label="Unidades cadastradas"
        note="Fonte validada"
        value={0}
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sem dados")).not.toBeInTheDocument();
  });
});
