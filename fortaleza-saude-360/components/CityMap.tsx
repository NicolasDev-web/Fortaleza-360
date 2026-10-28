"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { Basemap, BasemapCredit, type BasemapStatus } from "@/components/Basemap";
import { cameraFromView } from "@/lib/basemap";
import { unitTypeLabel } from "@/lib/sources";
import { unproject, type Box } from "@/lib/geo";
import { SeaWaves } from "@/components/fortaleza/SeaWaves";
import {
  neighborhoodSummary,
  type FacilityPoint,
  type MapModel,
  type NeighborhoodShape,
} from "@/lib/map-model";
import type { StoryPhase } from "@/lib/story";

export type LayerVisibility = {
  boundary: boolean;
  neighborhoods: boolean;
  facilities: boolean;
  upas: boolean;
  hospitals: boolean;
};

/** Camada que controla a visibilidade de cada tipo do contrato `facility`. */
export function layerForUnitType(type: string): keyof LayerVisibility {
  if (type === "UPA") return "upas";
  if (type === "HOSPITAL") return "hospitals";
  return "facilities";
}

export type FrameRequest = { box: Box; nonce: number };

/** Foco narrativo do Modo História: cinza como base, uma cor para o que importa. */
export type StoryMapFocus = {
  phase: StoryPhase;
  highlight: ReadonlySet<string>;
  flagged: ReadonlySet<string>;
};

type CityMapProps = {
  model: MapModel;
  layers: LayerVisibility;
  selectedNeighborhood: string | null;
  selectedFacility: string | null;
  frame: FrameRequest | null;
  story?: StoryMapFocus | null;
  onSelectNeighborhood: (code: string) => void;
  onSelectFacility: (id: string) => void;
  onClearSelection: () => void;
};

type View = { x: number; y: number; w: number; h: number };

type Hover = {
  kind: "neighborhood" | "facility";
  id: string;
  left: number;
  top: number;
};

const MAX_ZOOM = 14;
const MIN_ZOOM = 0.85;
const DRAG_THRESHOLD = 4;
const SCALE_STEPS_KM = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function formatGraticule(
  value: number,
  positive: string,
  negative: string,
  withSeconds: boolean,
): string {
  const hemisphere = value >= 0 ? positive : negative;
  const totalSeconds = Math.round(Math.abs(value) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dm = `${degrees}°${String(minutes).padStart(2, "0")}′`;
  return withSeconds ? `${dm}${String(seconds).padStart(2, "0")}″${hemisphere}` : `${dm}${hemisphere}`;
}

function useViewBox(width: number, height: number) {
  const base = useMemo<View>(() => ({ x: 0, y: 0, w: width, h: height }), [width, height]);
  const [view, setView] = useState<View>(base);
  const viewRef = useRef<View>(base);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const clamp = useCallback(
    (next: View): View => {
      const w = Math.min(width / MIN_ZOOM, Math.max(width / MAX_ZOOM, next.w));
      const h = (w * height) / width;
      const cx = Math.min(width, Math.max(0, next.x + next.w / 2));
      const cy = Math.min(height, Math.max(0, next.y + next.h / 2));
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    },
    [width, height],
  );

  const cancel = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  const set = useCallback(
    (next: View | ((current: View) => View)) => {
      cancel();
      setView((current) => clamp(typeof next === "function" ? next(current) : next));
    },
    [clamp],
  );

  const animateTo = useCallback(
    (target: View) => {
      cancel();
      const end = clamp(target);

      if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
        setView(end);
        return;
      }

      const start = viewRef.current;
      const startTime = performance.now();
      const duration = 680;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const k = easeOutCubic(t);

        setView({
          x: start.x + (end.x - start.x) * k,
          y: start.y + (end.y - start.y) * k,
          w: start.w + (end.w - start.w) * k,
          h: start.h + (end.h - start.h) * k,
        });

        frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };

      frameRef.current = requestAnimationFrame(step);
    },
    [clamp],
  );

  const zoomAt = useCallback(
    (factor: number, ux?: number, uy?: number) => {
      set((current) => {
        const w = Math.min(width / MIN_ZOOM, Math.max(width / MAX_ZOOM, current.w / factor));
        const ratio = w / current.w;
        const px = ux ?? current.x + current.w / 2;
        const py = uy ?? current.y + current.h / 2;
        return {
          x: px - (px - current.x) * ratio,
          y: py - (py - current.y) * ratio,
          w,
          h: current.h * ratio,
        };
      });
    },
    [set, width],
  );

  const fitBox = useCallback(
    ([x0, y0, x1, y1]: Box): View => {
      const aspect = height / width;
      const w = Math.max((x1 - x0) * 1.7, ((y1 - y0) * 1.7) / aspect, width / 9);
      const h = w * aspect;
      return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
    },
    [width, height],
  );

  useEffect(() => cancel, []);

  return { view, base, set, animateTo, zoomAt, fitBox };
}

