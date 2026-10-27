import { Activity, Database, MapPinned } from "lucide-react";
import { DemoNotice } from "@/components/ProvenanceBadge";

type HeaderProps = {
  studyArea?: string;
  sourceStatus?: string;
};

export function Header({
  studyArea = "Fortaleza, Ceará",
  sourceStatus = "Fontes não carregadas",
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Activity size={22} strokeWidth={1.8} />
        </span>
        <div>
          <strong>Fortaleza Saúde 360°</strong>
          <small>Inteligência territorial em saúde</small>
        </div>
      </div>

      <div className="study-context">
        <MapPinned size={16} aria-hidden="true" />
        <div>
          <small>Área de estudo</small>
          <strong>{studyArea}</strong>
        </div>
      </div>

      <div className="session-state">
        <span className="source-state">
          <Database size={15} aria-hidden="true" />
          {sourceStatus}
        </span>
        <DemoNotice />
      </div>
    </header>
  );
}
