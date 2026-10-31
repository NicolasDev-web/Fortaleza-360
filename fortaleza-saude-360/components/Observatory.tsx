"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CityMap,
  type FrameRequest,
  type LayerVisibility,
  type StoryMapFocus,
} from "@/components/CityMap";
import { CommandBar, type Mode } from "@/components/CommandBar";
import { CommandPalette } from "@/components/CommandPalette";
import { NeighborhoodComparison } from "@/components/NeighborhoodComparison";
import { ModeWave } from "@/components/fortaleza/ModeWave";
import { LayerRail } from "@/components/LayerRail";
import { LocationControl } from "@/components/LocationControl";
import { MapPanel } from "@/components/MapPanel";
import { ReadingPanel } from "@/components/ReadingPanel";
import { StoryMode } from "@/components/StoryMode";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { project, type Box, type Position } from "@/lib/geo";
import type { MapModel } from "@/lib/map-model";
import {
  parseFilters,
  resetFilters,
  serializeFilters,
  type FilterState,
} from "@/lib/filters";
import { buildStoryChapters, buildStoryFacts } from "@/lib/story";
import type { CorridorMinutes } from "@/lib/corridor-preview";
import type { ScenarioResult } from "@/lib/scenario";

type ObservatoryProps = {
  model: MapModel | null;
};

const DEFAULT_LAYERS: LayerVisibility = {
  boundary: true,
  neighborhoods: true,
  facilities: true,
  upas: true,
  hospitals: true,
  distance: false,
  corridors: false,
};

