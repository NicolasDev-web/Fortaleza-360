"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { Position } from "@/lib/geo";

export function LocationControl({ onLocate, onClear }: { onLocate: (point: Position, accuracy: number) => boolean; onClear: () => void }) {
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => () => { request.current++; }, []);

  function locate() {
    if (!navigator.geolocation) { setMessage("Este navegador não oferece localização. Você pode continuar pelo mapa e pela busca."); return; }
    const id = ++request.current;
    setBusy(true); setMessage("Aguardando sua permissão e a posição do dispositivo…");
    const fail = (reason: string) => { if (id === request.current) { setBusy(false); setMessage(reason); } };
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (id !== request.current) return;
        const { longitude, latitude, accuracy } = position.coords;
        setBusy(false);
        if (![longitude, latitude, accuracy].every(Number.isFinite) || accuracy < 0 || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) { setMessage("O dispositivo retornou uma posição inválida. Tente novamente ou use a busca."); return; }
        if (!onLocate([longitude, latitude], accuracy)) { setMessage("Sua posição está fora da área exibida de Fortaleza. Use a busca para explorar a cidade."); return; }
        setShown(true); setMessage(`Posição aproximada no mapa. Precisão informada pelo dispositivo: ${Math.round(accuracy).toLocaleString("pt-BR")} m. Não foi salva.`);
      }, error => fail(error.code === 1 ? "Permissão de localização negada. O mapa e a busca continuam disponíveis." : error.code === 3 ? "O dispositivo demorou para responder. Tente novamente ou use a busca." : "Localização indisponível. Tente novamente ou use a busca."), { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
    } catch { fail("Não foi possível solicitar sua posição. Você pode continuar pelo mapa e pela busca."); }
  }

  function clear() { request.current++; onClear(); setShown(false); setBusy(false); setMessage("Posição removida do mapa."); }

  return <div className="location-control">
    <details><summary><LocateFixed size={14} aria-hidden="true" />Minha posição (opcional)</summary>
      <p>Ao solicitar, o navegador pedirá sua permissão. A posição será usada só para centralizar este mapa, em memória; não será salva como proposta. O serviço de localização do navegador segue as regras do seu dispositivo.</p>
      <button className="action-button" type="button" disabled={busy} onClick={locate}>Solicitar minha posição</button>
      {shown || busy ? <button className="back-link" type="button" onClick={clear}>Remover minha posição</button> : null}
      <p role="status">{message}</p>
    </details>
  </div>;
}
