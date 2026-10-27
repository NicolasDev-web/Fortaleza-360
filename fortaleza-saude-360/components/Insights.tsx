import { Navigation, Route } from "lucide-react";

export function Insights() {
  return (
    <div className="methodology-card">
      <Route size={18} aria-hidden="true" />
      <div>
        <strong>Leitura responsável</strong>
        <p>
          Distância em linha reta nunca será apresentada como tempo real de
          deslocamento. Contagem de unidades no cadastro não mede cobertura,
          capacidade ou demanda.
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
          <small>Próximo instrumento</small>
          <strong>Proxy de distância, explicitamente rotulado</strong>
        </div>
      </div>
      <p>
        Os modos Comparar e Simular permanecem em modo demonstrativo até a
        conclusão do pipeline de dados.
      </p>
    </div>
  );
}
