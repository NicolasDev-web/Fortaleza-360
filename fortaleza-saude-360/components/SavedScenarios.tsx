"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Position } from "@/lib/geo";
import type { ScenarioResult } from "@/lib/scenario";
import { MAX_SAVED_SCENARIOS, SCENARIOS_KEY, readSavedScenarios, writeSavedScenarios, type SavedScenario } from "@/lib/saved-scenarios";

type Props = { candidate: Position | null; result: ScenarioResult | null; modelSha: string | null; onOpen: (point: Position) => void };
const integer = new Intl.NumberFormat("pt-BR");

export function SavedScenarios({ candidate, result, modelSha, onOpen }: Props) {
  const [items, setItems] = useState<SavedScenario[]>([]);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try { setItems(readSavedScenarios(window.localStorage)); setFailed(false); }
      catch { setFailed(true); setMessage("Não foi possível ler os cenários locais. Você pode excluir os dados salvos e tentar novamente."); }
      setLoaded(true);
    };
    // localStorage é um sistema externo, lido somente depois da hidratação.
    refresh();
    const sync = (event: StorageEvent) => { if (event.key === SCENARIOS_KEY || event.key === null) refresh(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidate || !result || !modelSha || failed || !loaded) return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("scenario-name") ?? "").trim();
    if (!name) { setMessage("Dê um nome ao cenário."); return; }
    try {
      const current = readSavedScenarios(window.localStorage);
      if (current.length >= MAX_SAVED_SCENARIOS) { setMessage("Limite de 20 cenários. Exclua um para salvar outro."); return; }
      const next = [{ id: crypto.randomUUID(), name, point: [...candidate] as Position, result, modelSha, savedAt: new Date().toISOString() }, ...current];
      writeSavedScenarios(window.localStorage, next);
      setItems(next); setMessage(`Cenário “${name}” salvo neste navegador.`); form.reset();
    } catch { setMessage("Não foi possível salvar neste navegador. Seu cálculo continua disponível nesta tela."); }
  };

  function remove(id?: string) {
    try {
      const next = id ? readSavedScenarios(window.localStorage).filter(item => item.id !== id) : [];
      writeSavedScenarios(window.localStorage, next);
      setItems(next); setFailed(false); setMessage(id ? "Cenário excluído deste navegador." : "Todos os cenários salvos foram excluídos deste navegador.");
    } catch { setMessage("Não foi possível excluir os cenários. Verifique as permissões de armazenamento do navegador."); }
  }

  return <section className="saved-scenarios" aria-labelledby="saved-scenarios-title">
    <h3 id="saved-scenarios-title">Cenários neste navegador</h3>
    <p>Ao salvar, nome, ponto proposto e resultados ficam neste navegador. Use nomes de propostas, sem dados pessoais. Reabrir recalcula com os dados atuais.</p>
    {result ? <form className="scenario-form" onSubmit={save}>
      <label>Nome do cenário<input name="scenario-name" maxLength={60} required placeholder="Ex.: proposta na praça" /></label>
      <button className="action-button" type="submit" disabled={!loaded || failed || !modelSha}>Salvar neste navegador</button>
    </form> : null}
    {loaded && !items.length && !failed ? <p>Nenhum cenário salvo.</p> : null}
    <ul className="saved-scenario-list">{items.map(item => <li key={item.id}>
      <strong>{item.name}</strong>
      <small>Guardado em {new Date(item.savedAt).toLocaleString("pt-BR")}. Resultado histórico:</small>
      <span>{item.result.rows.filter(row => row.scenario === "central").map(row => `${row.minutes} min: +${integer.format(row.delta)}`).join(" · ")}</span>
      <div className="comparison-actions">
        <button className="action-button action-ghost" type="button" onClick={() => { onOpen([...item.point]); setMessage(`Recalculando “${item.name}” com os dados atuais.`); }}>Reabrir {item.name}</button>
        <button className="action-button action-ghost" type="button" onClick={() => remove(item.id)}>Excluir {item.name}</button>
      </div>
    </li>)}</ul>
    {items.length || failed ? <button className="back-link" type="button" onClick={() => remove()}>Excluir todos os cenários salvos</button> : null}
    <p role="status">{message}</p>
  </section>;
}
