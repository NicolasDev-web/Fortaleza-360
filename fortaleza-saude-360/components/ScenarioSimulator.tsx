"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Position } from "@/lib/geo";
import type { ScenarioResult } from "@/lib/scenario";
import { SavedScenarios } from "@/components/SavedScenarios";

type Props = { candidate: Position | null; onCandidate: (point: Position | null) => void; onResultChange?: (result: ScenarioResult | null) => void };
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function ScenarioSimulator({ candidate, onCandidate, onResultChange }: Props) {
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Carregando e verificando a malha de caminhada…");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState(false);
  const [modelSha, setModelSha] = useState<string | null>(null);

  useEffect(() => {
    let instance: Worker;
    try {
      instance = new Worker(new URL("../lib/scenario.worker.ts", import.meta.url), { type: "module" });
    } catch {
      // O navegador é um sistema externo; ausência de Worker é uma falha de ambiente.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("Este navegador não conseguiu iniciar o simulador. Tente recarregar a página.");
      return;
    }
    worker.current = instance;
    instance.onmessage = (event) => {
      const data = event.data;
      if (data.kind === "ready") { setReady(true); setModelSha(data.modelSha ?? null); setMessage("Escolha um ponto no mapa ou informe as coordenadas."); }
      else if (data.id === request.current || (data.kind === "error" && data.id === 0)) {
        setError(data.kind === "error");
        setResult(data.kind === "result" ? data.result : null);
        onResultChange?.(data.kind === "result" ? data.result : null);
        setMessage(data.kind === "result" ? "Cenário calculado." : data.message);
      }
    };
    instance.onerror = () => { setError(true); setResult(null); onResultChange?.(null); setMessage("Não foi possível iniciar o cálculo. Reabra o modo Simular para tentar de novo."); };
    instance.postMessage({ kind: "init", id: 0 });
    return () => { instance.terminate(); worker.current = null; };
  }, [onResultChange]);

  useEffect(() => {
    request.current++;
    // O resultado acompanha uma tarefa externa no Worker e não pode sobreviver a outro ponto.
    /* eslint-disable react-hooks/set-state-in-effect */
    setResult(null); setError(false);
    onResultChange?.(null);
    if (!candidate) {
      if (ready) setMessage("Escolha um ponto no mapa ou informe as coordenadas.");
    } else if (ready) {
      setMessage("Calculando o cenário…");
      worker.current?.postMessage({ kind: "calculate", id: request.current, point: candidate });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [candidate, ready, onResultChange]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const lon = Number(fields.get("lon")), lat = Number(fields.get("lat"));
    onCandidate([lon, lat]);
  };
  const main = result?.rows.find(row => row.scenario === "central" && row.minutes === 10);
  const rangeAtTen = result?.rows.filter(row => row.minutes === 10).map(row => row.delta) ?? [];

  return (
    <section className="reading-panel scenario-panel" aria-labelledby="scenario-title">
      <span className="eyebrow">Cenário hipotético</span>
      <h2 id="scenario-title">E se abrisse um posto aqui?</h2>
      <p>Escolha um ponto no mapa e veja se uma nova localização amplia o alcance a pé. Pelo teclado, mova o mapa com as setas e pressione Enter.</p>
      <details className="scenario-coordinates"><summary>Usar latitude e longitude</summary>
      <form key={candidate?.join(",") ?? "empty"} onSubmit={submit} className="scenario-form">
        <label>Latitude<input name="lat" type="number" step="any" min="-90" max="90" required defaultValue={candidate?.[1]} /></label>
        <label>Longitude<input name="lon" type="number" step="any" min="-180" max="180" required defaultValue={candidate?.[0]} /></label>
        <button className="action-button" type="submit" disabled={!ready}>Calcular este ponto</button>
      </form>
      </details>
      <button className="back-link" type="button" onClick={() => onCandidate(null)}>Limpar cenário</button>
      <p role={error ? "alert" : "status"} aria-live="polite">{message}</p>
      {result ? <>
        <div className="scenario-reading" id="scenario-result" tabIndex={-1} role="region" aria-labelledby="scenario-result-title"><h3 id="scenario-result-title">O que muda com esse ponto?</h3>
          {main ? <>
            <strong className="scenario-gain">+{integer.format(main.delta)} moradores</strong>
            <p>a mais no alcance estimado de até <strong>10 minutos a pé</strong>, na hipótese de 4,8 km/h.</p>
            <p>Variando a caminhada, o ganho fica entre {integer.format(Math.min(...rangeAtTen))} e {integer.format(Math.max(...rangeAtTen))}. Essa faixa não é uma garantia.</p>
          </> : null}
          <p>Um ganho zero significa que esse alcance não aumentou naquela hipótese; não avalia a utilidade de um serviço.</p>
        </div>
        <details className="scenario-figures"><summary>Ver os cenários de 10, 20 e 30 minutos</summary>
        <p>O ponto fica a {integer.format(result.snapM)} m do ponto da rede de caminhada usado no cálculo.</p>
        <div className="scenario-table-wrap">
          <table className="scenario-table">
            <caption>População estimada nos corredores — caminhada a 4,8 km/h</caption>
            <thead><tr><th>Tempo</th><th>Base</th><th>Com proposta</th><th>A mais</th></tr></thead>
            <tbody>{result.rows.filter(r => r.scenario === "central").map(row => {
              const range = result.rows.filter(r => r.minutes === row.minutes).map(r => r.delta);
              return <tr key={row.minutes}>
                <th>{row.minutes} min</th><td>{integer.format(row.base)}</td><td>{integer.format(row.proposed)}</td>
                <td><strong>+{integer.format(row.delta)}</strong><small>Entre {integer.format(Math.min(...range))} e {integer.format(Math.max(...range))}, variando a caminhada.</small></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        </details>
      </> : null}
      <details className="scenario-saved"><summary>Cenários salvos neste navegador</summary><SavedScenarios candidate={candidate} result={result} modelSha={modelSha} onOpen={onCandidate} /></details>
      <p className="scenario-caveat">É uma estimativa de alcance a pé, não de vagas ou atendimento. Moradores do Censo 2022 e postos de 2026. As rotas não foram medidas em campo.</p>
      <details><summary>Como sabemos disso</summary>
        <p>Usa o mesmo ponto representativo por setor e os corredores de 25 m da base; o trecho até a rua e a entrada do posto não soma tempo.</p>
        <p>A base e o ponto proposto usam a mesma malha OpenStreetMap e os mesmos custos. A faixa varia a velocidade entre 4,0 e 5,5 km/h; não é um intervalo de confiança. Ninguém é contado duas vezes. O ponto fica em memória, exceto quando você escolhe salvar neste navegador. Excluir todos remove os cenários salvos.</p>
        <a href="/data/population-coverage.json" download>Baixar base e fontes</a>
      </details>
    </section>
  );
}
