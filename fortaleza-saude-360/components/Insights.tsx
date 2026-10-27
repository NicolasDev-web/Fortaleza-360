import { Navigation, Route } from "lucide-react";

export function Insights() {
  return (
    <div className="methodology-card">
      <Route size={18} aria-hidden="true" />
      <div>
        <strong>Leitura responsável</strong>
        <p>
          Distância em linha reta nunca será apresentada como tempo real de
          deslocamento.
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
          <Navigation size={19} />
        </span>
        <div>
          <small>Próximo instrumento</small>
          <strong>Mapa navegável com proveniência por camada</strong>
        </div>
      </div>
      <p>
        O ambiente permanece em modo demonstrativo até a conclusão do pipeline
        de dados.
      </p>
    </div>
  );
}
