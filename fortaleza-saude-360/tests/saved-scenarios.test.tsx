import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SavedScenarios } from "@/components/SavedScenarios";
import { SCENARIOS_KEY, parseSavedScenarios, readSavedScenarios, writeSavedScenarios, type SavedScenario } from "@/lib/saved-scenarios";
import type { ScenarioResult } from "@/lib/scenario";

const result: ScenarioResult = { snapM: 30, total: 100, rows: ["slow", "central", "fast"].flatMap(scenario => [10, 20, 30].map(minutes => ({ scenario, minutes, base: 50, proposed: 60, delta: 10, deltaPercentagePoints: 10 }))) };
const demo: SavedScenario = { id: "demo-proposta", name: "DEMO proposta", savedAt: "2026-10-29T12:00:00Z", point: [-38.5, -3.8], modelSha: "a".repeat(64), result };

describe("cenários locais", () => {
  it("valida versão, contagem, coordenadas e coerência dos resultados históricos", () => {
    expect(parseSavedScenarios(null)).toEqual([]);
    const raw = (item: unknown) => JSON.stringify({ schema: 1, items: [item] });
    expect(parseSavedScenarios(raw(demo))).toEqual([demo]);
    expect(() => parseSavedScenarios("{" )).toThrow();
    expect(() => parseSavedScenarios(JSON.stringify({ schema: 2, items: [] }))).toThrow();
    expect(() => parseSavedScenarios(raw({ ...demo, point: [181, 0] }))).toThrow();
    expect(() => parseSavedScenarios(raw({ ...demo, result: { ...result, rows: result.rows.map(row => ({ ...row, delta: 99 })) } }))).toThrow();
    expect(() => parseSavedScenarios(JSON.stringify({ schema: 1, items: [demo, demo] }))).toThrow();
  });

  it("salva por escolha explícita, reabre o ponto e exclui sem apagar outras preferências", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SavedScenarios candidate={demo.point} result={result} modelSha={demo.modelSha} onOpen={onOpen} />);
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
    await user.type(screen.getByLabelText("Nome do cenário"), demo.name);
    await user.click(screen.getByRole("button", { name: "Salvar neste navegador" }));
    expect(readSavedScenarios(localStorage)[0].point).toEqual(demo.point);
    expect(screen.getByText(/Resultado histórico/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `Reabrir ${demo.name}` }));
    expect(onOpen).toHaveBeenCalledWith(demo.point);
    await user.click(screen.getByRole("button", { name: "Excluir todos os cenários salvos" }));
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
    expect(localStorage.getItem("f360:story-seen")).toBe("1");
  });

  it("não anuncia sucesso quando a gravação falha e permite limpar arquivo corrompido", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("DEMO quota"); });
    const { unmount } = render(<SavedScenarios candidate={demo.point} result={result} modelSha={demo.modelSha} onOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome do cenário"), { target: { value: demo.name } });
    await user.click(screen.getByRole("button", { name: "Salvar neste navegador" }));
    expect(screen.getByText(/Não foi possível salvar/)).toBeInTheDocument();
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
    write.mockRestore();
    unmount();
    localStorage.setItem(SCENARIOS_KEY, "DEMO corrompido");
    render(<SavedScenarios candidate={null} result={null} modelSha={null} onOpen={vi.fn()} />);
    expect(screen.getByText(/Não foi possível ler os cenários locais/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir todos os cenários salvos" }));
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
  });

  it("remove só o cenário pedido e preserva o hash do modelo", () => {
    writeSavedScenarios(localStorage, [demo, { ...demo, id: "demo-2" }]);
    writeSavedScenarios(localStorage, readSavedScenarios(localStorage).filter(row => row.id !== demo.id));
    expect(readSavedScenarios(localStorage)).toEqual([{ ...demo, id: "demo-2" }]);
  });
});
