import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import type { Position } from "@/lib/geo";

class DemoWorker {
  static current: DemoWorker;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { DemoWorker.current = this; }
  send(data: unknown) { act(() => this.onmessage?.({ data })); }
}
afterEach(() => vi.unstubAllGlobals());

it("envia coordenadas só ao Worker, ignora resultado antigo e encerra ao sair", () => {
  vi.stubGlobal("Worker", DemoWorker);
  const onCandidate = vi.fn();
  const point: Position = [-38.5, -3.8];
  const { rerender, unmount } = render(<ScenarioSimulator candidate={point} onCandidate={onCandidate} />);
  const worker = DemoWorker.current;
  worker.send({ kind: "ready" });
  const first = worker.postMessage.mock.calls.at(-1)![0];
  rerender(<ScenarioSimulator candidate={[-38.51, -3.81]} onCandidate={onCandidate} />);
  const latest = worker.postMessage.mock.calls.at(-1)![0];
  expect(latest.kind).toBe("calculate");
  worker.send({ kind: "error", id: first.id, message: "DEMO antigo" });
  expect(screen.queryByText("DEMO antigo")).not.toBeInTheDocument();
  worker.send({ kind: "error", id: latest.id, message: "DEMO fora da malha" });
  expect(screen.getByRole("alert")).toHaveTextContent("DEMO fora da malha");
  fireEvent.click(screen.getByRole("button", { name: "Limpar cenário" }));
  expect(onCandidate).toHaveBeenCalledWith(null);
  unmount();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

it("expõe erro de carregamento sem apresentar números de exemplo", () => {
  vi.stubGlobal("Worker", DemoWorker);
  render(<ScenarioSimulator candidate={null} onCandidate={vi.fn()} />);
  DemoWorker.current.send({ kind: "error", id: 0, message: "DEMO falha ao verificar fonte" });
  expect(screen.getByRole("alert")).toHaveTextContent("DEMO falha");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Calcular este ponto" })).toBeDisabled();
});

it("liga apenas o resultado atual ao resumo e o invalida ao trocar de ponto", () => {
  vi.stubGlobal("Worker", DemoWorker);
  const onResultChange = vi.fn();
  const onCandidate = vi.fn();
  const { rerender } = render(<ScenarioSimulator candidate={[-38.5, -3.8]} onCandidate={onCandidate} onResultChange={onResultChange} />);
  const worker = DemoWorker.current;
  worker.send({ kind: "ready" });
  const id = worker.postMessage.mock.calls.at(-1)![0].id;
  // DEMO: resultado sintético restrito a este teste, sem representar setor real.
  const result = { snapM: 20, total: 1000, rows: ["slow", "central", "fast"].flatMap(scenario => [10, 20, 30].map(minutes => ({ scenario, minutes, base: 100, proposed: 105, delta: 5, deltaPercentagePoints: 0.5 }))) };
  worker.send({ kind: "result", id, result });
  expect(onResultChange).toHaveBeenLastCalledWith(result);
  expect(screen.getByText("+5 moradores")).toBeVisible();
  rerender(<ScenarioSimulator candidate={[-38.51, -3.81]} onCandidate={onCandidate} onResultChange={onResultChange} />);
  expect(onResultChange).toHaveBeenLastCalledWith(null);
  worker.send({ kind: "result", id, result });
  expect(onResultChange).toHaveBeenLastCalledWith(null);
  expect(screen.queryByText("+5 moradores")).not.toBeInTheDocument();
});