const NeighborhoodLayer = memo(function NeighborhoodLayer({
  neighborhoods,
}: {
  neighborhoods: NeighborhoodShape[];
}) {
  return (
    <g className="layer-neighborhoods">
      {neighborhoods.map((neighborhood) => (
        <path d={neighborhood.path} data-nb={neighborhood.code} key={neighborhood.code} />
      ))}
    </g>
  );
});

const FacilityLayer = memo(function FacilityLayer({
  facilities,
  height,
  unit,
  selectedFacility,
  selectedNeighborhood,
  flagged,
}: {
  facilities: FacilityPoint[];
  height: number;
  unit: number;
  selectedFacility: string | null;
  selectedNeighborhood: string | null;
  flagged: ReadonlySet<string> | null;
}) {
  return (
    <g className="layer-facilities">
      {facilities.map((facility) => {
        const isSelected = facility.id === selectedFacility;
        const inScope =
          selectedNeighborhood !== null && facility.neighborhoodCode === selectedNeighborhood;
        const className = [
          "facility",
          isSelected ? "is-selected" : "",
          inScope ? "is-in-scope" : "",
          selectedNeighborhood !== null && !inScope && !isSelected ? "is-muted" : "",
          flagged?.has(facility.id) ? "is-flagged" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g
            className={className}
            data-facility={facility.id}
            key={facility.id}
            style={{ "--delay": `${Math.round((facility.y / height) * -900 + 1500)}ms` } as CSSProperties}
            transform={`translate(${facility.x} ${facility.y})`}
          >
            <circle className="facility-hit" r={10 * unit} />
            {isSelected ? <circle className="facility-ping" r={7 * unit} /> : null}
            <circle className="facility-halo" r={6 * unit} />
            <circle className="facility-dot" r={(isSelected ? 4.2 : 3) * unit} />
          </g>
        );
      })}
    </g>
  );
});

/** UPAs (losango) e hospitais (quadrado com cruz): forma distinta, não só cor. */
const UnitLayer = memo(function UnitLayer({
  units,
  unit,
  selectedFacility,
}: {
  units: FacilityPoint[];
  unit: number;
  selectedFacility: string | null;
}) {
  const size = 4.4 * unit;
  return (
    <g className="layer-units">
      {units.map((item) => (
        <g
          className={`unit unit-${item.type === "UPA" ? "upa" : "hospital"}${
            item.id === selectedFacility ? " is-selected" : ""
          }`}
          data-facility={item.id}
          key={item.id}
          transform={`translate(${item.x} ${item.y})`}
        >
          <circle className="facility-hit" r={10 * unit} />
          {item.type === "UPA" ? (
            // Rotação no grupo: a animação CSS de entrada substituiria o transform do <rect>.
            <g transform="rotate(45)">
              <rect
                className="unit-shape"
                height={size * 1.6}
                width={size * 1.6}
                x={-size * 0.8}
                y={-size * 0.8}
              />
            </g>
          ) : (
            <>
              <rect
                className="unit-shape"
                height={size * 2}
                width={size * 2}
                x={-size}
                y={-size}
              />
              <path
                className="unit-cross"
                d={`M${-size * 0.55} 0H${size * 0.55}M0 ${-size * 0.55}V${size * 0.55}`}
                strokeWidth={1.4 * unit}
              />
            </>
          )}
        </g>
      ))}
    </g>
  );
});

