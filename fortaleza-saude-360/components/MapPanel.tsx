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

export function MapPanel({ children, state }: MapPanelProps) {
  const content = stateContent[state];
  const StateIcon = content.icon;
  const hasReadyContent = state === "ready" && children !== undefined;

  return (
    <article className="map-instrument" aria-labelledby="map-title">
      <header className="map-toolbar">
        <div className="map-title">
          <span className="map-title-icon" aria-hidden="true">
            <MapPinned size={18} />
          </span>
          <div>
            <strong id="map-title">Território em análise</strong>
            <small>Superfície cartográfica aguardando dados</small>
          </div>
        </div>
        <div className="map-meta">
          <ProvenanceBadge label="Camada conceitual" />
          <ProvenanceBadge label="Sem escala" />
        </div>
      </header>

      <div
        className={`map-surface map-state-${state}`}
        aria-busy={state === "loading"}
      >
        <div className="map-grid" aria-hidden="true" />
        <div className="territory-shape territory-shape-one" aria-hidden="true" />
        <div className="territory-shape territory-shape-two" aria-hidden="true" />
        <div className="territory-shape territory-shape-three" aria-hidden="true" />
        <div className="map-axis map-axis-horizontal" aria-hidden="true" />
        <div className="map-axis map-axis-vertical" aria-hidden="true" />

        {hasReadyContent ? (
          <div className="map-ready-content">{children}</div>
        ) : (
          <div className="map-empty-state" role="status">
            <span className="map-empty-icon" aria-hidden="true">
              <StateIcon size={29} strokeWidth={1.7} />
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

        <div className="map-legend" aria-label="Legenda conceitual">
          <span><i className="signal signal-cream" /> UAPS</span>
          <span><i className="signal signal-cerulean" /> UPA</span>
          <span><i className="signal signal-amber" /> Hospital</span>
        </div>
      </div>
    </article>
  );
}
