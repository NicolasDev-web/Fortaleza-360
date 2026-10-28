import type { ReactNode } from "react";
import {
  CircleAlert,
  Clock3,
  Layers3,
  MapPinned,
  type LucideIcon,
} from "lucide-react";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";

export type MapPanelState = "empty" | "loading" | "error" | "ready";

type MapPanelProps = {
  children?: ReactNode;
  id?: string;
  labelledBy?: string;
  overlay?: ReactNode;
  state: MapPanelState;
};

type StateContent = {
  body: string;
  heading: string;
  icon: LucideIcon;
  kicker: string;
};

const stateContent: Record<MapPanelState, StateContent> = {
  empty: {
    kicker: "Mapa em preparação",
    heading: "O mapa aparece quando os dados forem conferidos.",
    body: "Nada aqui é inventado: sem dado conferido, não mostramos ponto nem número.",
    icon: MapPinned,
  },
  loading: {
    kicker: "Carregando",
    heading: "Preparando bairros e postos.",
    body: "Só mostramos o mapa depois de conferir os arquivos. Leva poucos segundos.",
    icon: Clock3,
  },
  error: {
    kicker: "Mapa fora do ar",
    heading: "Não conseguimos carregar o mapa agora.",
    body: "Preferimos não mostrar nada a mostrar dados pela metade. Tente recarregar a página.",
    icon: CircleAlert,
  },
  ready: {
    kicker: "Mapa pronto",
    heading: "Os dados conferidos aparecem aqui.",
    body: "Bairros e postos de saúde de Fortaleza.",
    icon: Layers3,
  },
};

export function MapPanel({ children, id, labelledBy, overlay, state }: MapPanelProps) {
  const content = stateContent[state];
  const StateIcon = content.icon;
  const hasReadyContent = state === "ready" && children !== undefined;

  return (
    <section
      aria-labelledby={labelledBy ?? "map-title"}
      className="stage"
      id={id}
      role={labelledBy ? "tabpanel" : undefined}
    >
      <header className="stage-head">
        <div className="map-title">
          <span className="stage-index" aria-hidden="true">
            01
          </span>
          <div>
            <strong id="map-title">Mapa de Fortaleza</strong>
            <small>
              {hasReadyContent
                ? "Postos de saúde, UPAs e hospitais municipais por bairro"
                : "Aguardando os dados"}
            </small>
          </div>
        </div>
        <div className="map-meta">
          {hasReadyContent ? (
            <>
              <ProvenanceBadge label="Bairros de 2019 · postos de 2026" tone="source" />
            </>
          ) : (
            <ProvenanceBadge label="Sem escala" />
          )}
        </div>
      </header>

      <div className={`map-surface map-state-${state}`} aria-busy={state === "loading"}>
        <span className="hud-corner hud-corner-tl" aria-hidden="true" />
        <span className="hud-corner hud-corner-tr" aria-hidden="true" />
        <span className="hud-corner hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner hud-corner-br" aria-hidden="true" />

        {hasReadyContent ? (
          children
        ) : (
          <div className="map-empty-state" role="status">
            <span className="map-empty-icon" aria-hidden="true">
              <StateIcon size={28} strokeWidth={1.6} />
            </span>
            <span className="empty-kicker">{content.kicker}</span>
            <h3>{content.heading}</h3>
            <p>{content.body}</p>
            <ProvenanceBadge
              label="Ilustração, não é mapa real"
              tone="warning"
            />
          </div>
        )}

        {overlay}
      </div>
    </section>
  );
}
