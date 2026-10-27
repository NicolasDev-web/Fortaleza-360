import { Observatory } from "@/components/Observatory";
import type { MapModel } from "@/lib/map-model";

export function AppShell({ model }: { model: MapModel | null }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Pular para a investigação
      </a>

      <Observatory model={model} />

      <footer className="global-footer">
        <span>Fortaleza Saúde 360°</span>
        <span>Projeto independente de estudo</span>
        <span>Não é serviço de emergência · em urgência, ligue 192</span>
      </footer>
    </div>
  );
}