export function CityMap({
  model,
  layers,
  selectedNeighborhood,
  selectedFacility,
  frame,
  story = null,
  onSelectNeighborhood,
  onSelectFacility,
  onClearSelection,
}: CityMapProps) {
  const { projection } = model;
  const { width, height } = projection;
  const { view, base, set, animateTo, zoomAt, fitBox } = useViewBox(width, height);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean; id: number } | null>(
    null,
  );
  const suppressClickRef = useRef(false);
  const [size, setSize] = useState({ w: width, h: height });
  const [hover, setHover] = useState<Hover | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [basemapStatus, setBasemapStatus] = useState<BasemapStatus | null>(null);

  const neighborhoodByCode = useMemo(
    () => new Map(model.neighborhoods.map((item) => [item.code, item])),
    [model.neighborhoods],
  );
  const facilityById = useMemo(
    () => new Map([...model.facilities, ...model.otherUnits].map((item) => [item.id, item])),
    [model.facilities, model.otherUnits],
  );
  const visibleUnits = useMemo(
    () => model.otherUnits.filter(({ type }) => layers[layerForUnitType(type)]),
    [layers, model.otherUnits],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) setSize({ w, h });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Unidades do viewBox por pixel de tela ("meet" usa o eixo mais restrito).
  const unitsPerPx = Math.max(view.w / size.w, view.h / size.h);
  const unit = Math.round(unitsPerPx * 1000) / 1000;
  const zoom = width / view.w;
  const camera = useMemo(() => cameraFromView(projection, view, size), [projection, view, size]);

  const toUnits = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const offsetX = (rect.width - view.w / unitsPerPx) / 2;
      const offsetY = (rect.height - view.h / unitsPerPx) / 2;
      return [
        view.x + (clientX - rect.left - offsetX) * unitsPerPx,
        view.y + (clientY - rect.top - offsetY) * unitsPerPx,
      ];
    },
    [view, unitsPerPx],
  );

  useEffect(() => {
    if (frame) animateTo(fitBox(frame.box));
  }, [frame, animateTo, fitBox]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = toUnits(event.clientX, event.clientY);
      zoomAt(Math.exp(-event.deltaY * 0.0016), point?.[0], point?.[1]);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [toUnits, zoomAt]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      view,
      moved: false,
      id: event.pointerId,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.moved = true;
        setIsDragging(true);
        setHover(null);
        event.currentTarget.setPointerCapture?.(drag.id);
      }

      if (drag.moved) {
        set({
          ...drag.view,
          x: drag.view.x - dx * unitsPerPx,
          y: drag.view.y - dy * unitsPerPx,
        });
        return;
      }
    }

    const target = event.target as Element;
    const facilityId = target.closest?.("[data-facility]")?.getAttribute("data-facility");
    const neighborhoodCode = target.closest?.("[data-nb]")?.getAttribute("data-nb");
    const rect = containerRef.current?.getBoundingClientRect();
    const left = event.clientX - (rect?.left ?? 0);
    const top = event.clientY - (rect?.top ?? 0);

    if (facilityId) setHover({ kind: "facility", id: facilityId, left, top });
    else if (neighborhoodCode) setHover({ kind: "neighborhood", id: neighborhoodCode, left, top });
    else setHover(null);
  };

  const endDrag = () => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const target = event.target as Element;
    const facilityId = target.closest?.("[data-facility]")?.getAttribute("data-facility");
    const neighborhoodCode = target.closest?.("[data-nb]")?.getAttribute("data-nb");

    const clicked = facilityId ? facilityById.get(facilityId) : undefined;
    if (clicked && layers[layerForUnitType(clicked.type)]) onSelectFacility(clicked.id);
    else if (neighborhoodCode && layers.neighborhoods) onSelectNeighborhood(neighborhoodCode);
    else if (target.closest?.("svg")) onClearSelection();
  };

  // WCAG 1.4.13: o tooltip de hover sai com Esc, sem precisar mover o ponteiro.
  useEffect(() => {
    if (!hover) return;
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setHover(null);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [hover]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = view.w * 0.12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };

    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      set((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAt(1.4);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomAt(1 / 1.4);
    } else if (event.key === "0") {
      event.preventDefault();
      animateTo(base);
    }
  };

  // Graticule em graus decimais, adensada conforme o zoom.
  const graticule = useMemo(() => {
    const stepDeg = zoom > 5 ? 0.01 : zoom > 2.2 ? 0.025 : 0.05;
    const [lonA, latA] = unproject(projection, view.x, view.y);
    const [lonB, latB] = unproject(projection, view.x + view.w, view.y + view.h);
    const lons: Array<{ value: number; x: number }> = [];
    const lats: Array<{ value: number; y: number }> = [];

    for (let lon = Math.ceil(lonA / stepDeg) * stepDeg; lon <= lonB; lon += stepDeg) {
      lons.push({
        value: lon,
        x: projection.padding + (lon - projection.minLon) * projection.cosLat * projection.scale,
      });
    }

    for (let lat = Math.ceil(latB / stepDeg) * stepDeg; lat <= latA; lat += stepDeg) {
      lats.push({ value: lat, y: projection.padding + (projection.maxLat - lat) * projection.scale });
    }

    return { lons, lats, withSeconds: stepDeg < 0.05 };
  }, [projection, view, zoom]);

  const scaleBar = useMemo(() => {
    const kmPerPx = model.kmPerUnit * unitsPerPx;
    const targetKm = kmPerPx * 120;
    const km = [...SCALE_STEPS_KM].reverse().find((value) => value <= targetKm) ?? SCALE_STEPS_KM[0];
    return {
      px: km / kmPerPx,
      label: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR")} km`,
    };
  }, [model.kmPerUnit, unitsPerPx]);

  const showLabels = zoom > 2.4;
  const selectedShape = selectedNeighborhood ? neighborhoodByCode.get(selectedNeighborhood) : undefined;
  const hoverLabel = (() => {
    if (!hover) return null;
    if (hover.kind === "facility") {
      const facility = facilityById.get(hover.id);
      if (!facility || !layers[layerForUnitType(facility.type)]) return null;
      return {
        title: facility.name,
        detail: `${unitTypeLabel(facility.type)} · toque para ver detalhes`,
      };
    }
    if (!layers.neighborhoods) return null;
    const neighborhood = neighborhoodByCode.get(hover.id);
    if (!neighborhood) return null;
    return {
      title: neighborhood.name,
      detail: neighborhoodSummary(neighborhood),
    };
  })();

  return (
    <div
      className={`city-map${story ? ` story-${story.phase}` : ""}${layers.boundary ? "" : " no-land"}${basemapStatus === "ready" ? " has-basemap" : ""}`}
    >
      <div
        aria-describedby="map-keyboard-hint"
        aria-label="Mapa interativo de Fortaleza"
        className={`map-viewport${isDragging ? " is-dragging" : ""}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setHover(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        ref={containerRef}
        role="region"
        tabIndex={0}
      >
        <Basemap camera={camera} onStatusChange={setBasemapStatus} />
        <SeaWaves />
        <div className="lighthouse-beam" aria-hidden="true" />

        <svg
          aria-labelledby="map-svg-title"
          className="map-svg"
          preserveAspectRatio="xMidYMid meet"
          ref={svgRef}
          role="img"
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        >
          <title id="map-svg-title">
            {`Mapa de Fortaleza com ${model.neighborhoods.length} bairros, ${model.facilities.length} postos de saúde e ${visibleUnits.length} UPAs ou hospitais municipais. Use a busca ou a lista de bairros para navegar pelo teclado.`}
          </title>

          <g className="graticule" aria-hidden="true">
            {graticule.lons.map(({ value, x }) => (
              <g key={`lon-${value.toFixed(4)}`}>
                <line x1={x} x2={x} y1={view.y} y2={view.y + view.h} />
                <text x={x + 5 * unit} y={view.y + 16 * unit} fontSize={9.5 * unit}>
                  {formatGraticule(value, "L", "O", graticule.withSeconds)}
                </text>
              </g>
            ))}
            {graticule.lats.map(({ value, y }) => (
              <g key={`lat-${value.toFixed(4)}`}>
                <line x1={view.x} x2={view.x + view.w} y1={y} y2={y} />
                <text x={view.x + 8 * unit} y={y - 5 * unit} fontSize={9.5 * unit}>
                  {formatGraticule(value, "N", "S", graticule.withSeconds)}
                </text>
              </g>
            ))}
          </g>

          {layers.boundary ? (
            <g className="layer-boundary" aria-hidden="true">
              <path className="boundary-glow" d={model.boundaryPath} />
              <path className="boundary-land" d={model.boundaryPath} />
              <path className="boundary-line" d={model.boundaryPath} pathLength={1} />
            </g>
          ) : null}

          {layers.neighborhoods ? <NeighborhoodLayer neighborhoods={model.neighborhoods} /> : null}

          {story?.phase === "contours" && layers.neighborhoods ? (
            <g className="story-highlight" aria-hidden="true">
              {model.neighborhoods
                .filter(({ code }) => story.highlight.has(code))
                .map(({ code, path }) => (
                  <path d={path} key={code} />
                ))}
            </g>
          ) : null}

          {selectedShape && layers.neighborhoods ? (
            <path className="neighborhood-selected" d={selectedShape.path} />
          ) : null}

          {showLabels && layers.neighborhoods ? (
            <g className="neighborhood-labels" aria-hidden="true">
              {model.neighborhoods
                .filter(
                  ({ centroid: [x, y] }) =>
                    x > view.x && x < view.x + view.w && y > view.y && y < view.y + view.h,
                )
                .map(({ code, name, centroid: [x, y] }) => (
                  <text
                    className={code === selectedNeighborhood ? "is-selected" : undefined}
                    fontSize={(code === selectedNeighborhood ? 12 : 10) * unit}
                    key={code}
                    strokeWidth={3 * unit}
                    x={x}
                    y={y}
                  >
                    {name}
                  </text>
                ))}
            </g>
          ) : null}

          {layers.facilities ? (
            <FacilityLayer
              key={story?.phase === "facilities" ? "story-replay" : "base"}
              facilities={model.facilities}
              flagged={story?.phase === "limits" ? story.flagged : null}
              height={height}
              selectedFacility={selectedFacility}
              selectedNeighborhood={selectedNeighborhood}
              unit={unit}
            />
          ) : null}

          {story === null && visibleUnits.length > 0 ? (
            <UnitLayer selectedFacility={selectedFacility} unit={unit} units={visibleUnits} />
          ) : null}
        </svg>

        {hoverLabel && hover && !isDragging ? (
          <div
            aria-hidden="true"
            className="map-tooltip"
            style={{ left: hover.left, top: hover.top }}
          >
            <strong>{hoverLabel.title}</strong>
            <small>{hoverLabel.detail}</small>
          </div>
        ) : null}
      </div>

      <BasemapCredit status={basemapStatus} />

      <p className="visually-hidden" id="map-keyboard-hint">
        Use as setas para mover o mapa, + e − para aproximar ou afastar e 0 para ver a cidade inteira.
      </p>

      <div className="map-controls" role="group" aria-label="Controles do mapa">
        <button aria-label="Aproximar" onClick={() => zoomAt(1.5)} type="button">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button aria-label="Afastar" onClick={() => zoomAt(1 / 1.5)} type="button">
          <Minus size={16} aria-hidden="true" />
        </button>
        <button aria-label="Ver a cidade inteira" onClick={() => animateTo(base)} type="button">
          <Crosshair size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="map-compass" aria-hidden="true">
        <span>N</span>
        <i />
      </div>

      <div className="map-telemetry" aria-hidden="true">
        <span>{zoom.toFixed(1).replace(".", ",")}×</span>
        <span className="telemetry-scale">
          <i style={{ width: `${scaleBar.px}px` }} />
          {scaleBar.label}
        </span>
      </div>
    </div>
  );
}
