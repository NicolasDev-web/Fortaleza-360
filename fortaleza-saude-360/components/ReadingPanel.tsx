"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Crosshair,
  Hospital,
  LayoutGrid,
  List,
  Map as MapIcon,
  Navigation,
  Ruler,
  TriangleAlert,
} from "lucide-react";
import { Insights, InsightsFooter } from "@/components/Insights";
import { KpiCard } from "@/components/KpiCard";
import { AnimatedHeading } from "@/components/motion/AnimatedHeading";
import { RollingNumber } from "@/components/motion/RollingNumber";
import { DiscreteTabs } from "@/components/vendor/discrete-tabs";
import { FilterList } from "@/components/vendor/filter-interaction";
import { ListStack } from "@/components/vendor/list-stack";
import {
  formatStraightLineDistance,
  nearestByStraightLine,
  STRAIGHT_LINE_CAVEAT,
  type StraightLineResult,
} from "@/lib/accessibility";
import { formatCoordinate, normalizeName, unproject, type Box } from "@/lib/geo";
import {
  hasNeighborhoodMismatch,
  neighborhoodSummary,
  type FacilityPoint,
  type MapModel,
  type NeighborhoodShape,
} from "@/lib/map-model";
import {
  catalogUpdateLabel,
  LAYER_SOURCES,
  SOURCE_COLLECTED_AT,
  sourceForUnitType,
  unitTypeLabel,
} from "@/lib/sources";
import { bigIdea, type StoryFacts } from "@/lib/story";

type ReadingPanelProps = {
  facts: StoryFacts | null;
  model: MapModel | null;
  selectedNeighborhood: string | null;
  selectedFacility: string | null;
  onSelectNeighborhood: (code: string, frame?: boolean) => void;
  onSelectFacility: (id: string, frame?: boolean) => void;
  onClear: () => void;
  onFrame: (box: Box) => void;
  onOpenStory: () => void;
};

type OverviewTab = "panorama" | "index";

function managementLabel(value: string | null): string {
  if (value === null) return "Não informado";
  if (value === "M") return "Municipal (M)";
  return value;
}

function facilityBox({ x, y }: FacilityPoint): Box {
  return [x - 1, y - 1, x + 1, y + 1];
}

export function ReadingPanel({
  facts,
  model,
  selectedNeighborhood,
  selectedFacility,
  onSelectNeighborhood,
  onSelectFacility,
  onClear,
  onFrame,
  onOpenStory,
}: ReadingPanelProps) {
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

  const facility = selectedFacility ? facilityById.get(selectedFacility) : undefined;
  const neighborhood = selectedNeighborhood
    ? neighborhoodByCode.get(selectedNeighborhood)
    : facility?.neighborhoodCode
      ? neighborhoodByCode.get(facility.neighborhoodCode)
      : undefined;

  const announcement = facility
    ? `Unidade selecionada: ${facility.name}`
    : neighborhood
      ? `Bairro selecionado: ${neighborhood.name}, ${neighborhoodSummary(neighborhood)}`
      : "";

  return (
    <section className="reading-panel" aria-labelledby="reading-title">
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      {facility ? (
        <FacilityDetails
          facility={facility}
          neighborhood={neighborhood}
          onBack={() => (neighborhood ? onSelectNeighborhood(neighborhood.code) : onClear())}
          onFrame={() => onFrame(facilityBox(facility))}
          onOpenNeighborhood={(code) => onSelectNeighborhood(code)}
        />
      ) : neighborhood ? (
        <NeighborhoodDetails
          facilities={neighborhood.facilityIds
            .map((id) => facilityById.get(id))
            .filter((item): item is FacilityPoint => item !== undefined)}
          nearest={
            model
              ? nearestByStraightLine(
                  unproject(model.projection, ...neighborhood.centroid),
                  model.facilities,
                )
              : null
          }
          nearestName={(id) => facilityById.get(id)?.name ?? id}
          neighborhood={neighborhood}
          onBack={onClear}
          onFrame={() => onFrame(neighborhood.box)}
          onSelectFacility={(id) => onSelectFacility(id, true)}
        />
      ) : (
        <Overview
          facts={facts}
          model={model}
          onOpenStory={onOpenStory}
          onSelectNeighborhood={onSelectNeighborhood}
          selectedNeighborhood={selectedNeighborhood}
        />
      )}

      <div className="reading-foot">
        <hr className="panel-rule" />
        <Insights />
        <InsightsFooter />
      </div>
    </section>
  );
}

