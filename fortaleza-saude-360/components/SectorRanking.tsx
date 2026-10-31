"use client";

import { useEffect, useMemo, useState } from "react";
import type { MapModel } from "@/lib/map-model";
import { formatStraightLineDistance } from "@/lib/accessibility";
import { parseSectorRanking, type SectorRankingData } from "@/lib/sector-ranking";

export function SectorRanking({ model }: { model: MapModel }) {
  const [data, setData] = useState<SectorRankingData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState("");
  const [inhabited, setInhabited] = useState(false);
  const [page, setPage] = useState(0);
  const neighborhoodByCode = useMemo(() => new Map(model.neighborhoods.map(item => [item.code, item])), [model]);
  const facilityById = useMemo(() => new Map(model.facilities.map(item => [item.id, item])), [model]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const responses = await Promise.all(["/data/manifest.json", "/data/sector-ranking.json"].map(url => fetch(url, { signal: controller.signal, credentials: "omit" })));
        if (responses.some(response => !response.ok)) throw new Error("download");
        const [manifest, bytes] = await Promise.all([responses[0].json(), responses[1].arrayBuffer()]);
        const entry = manifest.sector_ranking;
        if (entry?.file !== "/data/sector-ranking.json") throw new Error("manifesto");
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const sha = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        if (sha !== entry.sha256) throw new Error("checksum");
        const parsed = parseSectorRanking(JSON.parse(new TextDecoder().decode(bytes)), new Set(neighborhoodByCode.keys()), new Set(facilityById.keys()));
        if (!controller.signal.aborted) { setData(parsed); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível carregar e verificar a lista de setores. Tente novamente.");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, neighborhoodByCode, facilityById]);

  const filtered = data?.rows.filter(row => (!code || row.neighborhood_code === code) && (!inhabited || row.population > 0)) ?? [];
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  return <section className="sector-ranking" aria-labelledby="sector-ranking-title">
    <h3 id="sector-ranking-title">Setores por distância em linha reta</h3>
    <p>Do mais distante ao mais próximo, a partir de um ponto representativo de cada setor. Esta ordem não é prioridade de implantação nem avaliação do atendimento.</p>
    {error ? <><p role="alert">{error}</p><button className="action-button" type="button" onClick={() => { setError(""); setAttempt(n => n + 1); }}>Tentar carregar setores novamente</button></> : !data ? <p role="status">Carregando e verificando setores…</p> : <>
      <label htmlFor="sector-neighborhood">Filtrar setores por bairro</label>
      <select id="sector-neighborhood" value={code} onChange={event => { setCode(event.target.value); setPage(0); }}>
        <option value="">Todos os bairros</option>
        {model.neighborhoods.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
      <label className="sector-checkbox"><input type="checkbox" checked={inhabited} onChange={event => { setInhabited(event.target.checked); setPage(0); }} />Somente setores com moradores</label>
      <p role="status">{filtered.length.toLocaleString("pt-BR")} setores neste filtro. Página {page + 1} de {pages}.</p>
      <ol className="sector-list" start={page * 25 + 1}>{filtered.slice(page * 25, (page + 1) * 25).map(row => <li key={row.geo_id}>
        <strong>Setor {row.geo_id}</strong>
        <span>{neighborhoodByCode.get(row.neighborhood_code)?.name} · {row.population.toLocaleString("pt-BR")} moradores (Censo 2022)</span>
        <span>{formatStraightLineDistance(row.distance_m)} até {facilityById.get(row.facility_id)?.name}</span>
      </li>)}</ol>
      {!filtered.length ? <p>Nenhum setor neste filtro.</p> : null}
      <div className="comparison-actions">
        <button className="action-button action-ghost" type="button" disabled={page === 0} onClick={() => setPage(n => n - 1)}>Página anterior</button>
        <button className="action-button action-ghost" type="button" disabled={page + 1 >= pages} onClick={() => setPage(n => n + 1)}>Próxima página</button>
      </div>
      <details><summary>Como calculamos esta lista</summary><p>{data.method}</p>{data.limitations.map(text => <p key={text}>{text}</p>)}<p>Fontes: IBGE (Censo 2022), Prefeitura de Fortaleza — Fortaleza em Mapas (UAPS 2026, bairros 2019). Proveniência completa no arquivo abaixo e manifesto.</p><a href="/data/sector-ranking.json" download>Baixar lista, fontes e método (JSON)</a></details>
    </>}
  </section>;
}
