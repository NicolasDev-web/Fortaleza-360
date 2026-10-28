import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandPalette, SEARCH_DEBOUNCE_MS } from "@/components/CommandPalette";
import { searchTerritory } from "@/lib/search";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  vi.useRealTimers();
});

describe("searchTerritory", () => {
  const model = demoModel();
  const known = new Set([
    ...model.neighborhoods.map(({ name }) => name),
    ...model.facilities.map(({ name }) => name),
    ...model.otherUnits.map(({ name }) => name),
  ]);

  it("só devolve itens do dataset", () => {
    for (const term of ["", "demo", "leste", "upa", "0000002"]) {
      for (const result of searchTerritory(model, term)) expect(known).toContain(result.label);
    }
    expect(searchTerritory(model, "UAPS que não existe")).toEqual([]);
  });

  it("ignora acentos e caixa e encontra pelo CNES", () => {
    expect(searchTerritory(model, "HOSPITAL central").map(({ id }) => id)).toEqual(["hospital-1"]);
    expect(searchTerritory(model, "0000002").map(({ id }) => id)).toEqual(["demo-2"]);
  });

  it("agrupa UPAs e hospitais como unidades, com o tipo no detalhe", () => {
    const [upa] = searchTerritory(model, "DEMO UPA");
    expect(upa).toMatchObject({ kind: "facility", group: "Unidades", id: "upa-1" });
    expect(upa.detail).toMatch(/^UPA · /);
  });
});

describe("CommandPalette com debounce", () => {
  function renderPalette() {
    const onSelectFacility = vi.fn();
    render(
      <CommandPalette
        model={demoModel()}
        onClose={vi.fn()}
        onSelectFacility={onSelectFacility}
        onSelectNeighborhood={vi.fn()}
      />,
    );
    return { onSelectFacility, input: screen.getByRole("combobox") };
  }

  it("filtra só depois da pausa de digitação e anuncia a contagem", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null });
    const { input } = renderPalette();
    const initial = screen.getAllByRole("option").length;

    await user.type(input, "central");
    expect(screen.getAllByRole("option")).toHaveLength(initial);

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      expect.stringContaining("DEMO Hospital Central"),
    ]);
    expect(screen.getByText("1 resultado")).toBeInTheDocument();
  });

  it("Enter antes da pausa usa o termo digitado, não a lista antiga", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null });
    const { input, onSelectFacility } = renderPalette();

    await user.type(input, "central{Enter}");

    expect(onSelectFacility).toHaveBeenCalledWith("hospital-1");
  });
});
