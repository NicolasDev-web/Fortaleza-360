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
          <small>Vem aí</small>
          <strong>Quantas pessoas moram perto de cada posto</strong>
        </div>
      </div>
      <p>
        Comparar e Simular ainda são demonstrações: ficam prontos quando os
        dados forem conferidos.
      </p>
    </div>
  );
}