export const STORY_SEEN_KEY = "f360:story-seen";
const integer = new Intl.NumberFormat("pt-BR");

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function hasSeenStory(): boolean {
  try {
    return window.localStorage.getItem(STORY_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberStory() {
  try {
    window.localStorage.setItem(STORY_SEEN_KEY, "1");
  } catch {
    // Armazenamento indisponível: a história apenas volta a abrir na próxima visita.
  }
}

export function Observatory({ model }: ObservatoryProps) {
  const [mode, setMode] = useState<Mode>("explore");
  const [chapter, setChapter] = useState(0);
  // Cada troca de modo feita pela pessoa remonta a onda de transição.
  const [wave, setWave] = useState(0);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [filters, setFilters] = useState<FilterState>(resetFilters);
  const [frame, setFrame] = useState<FrameRequest | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [candidate, setCandidate] = useState<Position | null>(null);
  const [comparison, setComparison] = useState<[string, string]>(["", ""]);
  const [devicePosition, setDevicePosition] = useState<{ point: Position; accuracy: number } | null>(null);
  const [corridorMinutes, setCorridorMinutes] = useState<CorridorMinutes>(10);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const readingRef = useRef<HTMLDivElement>(null);

  const focusReading = useCallback(() => {
    const result = readingRef.current?.querySelector<HTMLDivElement>("#scenario-result");
    const target = result ?? readingRef.current;
    if (!result) readingRef.current?.querySelector<HTMLElement>(".reading-panel")?.scrollTo?.({ top: 0 });
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
  }, []);

  const proposeCandidate = useCallback((point: Position | null) => {
    setScenarioResult(null);
    setCandidate(point);
  }, []);

  const neighborhoodByCode = useMemo(
    () => new Map(model?.neighborhoods.map((item) => [item.code, item]) ?? []),
    [model],
  );
  const facilityById = useMemo(
    () =>
      new Map(
        model ? [...model.facilities, ...model.otherUnits].map((item) => [item.id, item]) : [],
      ),
    [model],
  );
  const facts = useMemo(() => (model ? buildStoryFacts(model) : null), [model]);
  const chapters = useMemo(() => (facts ? buildStoryChapters(facts) : []), [facts]);

  const requestFrame = useCallback((box: Box) => {
    setFrame((current) => ({ box, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

  const selectNeighborhood = useCallback(
    (code: string, frameIt = false) => {
      const neighborhood = neighborhoodByCode.get(code);
      if (!neighborhood) return;
      setFilters((current) => ({ ...current, neighborhoodId: code, selectedFacilityId: null }));
      if (frameIt) requestFrame(neighborhood.box);
    },
    [neighborhoodByCode, requestFrame],
  );

  const selectFacility = useCallback(
    (id: string, frameIt = false) => {
      const facility = facilityById.get(id);
      if (!facility) return;
      setFilters((current) => ({
        ...current,
        neighborhoodId: facility.neighborhoodCode,
        selectedFacilityId: id,
      }));
      if (frameIt) requestFrame([facility.x - 1, facility.y - 1, facility.x + 1, facility.y + 1]);
    },
    [facilityById, requestFrame],
  );

  const clearSelection = useCallback(() => setFilters(resetFilters()), []);

  const switchMode = useCallback((next: Mode) => {
    if (next !== "simulate") setCandidate(null);
    setScenarioResult(null);
    setMode(next);
    setWave((count) => count + 1);
  }, []);

  const openStory = useCallback(() => {
    if (!model) return;
    setChapter(0);
    setFilters(resetFilters());
    requestFrame([0, 0, model.projection.width, model.projection.height]);
    switchMode("story");
  }, [model, requestFrame, switchMode]);

  const closeStory = useCallback(() => {
    rememberStory();
    switchMode("explore");
    requestAnimationFrame(() => document.getElementById("mode-tab-explore")?.focus());
  }, [switchMode]);

  const changeMode = (next: Mode) => {
    if (next === "story") openStory();
    else {
      if (mode === "story") rememberStory();
      switchMode(next);
    }
  };

  const startComparison = (code?: string) => {
    if (code) setComparison(current => [code, current[1] === code ? "" : current[1]]);
    changeMode("compare");
  };

  const openSearch = useCallback(() => {
    if (mode === "story") {
      rememberStory();
      switchMode("explore");
    }
    setPaletteOpen(true);
  }, [mode, switchMode]);

  // Restaura a seleção compartilhada pela URL; sem link de seleção, abre a história na 1ª visita.
  useEffect(() => {
    const initial = parseFilters(window.location.search);
    const facility = initial.selectedFacilityId
      ? facilityById.get(initial.selectedFacilityId)
      : undefined;

    /* eslint-disable react-hooks/set-state-in-effect -- URL e localStorage são sistemas externos lidos só no cliente; ler no render quebraria a hidratação. */
    if (facility) selectFacility(facility.id, true);
    else if (initial.neighborhoodId && neighborhoodByCode.has(initial.neighborhoodId)) {
      selectNeighborhood(initial.neighborhoodId, true);
    } else if (model && !hasSeenStory()) {
      setMode("story");
    }
    setUrlReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [facilityById, model, neighborhoodByCode, selectFacility, selectNeighborhood]);

  useEffect(() => {
    if (!urlReady) return;
    const query = serializeFilters(filters);
    const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [filters, urlReady]);

  useEffect(() => {
    if (!model) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const isSlash = event.key === "/" && !isTypingTarget(event.target);

      if (isShortcut || isSlash) {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [model, openSearch]);

  const toggleLayer = (layer: keyof LayerVisibility) =>
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  const isStory = mode === "story" && chapters.length > 0;
  const selectedNeighborhood = neighborhoodByCode.get(filters.neighborhoodId ?? "");
  const selectedFacility = facilityById.get(filters.selectedFacilityId ?? "");
  const comparisonNames = comparison.map(code => neighborhoodByCode.get(code)?.name);
  const resultAtTen = scenarioResult?.rows.find(row => row.scenario === "central" && row.minutes === 10);
  const gainRange = scenarioResult?.rows.filter(row => row.minutes === 10).map(row => row.delta) ?? [];

  const storyFocus: StoryMapFocus | null =
    isStory && facts
      ? {
          phase: chapters[chapter].phase,
          highlight: facts.withFacilityCodes,
          flagged: facts.mismatchIds,
        }
      : null;

  return (
    <div className="observatory" data-mode={mode}>
      <CommandBar
        mode={mode}
        onModeChange={changeMode}
        onOpenSearch={openSearch}
        searchDisabled={!model}
      />

      <main className={`workspace journey-workspace${isStory ? " is-story" : ""}`} id="main-content" tabIndex={-1}>
        {isStory && model ? <div className="story-host">
          <StoryMode
            chapters={chapters} index={chapter} onClose={closeStory} onIndexChange={setChapter}
            neighborhoods={model.neighborhoods} selectedNeighborhood={selectedNeighborhood}
            onSelectNeighborhood={code => selectNeighborhood(code, true)}
            onExplore={closeStory} onCompare={() => startComparison(selectedNeighborhood?.code)}
            onSimulate={() => changeMode("simulate")}
          />
        </div> : null}

        <MapPanel
          id="stage-panel"
          labelledBy={`mode-tab-${mode}`}
          tools={!isStory ? <LayerRail
          counts={
            model
              ? {
                  neighborhoods: model.neighborhoods.length,
                  facilities: model.facilities.length,
                  upas: model.otherUnits.filter(({ type }) => type === "UPA").length,
                  hospitals: model.otherUnits.filter(({ type }) => type === "HOSPITAL").length,
                }
              : null
          }
          layers={layers}
          onToggle={toggleLayer}
          corridorOptions={<div className="corridor-options">
            <label htmlFor="corridor-minutes">Tempo dos corredores</label>
            <select id="corridor-minutes" value={corridorMinutes} onChange={event => setCorridorMinutes(Number(event.target.value) as CorridorMinutes)}>
              {[10, 20, 30].map(minutes => <option key={minutes} value={minutes}>Até {minutes} minutos</option>)}
            </select>
            <p>Base de todas as UAPS a 4,8 km/h. Lilás mostra corredores modelados, não território de atendimento. Aproximação visual; a proposta do Simular não altera esta camada.</p>
          </div>}
          locationControl={model ? <LocationControl onClear={() => setDevicePosition(null)} onLocate={(point, accuracy) => {
            const [x, y] = project(model.projection, point);
            if (x < 0 || x > model.projection.width || y < 0 || y > model.projection.height) return false;
            setDevicePosition({ point, accuracy });
            requestFrame([x - 2, y - 2, x + 2, y + 2]);
            return true;
          }} /> : undefined}
          /> : null}
          context={!isStory && model ? <>
            <div>
              <strong>{mode === "simulate" ? resultAtTen ? `+${integer.format(resultAtTen.delta)} moradores no alcance de 10 min, na hipótese central` : candidate ? "Ponto proposto no mapa" : "Onde você colocaria um novo posto?"
                : mode === "compare" ? comparisonNames.every(Boolean) ? `${comparisonNames[0]} e ${comparisonNames[1]}` : "Quais bairros você quer colocar lado a lado?" : selectedFacility?.name ?? selectedNeighborhood?.name ?? "O mapa começa com uma escolha sua"}</strong>
              <p>{mode === "simulate" ? resultAtTen ? `Faixa de ${integer.format(Math.min(...gainRange))} a ${integer.format(Math.max(...gainRange))}, variando a caminhada. Estimativa, não atendimento.` : "Clique no mapa para experimentar. O resultado aparece ao lado."
                : mode === "compare" ? comparisonNames.every(Boolean) ? "A e B identificam os contornos. A leitura ao lado explica as diferenças." : "Escolha os dois bairros no painel ao lado para ler as diferenças."
                  : selectedFacility ? "A ficha ao lado explica o cadastro e suas limitações."
                    : selectedNeighborhood ? `${selectedNeighborhood.facilityIds.length} ${selectedNeighborhood.facilityIds.length === 1 ? "posto dentro" : "postos dentro"} do limite do bairro, na lista de 2026. Contagem não mede atendimento.`
                      : "Clique em um bairro ou procure pelo nome. Os detalhes aparecem ao lado."}</p>
            </div>
            <button type="button" className="action-button action-ghost" onClick={mode === "explore" && !selectedNeighborhood && !selectedFacility ? openSearch : focusReading}>
              {mode === "simulate" ? resultAtTen ? "Ver resultado" : "Ver como simular" : mode === "compare" ? "Ver comparação" : selectedNeighborhood || selectedFacility ? "Ver detalhes" : "Buscar no mapa"}
            </button>
          </> : undefined}
          overlay={wave > 0 ? <ModeWave key={wave} /> : undefined}
          state={model ? "ready" : "error"}
        >
          {model ? (
            <div className="map-host">
              <CityMap
                frame={frame}
                layers={layers}
                model={model}
                onClearSelection={clearSelection}
                onSelectFacility={selectFacility}
                onSelectNeighborhood={selectNeighborhood}
                selectedFacility={filters.selectedFacilityId}
                selectedNeighborhood={filters.neighborhoodId}
                story={storyFocus}
                candidate={mode === "simulate" ? candidate : null}
                comparison={mode === "compare" ? comparison : undefined}
                distanceEnabled={mode === "explore"}
                devicePosition={devicePosition}
                corridorMinutes={corridorMinutes}
                onProposeCandidate={mode === "simulate" ? proposeCandidate : undefined}
              />
            </div>
          ) : undefined}
        </MapPanel>

        {!isStory ? <div className="reading-host" tabIndex={-1} ref={readingRef} role="region" aria-label="Leitura do mapa">
        {mode === "compare" ? <NeighborhoodComparison model={model} codes={comparison} onChange={setComparison} onFrame={requestFrame} /> : mode === "simulate" ? <ScenarioSimulator candidate={candidate} onCandidate={proposeCandidate} onResultChange={setScenarioResult} /> : <ReadingPanel
          facts={facts}
          model={model}
          onClear={clearSelection}
          onFrame={requestFrame}
          onOpenStory={openStory}
          onSelectFacility={selectFacility}
          onSelectNeighborhood={selectNeighborhood}
          selectedFacility={filters.selectedFacilityId}
          selectedNeighborhood={filters.neighborhoodId}
          onOpenSearch={openSearch}
          onCompareNeighborhood={startComparison}
          onOpenSimulate={() => changeMode("simulate")}
        />}
        </div> : null}
      </main>

      {model && paletteOpen ? (
        <CommandPalette
          model={model}
          onClose={() => setPaletteOpen(false)}
          onSelectFacility={(id) => selectFacility(id, true)}
          onSelectNeighborhood={(code) => selectNeighborhood(code, true)}
        />
      ) : null}
    </div>
  );
}
