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
    kicker: "Base territorial pendente",
    heading: "O mapa será ativado após validar o GeoJSON.",
    body: "Nenhum ponto, bairro ou indicador fictício é apresentado como informação real.",
    icon: MapPinned,
  },
  loading: {
    kicker: "Carregando base validada",
    heading: "Preparando as camadas territoriais.",
    body: "A visualização será exibida somente após concluir a leitura e a validação dos arquivos.",
    icon: Clock3,
  },
  error: {
    kicker: "Base indisponível",
    heading: "Não foi possível carregar as camadas.",
    body: "A análise permanece suspensa para evitar a exibição de informações incompletas.",
    icon: CircleAlert,
  },
  ready: {
    kicker: "Base territorial validada",
    heading: "Camadas prontas para visualização.",
    body: "O conteúdo cartográfico validado será renderizado nesta área.",
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
            <strong id="map-title">Território em análise</strong>
            <small>
              {hasReadyContent
                ? "Contornos oficiais e UAPS do cadastro"
                : "Superfície cartográfica aguardando dados"}
            </small>
          </div>
        </div>
        <div className="map-meta">
          {hasReadyContent ? (
            <>
              <ProvenanceBadge label="Projeção local · WGS 84" />
              <ProvenanceBadge label="Bairros 2019 · UAPS 2026" tone="source" />
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
              label="Visualização conceitual · não é cartografia"
              tone="warning"
            />
          </div>
        )}

        {overlay}
      </div>
    </section>
  );
}
