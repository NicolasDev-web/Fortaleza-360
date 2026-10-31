import { Navigation, Route } from "lucide-react";

export function Insights() {
  return (
    <div className="methodology-card">
      <Route size={18} aria-hidden="true" />
      <div>
        <strong>Antes de tirar conclusões</strong>
        <p>
          Distância em linha reta não é o tempo para chegar ao posto. E contar postos
          não diz quantas pessoas cada um consegue atender.
        </p>
      </div>
    </div>
  );
}

export function InsightsFooter() {
  return (
    <div className="investigation-footer">
      <div className="next-instrument">
        <span className="footer-icon" aria-hidden="true">
          <Navigation size={17} />
        </span>
        <div>
          <small>Experimente</small>
          <strong>Simule um posto novo no mapa</strong>
        </div>
      </div>
      <p>
        Simular estima o ganho de acesso geográfico de um ponto proposto.
        Comparar mostra moradores, postos e distância em linha reta de dois bairros lado a lado.
      </p>
    </div>
  );
}
