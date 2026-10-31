"use client";

import { useState } from "react";
import { ArrowLeftRight, Crosshair, Download } from "lucide-react";
import { formatStraightLineDistance, nearestByStraightLine } from "@/lib/accessibility";
import { buildNeighborhoodCsv, downloadCsv } from "@/lib/export";
import { unproject, type Box } from "@/lib/geo";
import type { MapModel, NeighborhoodShape } from "@/lib/map-model";
import { peoplePerFacility, POPULATION_SOURCE } from "@/lib/population";
import { LAYER_SOURCES, SOURCE_COLLECTED_AT } from "@/lib/sources";

type Props = {
  model: MapModel | null;
  codes: [string, string];
  onChange: (codes: [string, string]) => void;
  onFrame: (box: Box) => void;
};

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function summary(model: MapModel, neighborhood: NeighborhoodShape) {
  const population = model.population?.byCode[neighborhood.code];
  const count = neighborhood.facilityIds.length;
  const ratio = population ? peoplePerFacility(population, count) : null;
  const nearest = nearestByStraightLine(unproject(model.projection, ...neighborhood.centroid), model.facilities);
  const range = (low: number, high: number) => `${number.format(low)} a ${number.format(high)}`;
  return [
    <span key="population">{population ? number.format(population.population) : "Não disponível"}
      {population ? <small>Faixa: {range(population.low, population.high)}</small> : null}</span>,
    number.format(count),
    <span key="ratio">{ratio ? number.format(ratio.central) : count === 0 ? "Sem posto no bairro" : "Não disponível"}
      {ratio ? <small>Faixa: {range(ratio.low, ratio.high)}</small> : null}</span>,
    nearest ? formatStraightLineDistance(nearest.distanceM) : "Não disponível",
    nearest ? model.facilities.find(({ id }) => id === nearest.facilityId)?.name ?? "Não disponível" : "Não disponível",
  ];
}

const labels = ["Moradores · Censo 2022", "Postos dentro do bairro · 2026", "Moradores por posto no bairro", "Distância do centro à UAPS mais próxima", "UAPS mais próxima do centro"];

export function NeighborhoodComparison({ model, codes, onChange, onFrame }: Props) {
  const [status, setStatus] = useState("");
  const selected = codes.map(code => model?.neighborhoods.find(item => item.code === code));
  const [a, b] = selected;
  const ready = !!model && !!a && !!b && a.code !== b.code;
  const values = ready ? [summary(model, a), summary(model, b)] : null;

  function change(index: number, code: string) {
    const next: [string, string] = [...codes];
    next[index] = code;
    onChange(next);
    setStatus("");
  }

  return (
    <aside className="reading-panel comparison-panel" aria-labelledby="comparison-title">
      <header>
        <h2 id="comparison-title">Dois bairros, lado a lado</h2>
        <p>Escolha os bairros para comparar moradores, postos e a aproximação de distância.</p>
      </header>
      {!model ? <p role="alert">Dados do mapa indisponíveis. Recarregue a página para tentar novamente.</p> : <>
        <div className="comparison-selectors">
          {codes.map((code, index) => <div key={index}>
            <label htmlFor={`comparison-${index}`}>Bairro {index === 0 ? "A" : "B"}</label>
            <select id={`comparison-${index}`} value={code} onChange={event => change(index, event.target.value)}>
              <option value="">Escolha um bairro</option>
              {model.neighborhoods.map(item => <option key={item.code} value={item.code} disabled={item.code === codes[1 - index]}>{item.name}</option>)}
            </select>
          </div>)}
        </div>
        <div className="comparison-actions">
          <button type="button" className="action-button action-ghost" disabled={!ready} onClick={() => { onChange([codes[1], codes[0]]); setStatus(""); }}><ArrowLeftRight size={15} aria-hidden="true" />Inverter A e B</button>
          <button type="button" className="action-button action-ghost" disabled={!a && !b} onClick={() => {
            const boxes = selected.filter((item): item is NeighborhoodShape => !!item).map(item => item.box);
            onFrame([Math.min(...boxes.map(box => box[0])), Math.min(...boxes.map(box => box[1])), Math.max(...boxes.map(box => box[2])), Math.max(...boxes.map(box => box[3]))]);
          }}><Crosshair size={15} aria-hidden="true" />Mostrar no mapa</button>
        </div>
        {values && a && b ? <>
          <div className="comparison-table-wrap" tabIndex={0} role="region" aria-label="Indicadores dos dois bairros">
            <table className="comparison-table">
              <caption>Comparação dos bairros selecionados</caption>
              <thead><tr><th scope="col">Indicador</th><th scope="col">A · {a.name}</th><th scope="col">B · {b.name}</th></tr></thead>
              <tbody>{labels.map((label, index) => <tr key={label}><th scope="row">{label}</th><td>{values[0][index]}</td><td>{values[1][index]}</td></tr>)}</tbody>
            </table>
          </div>
          <button type="button" className="action-button csv-download" onClick={() => {
            downloadCsv(buildNeighborhoodCsv(model, [a, b]), "f360-comparacao-bairros.csv");
            setStatus(`CSV preparado: A · ${a.name} e B · ${b.name}.`);
          }}><Download size={15} aria-hidden="true" />Baixar comparação (CSV)</button>
        </> : <p className="comparison-empty">Selecione dois bairros diferentes para preencher a tabela. A e B identificam os contornos no mapa.</p>}
      </>}
      <p role="status" className="comparison-status">{status}</p>
      <p>A distância parte do centro geométrico do bairro até alguma UAPS da cidade, inclusive fora do bairro. É em linha reta, não um percurso nem tempo de caminhada.</p>
      <p>Contar postos dentro do limite administrativo não mede atendimento ou capacidade. As faixas mostram diferenças entre formas de dividir a população dos setores; não são intervalos de confiança.</p>
      <details className="comparison-method"><summary>Como sabemos disso</summary>
        <p>População: {POPULATION_SOURCE.agency}, Censo {POPULATION_SOURCE.reference}, revisão {POPULATION_SOURCE.revision}. Cada setor inteiro conta para o bairro onde fica a maior parte dele; a faixa inclui também a divisão pela área. {POPULATION_SOURCE.license}.</p>
        <p>Postos: {LAYER_SOURCES.facilities.agency}, referência {LAYER_SOURCES.facilities.reference}. Limites dos bairros: referência {LAYER_SOURCES.neighborhoods.reference}. Coleta: {SOURCE_COLLECTED_AT}. Postos de 2026 e moradores de 2022 são retratos de anos distintos.</p>
        <p>A distância usa haversine a partir do centro geométrico, sem ponderar onde as pessoas moram. A UAPS mais próxima pode mudar conforme o ponto de partida.</p>
        <p><a href={LAYER_SOURCES.facilities.pageUrl} target="_blank" rel="noreferrer">Fonte dos postos</a> · <a href={LAYER_SOURCES.neighborhoods.pageUrl} target="_blank" rel="noreferrer">Fonte dos bairros</a> · <a href={POPULATION_SOURCE.pageUrl} target="_blank" rel="noreferrer">Fonte da população</a>. Prefeitura de Fortaleza — Fortaleza em Mapas (Ipplan); reutilização com atribuição.</p>
      </details>
    </aside>
  );
}
