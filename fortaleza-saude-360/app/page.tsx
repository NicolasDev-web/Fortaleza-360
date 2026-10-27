import {
  ChartNoAxesCombined,
  Clock3,
  Hospital,
  MapPinned,
  Navigation,
} from "lucide-react";
import { Filters } from "@/components/Filters";
import { Header } from "@/components/Header";
import { Insights, InsightsFooter } from "@/components/Insights";
import { KpiCard } from "@/components/KpiCard";
import { MapPanel } from "@/components/MapPanel";

const readouts = [
  {
    label: "Unidades cadastradas",
    note: "Aguardando integração real",
    icon: Hospital,
  },
  {
    label: "Cobertura populacional",
    note: "Metodologia pendente",
    icon: Navigation,
  },
  {
    label: "Setores analisados",
    note: "Base geográfica pendente",
    icon: MapPinned,
  },
];

export default function Home() {
  return (
    <main className="shell">
      <a className="skip-link" href="#main-content">
        Pular para a investigação
      </a>
      <Header />

      <div className="workspace">
        <Filters />

        <section
          className="investigation"
          id="main-content"
          aria-labelledby="workspace-title"
          tabIndex={-1}
        >
          <header className="investigation-header">
            <div>
              <span className="section-label">Área de investigação</span>
              <h2 id="workspace-title">Mapa e sinais territoriais</h2>
            </div>
            <div className="freshness">
              <Clock3 size={15} aria-hidden="true" />
              <span>Atualização indisponível</span>
            </div>
          </header>

          <div className="analysis-grid">
            <MapPanel state="empty" />

            <aside className="evidence-panel" aria-label="Leituras da investigação">
              <header className="evidence-header">
                <div>
                  <span className="section-label">Leituras</span>
                  <h3>Sinais disponíveis</h3>
                </div>
                <ChartNoAxesCombined size={20} aria-hidden="true" />
              </header>

              <div className="readout-list">
                {readouts.map(({ label, note, icon: Icon }) => (
                  <KpiCard
                    icon={Icon}
                    key={label}
                    label={label}
                    note={note}
                    value={null}
                  />
                ))}
              </div>

              <Insights />
            </aside>
          </div>

          <InsightsFooter />
        </section>
      </div>

      <footer className="global-footer">
        <span>Fortaleza Saúde 360°</span>
        <span>Projeto independente de estudo</span>
        <span>Não é serviço de emergência</span>
      </footer>
    </main>
  );
}
