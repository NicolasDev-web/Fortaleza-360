"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
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
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [model]);

  const toggleLayer = (layer: keyof LayerVisibility) =>
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  const isStory = mode === "story" && chapters.length > 0;

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
        onOpenSearch={() => setPaletteOpen(true)}
        searchDisabled={!model}
      />

      <main className="workspace" id="main-content" tabIndex={-1}>
        <LayerRail
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
        />

        <MapPanel
          id="stage-panel"
          labelledBy={`mode-tab-${mode}`}
          overlay={
            <>
              {wave > 0 ? <ModeWave key={wave} /> : null}
              <AnimatePresence>
                {isStory ? (
                  <StoryMode
                    chapters={chapters}
                    index={chapter}
                    key="story"
                    onClose={closeStory}
                    onIndexChange={setChapter}
                  />
                ) : null}
              </AnimatePresence>
            </>
          }
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
                onProposeCandidate={mode === "simulate" ? setCandidate : undefined}
              />
            </div>
          ) : undefined}
        </MapPanel>

        {mode === "compare" ? <NeighborhoodComparison model={model} codes={comparison} onChange={setComparison} onFrame={requestFrame} /> : mode === "simulate" ? <ScenarioSimulator candidate={candidate} onCandidate={setCandidate} /> : <ReadingPanel
          facts={facts}
          model={model}
          onClear={clearSelection}
          onFrame={requestFrame}
          onOpenStory={openStory}
          onSelectFacility={selectFacility}
          onSelectNeighborhood={selectNeighborhood}
          selectedFacility={filters.selectedFacilityId}
          selectedNeighborhood={filters.neighborhoodId}
        />}
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