function Overview({
  facts,
  model,
  onOpenStory,
  onSelectNeighborhood,
  selectedNeighborhood,
}: {
  facts: StoryFacts | null;
  model: MapModel | null;
  onOpenStory: () => void;
  onSelectNeighborhood: (code: string, frame?: boolean) => void;
  selectedNeighborhood: string | null;
}) {
  const [tab, setTab] = useState<OverviewTab>("panorama");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = normalizeName(query);
    const items = model?.neighborhoods ?? [];
    return term ? items.filter(({ name }) => normalizeName(name).includes(term)) : items;
  }, [model, query]);

  return (
    <div className="reading-view">
      <header className="reading-header">
        <span className="section-label">Leitura · a ideia central</span>
        <AnimatedHeading
          id="reading-title"
          text={facts ? bigIdea(facts) : "Base territorial indisponível no momento."}
        />
      </header>

      {model ? (
        <DiscreteTabs
          ariaLabel="Visões do painel de leitura"
          controls="reading-tabpanel"
          idPrefix="reading-tab"
          onChange={setTab}
          tabs={[
            { id: "panorama", title: "Panorama", icon: <LayoutGrid size={15} /> },
            { id: "index", title: "Índice de bairros", icon: <List size={15} /> },
          ]}
          value={tab}
        />
      ) : null}

      <div
        aria-labelledby={model ? `reading-tab-${tab}` : undefined}
        id="reading-tabpanel"
        role={model ? "tabpanel" : undefined}
      >
        {tab === "panorama" || !model ? (
          <div className="panorama">
            <div className="readout-list">
              <KpiCard
                icon={Hospital}
                label="UAPS cadastradas"
                note={
                  model
                    ? `${LAYER_SOURCES.facilities.agency} · ref. ${LAYER_SOURCES.facilities.reference}`
                    : "Base indisponível"
                }
                value={model ? model.facilities.length : null}
              />
              <KpiCard
                icon={MapIcon}
                label="Bairros"
                note={
                  model
                    ? `${LAYER_SOURCES.neighborhoods.agency} · ref. ${LAYER_SOURCES.neighborhoods.reference}`
                    : "Base indisponível"
                }
                value={model ? model.neighborhoods.length : null}
              />
              <KpiCard
                fractionDigits={1}
                icon={Ruler}
                label="Área municipal (km²)"
                note={
                  model?.areaKm2
                    ? `${LAYER_SOURCES.boundary.agency} · ref. ${LAYER_SOURCES.boundary.reference}`
                    : "Base indisponível"
                }
                value={model?.areaKm2 ?? null}
              />
              <KpiCard
                icon={Navigation}
                label="Cobertura populacional"
                note="Metodologia pendente · SDD-038"
                value={null}
              />
            </div>

            {model ? (
              <button className="story-reopen" onClick={onOpenStory} type="button">
                <BookOpen size={16} aria-hidden="true" />
                <span>
                  <strong>Rever a história</strong>
                  <small>Seis capítulos guiados, com fonte em cada um</small>
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <section className="neighborhood-index" aria-labelledby="index-title">
            <div className="index-head">
              <h3 id="index-title">Índice de bairros</h3>
              <span className="index-count">
                {filtered.length}/{model.neighborhoods.length}
              </span>
            </div>
            <label className="index-filter">
              <span className="visually-hidden">Filtrar bairros pelo nome</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar bairros…"
                type="search"
                value={query}
              />
            </label>
            <FilterList
              items={filtered.map(({ code, name, facilityIds }) => ({
                id: code,
                label: name,
                srText: ` ${facilityIds.length} UAPS no cadastro`,
                trailing: (
                  <>
                    <span className="index-meter" aria-hidden="true">
                      {Array.from({ length: facilityIds.length }, (_, index) => (
                        <i key={index} />
                      ))}
                    </span>
                    <span className="index-value" aria-hidden="true">
                      {facilityIds.length}
                    </span>
                  </>
                ),
              }))}
              onSelect={(code) => onSelectNeighborhood(code, true)}
              selectedId={selectedNeighborhood}
            />
            {filtered.length === 0 ? (
              <p className="index-empty">Nenhum bairro com esse nome.</p>
            ) : null}
            <p className="index-note">
              Ordem alfabética. A quantidade de UAPS no cadastro não é ranking de acesso nem
              de necessidade.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function NeighborhoodDetails({
  neighborhood,
  facilities,
  nearest,
  nearestName,
  onBack,
  onFrame,
  onSelectFacility,
}: {
  neighborhood: NeighborhoodShape;
  facilities: FacilityPoint[];
  nearest: StraightLineResult | null;
  nearestName: (id: string) => string;
  onBack: () => void;
  onFrame: () => void;
  onSelectFacility: (id: string) => void;
}) {
  return (
    <div className="reading-view">
      <button className="back-link" onClick={onBack} type="button">
        <ArrowLeft size={15} aria-hidden="true" />
        Panorama
      </button>
      <header className="reading-header">
        <span className="section-label">Bairro · código {neighborhood.code}</span>
        <AnimatedHeading id="reading-title" text={neighborhood.name} />
      </header>

      <div className="detail-stat">
        <strong>
          <RollingNumber value={facilities.length} />
        </strong>
        <span>
          {facilities.length === 1 ? "UAPS localizada" : "UAPS localizadas"} dentro do contorno
          do bairro (associação ponto-no-polígono)
        </span>
      </div>

      <div className="detail-actions">
        <button className="action-button" onClick={onFrame} type="button">
          <Crosshair size={15} aria-hidden="true" />
          Enquadrar no mapa
        </button>
      </div>

      {facilities.length > 0 ? (
        <ListStack
          collapseLabel="Recolher a lista"
          expandLabel={(count) => `Ver as ${count} UAPS`}
          items={facilities.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `CNES ${item.cnes ?? "—"}`,
          }))}
          onSelect={onSelectFacility}
        />
      ) : (
        <p className="detail-empty">
          Nenhuma UAPS do cadastro tem coordenada dentro deste contorno. Isso não indica,
          sozinho, ausência de atendimento: moradores podem ser vinculados a unidades de bairros
          vizinhos.
        </p>
      )}

      {nearest ? (
        <div aria-labelledby="nearest-title" className="detail-proxy" role="group">
          <span className="section-label" id="nearest-title">
            UAPS mais próxima em linha reta <span className="proxy-badge">proxy</span>
          </span>
          <p>
            <strong>{nearestName(nearest.facilityId)}</strong>, a{" "}
            {formatStraightLineDistance(nearest.distanceM)} do centro geométrico do bairro.
          </p>
          <small>{STRAIGHT_LINE_CAVEAT}</small>
        </div>
      ) : null}

      <p className="detail-source">
        Contorno: {LAYER_SOURCES.neighborhoods.agency}, ref.{" "}
        {neighborhood.reference ?? LAYER_SOURCES.neighborhoods.reference}. Pontos:{" "}
        {LAYER_SOURCES.facilities.agency}, ref. {LAYER_SOURCES.facilities.reference}.
      </p>
    </div>
  );
}

function FacilityDetails({
  facility,
  neighborhood,
  onBack,
  onFrame,
  onOpenNeighborhood,
}: {
  facility: FacilityPoint;
  neighborhood: NeighborhoodShape | undefined;
  onBack: () => void;
  onFrame: () => void;
  onOpenNeighborhood: (code: string) => void;
}) {
  const mismatch = hasNeighborhoodMismatch(facility, neighborhood);
  const source = sourceForUnitType(facility.type);

  return (
    <div className="reading-view">
      <button className="back-link" onClick={onBack} type="button">
        <ArrowLeft size={15} aria-hidden="true" />
        {neighborhood ? neighborhood.name : "Panorama"}
      </button>
      <header className="reading-header">
        <span className="section-label">
          <Building2 size={13} aria-hidden="true" /> {unitTypeLabel(facility.type)} · ficha da
          unidade
        </span>
        <AnimatedHeading id="reading-title" text={facility.name} />
      </header>

      <dl className="detail-grid">
        <div>
          <dt>Tipo</dt>
          <dd>{unitTypeLabel(facility.type)}</dd>
        </div>
        <div>
          <dt>Natureza (fonte)</dt>
          <dd>{facility.nature ?? "Não informado"}</dd>
        </div>
        <div>
          <dt>CNES</dt>
          <dd>{facility.cnes ?? "Não informado"}</dd>
        </div>
        <div>
          <dt>Gestão</dt>
          <dd>{managementLabel(facility.management)}</dd>
        </div>
        <div>
          <dt>Atende SUS</dt>
          <dd>{facility.sus === null ? "Não informado" : facility.sus ? "Sim" : "Não"}</dd>
        </div>
        <div>
          <dt>Ano de referência</dt>
          <dd>{facility.reference ?? "Não informado"}</dd>
        </div>
        <div>
          <dt>Coleta</dt>
          <dd>{SOURCE_COLLECTED_AT}</dd>
        </div>
        <div className="detail-wide">
          <dt>Bairro declarado na fonte</dt>
          <dd>{facility.declaredNeighborhood ?? "Não informado"}</dd>
        </div>
        <div className="detail-wide">
          <dt>Bairro (associação espacial)</dt>
          <dd>{neighborhood?.name ?? "Fora dos contornos de bairro"}</dd>
        </div>
        <div className="detail-wide">
          <dt>Coordenada</dt>
          <dd className="mono">{formatCoordinate(facility.position)}</dd>
        </div>
      </dl>

      {mismatch ? (
        <p className="detail-warning">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>
            A fonte declara o bairro “{facility.declaredNeighborhood}”. O ponto cai no contorno de
            “{neighborhood?.name}”. Diferenças de grafia ou de limites não são corrigidas
            automaticamente.
          </span>
        </p>
      ) : null}

      <div className="detail-actions">
        <button className="action-button" onClick={onFrame} type="button">
          <Crosshair size={15} aria-hidden="true" />
          Enquadrar no mapa
        </button>
        {neighborhood ? (
          <button
            className="action-button action-ghost"
            onClick={() => onOpenNeighborhood(neighborhood.code)}
            type="button"
          >
            <MapIcon size={15} aria-hidden="true" />
            Ver bairro
          </button>
        ) : null}
      </div>

      <p className="detail-caveat">{source.limitation}</p>
      <p className="detail-source">
        Fonte: {source.agency} via Fortaleza em Mapas (camada {source.catalogId}), atualização do
        catálogo {source.catalogUpdate ? `em ${source.catalogUpdate}` : catalogUpdateLabel(source)}.
      </p>
    </div>
  );
}
