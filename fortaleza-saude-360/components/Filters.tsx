import {
  ChevronDown,
  CircleHelp,
  Layers3,
  MapPinned,
  SlidersHorizontal,
} from "lucide-react";

type EquipmentTone = "cream" | "cerulean" | "amber";

type EquipmentOption = {
  label: string;
  tone: EquipmentTone;
};

const equipmentTypes: EquipmentOption[] = [
  { label: "UAPS / Atenção primária", tone: "cream" },
  { label: "Unidades de pronto atendimento", tone: "cerulean" },
  { label: "Hospitais", tone: "amber" },
];

export function Filters() {
  return (
    <aside className="filter-rail" aria-label="Contexto da investigação">
      <details className="filter-disclosure">
        <summary className="filter-summary">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>Filtros e contexto</span>
          <small>Mostrar opções</small>
        </summary>

        <div className="filter-body">
          <div className="rail-intro">
            <span className="section-label">Exploração territorial</span>
            <h1>Investigue o território com contexto.</h1>
            <p>
              Organize camadas, serviços e recortes antes de interpretar os
              sinais do mapa.
            </p>
          </div>

          <section className="filter-section" aria-labelledby="scope-title">
            <div className="filter-heading">
              <h2 id="scope-title">Escopo da análise</h2>
              <span>Somente leitura</span>
            </div>
            <div className="selection-field" aria-disabled="true">
              <span className="selection-icon" aria-hidden="true">
                <MapPinned size={17} />
              </span>
              <div>
                <small>Recorte territorial</small>
                <strong>Fortaleza, Ceará</strong>
              </div>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </section>

          <section className="filter-section" aria-labelledby="equipment-title">
            <div className="filter-heading">
              <h2 id="equipment-title">Equipamentos</h2>
              <span>Em preparação</span>
            </div>
            <div className="option-stack">
              {equipmentTypes.map(({ label, tone }, index) => (
                <div
                  className={`filter-option${index === 0 ? " is-selected" : ""}`}
                  aria-disabled="true"
                  key={label}
                >
                  <span className={`signal signal-${tone}`} aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="filter-section" aria-labelledby="layers-title">
            <div className="filter-heading">
              <h2 id="layers-title">Camadas analíticas</h2>
              <span>Em preparação</span>
            </div>
            <div className="layer-list">
              <div className="layer-row" aria-disabled="true">
                <Layers3 size={17} aria-hidden="true" />
                <span>Limites de bairros</span>
                <span className="layer-status">Em breve</span>
              </div>
              <div className="layer-row" aria-disabled="true">
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span>Indicadores de acesso</span>
                <span className="layer-status">Em breve</span>
              </div>
            </div>
          </section>

          <div className="provenance-note">
            <CircleHelp size={18} aria-hidden="true" />
            <p>
              Esta visualização é conceitual. Fontes públicas serão exibidas
              com órgão, período e limitações após validação.
            </p>
          </div>
        </div>
      </details>
    </aside>
  );
}
