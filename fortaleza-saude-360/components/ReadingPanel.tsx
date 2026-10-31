"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Crosshair,
  Download,
  Hospital,
  LayoutGrid,
  List,
  Map as MapIcon,
  Navigation,
  Ruler,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Insights, InsightsFooter } from "@/components/Insights";
import { SectorRanking } from "@/components/SectorRanking";
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
import { buildNeighborhoodCsv, csvFileName, downloadCsv } from "@/lib/export";
import { formatCoordinate, normalizeName, unproject, type Box } from "@/lib/geo";
import {
  peoplePerFacility,
  POPULATION_SOURCE,
  roundForReading,
  type NeighborhoodPopulation,
} from "@/lib/population";
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

type OverviewTab = "panorama" | "index" | "sectors";

const NOT_INFORMED = "A Prefeitura não informa";

function managementLabel(value: string | null): string {
  if (value === null) return NOT_INFORMED;
  if (value === "M") return "Prefeitura (gestão municipal)";
  return value;
}

const integer = new Intl.NumberFormat("pt-BR");

/** Quem mora no bairro (SDD-033): número, faixa, razão só quando há posto, e a ressalva. */
function PeopleBlock({
  population,
  facilities,
}: {
  population: NeighborhoodPopulation;
  facilities: number;
}) {
  const ratio = peoplePerFacility(population, facilities);
  return (
    <div aria-labelledby="people-title" className="detail-people" role="group">
      <span className="section-label" id="people-title">
        Quem mora aqui
      </span>
      <p>
        <strong>{integer.format(population.population)} pessoas</strong>, pelo Censo{" "}
        {POPULATION_SOURCE.reference} ({POPULATION_SOURCE.agency}).
      </p>
      {population.low !== population.high ? (
        <small>
          Pode ser entre {integer.format(population.low)} e {integer.format(population.high)},
          dependendo de como se contam as áreas do Censo que ficam na divisa do bairro.
        </small>
      ) : null}
      {ratio ? (
        <p>
          Cerca de <strong>{integer.format(roundForReading(ratio.central))}</strong> pessoas
          para cada posto dentro do bairro.
        </p>
      ) : (
        <p>Sem posto dentro do bairro, não dá para fazer essa conta.</p>
      )}
      <small>
        Isso não é quantas pessoas cada posto atende: muita gente usa o posto de outro bairro, e
        a população é de {POPULATION_SOURCE.reference}, quatro anos antes da lista de postos.
      </small>
    </div>
  );
}

/** Detalhe técnico sob demanda (docs/VOICE.md): a ressalva principal fica sempre fora. */
function HowWeKnow({ children }: { children: ReactNode }) {
  return (
    <details className="how-we-know" data-technical>
      <summary>Como sabemos disso</summary>
      <div className="how-we-know-body">{children}</div>
    </details>
  );
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
    ? `Você abriu: ${facility.name}`
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
          population={model?.population?.byCode[neighborhood.code] ?? null}
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
  const [downloaded, setDownloaded] = useState("");

  const downloadList = () => {
    if (!model) return;
    downloadCsv(buildNeighborhoodCsv(model, filtered), csvFileName());
    setDownloaded(
      `Arquivo ${csvFileName()} baixado com ${filtered.length} ${filtered.length === 1 ? "bairro" : "bairros"}.`,
    );
  };

  return (
    <div className="reading-view">
      <header className="reading-header">
        <span className="section-label">Em uma frase</span>
        <AnimatedHeading
          id="reading-title"
          text={facts ? bigIdea(facts) : "O mapa está fora do ar no momento."}
        />
      </header>

      {model ? (
        <DiscreteTabs
          ariaLabel="Formas de ver os números"
          controls="reading-tabpanel"
          idPrefix="reading-tab"
          onChange={setTab}
          tabs={[
            { id: "panorama", title: "Resumo", icon: <LayoutGrid size={15} /> },
            { id: "index", title: "Lista de bairros", icon: <List size={15} /> },
            { id: "sectors", title: "Distância por setor", icon: <Ruler size={15} /> },
          ]}
          value={tab}
        />
      ) : null}

      <div
        aria-labelledby={model ? `reading-tab-${tab}` : undefined}
        id="reading-tabpanel"
        role={model ? "tabpanel" : undefined}
      >
        {tab === "sectors" && model ? <SectorRanking model={model} /> : tab === "panorama" || !model ? (
          <div className="panorama">
            <div className="readout-list">
              <KpiCard
                icon={Hospital}
                label="Postos de saúde (UAPS)"
                note={
                  model
                    ? `${LAYER_SOURCES.facilities.agency} · dados de ${LAYER_SOURCES.facilities.reference}`
                    : "Sem dados agora"
                }
                value={model ? model.facilities.length : null}
              />
              <KpiCard
                icon={Users}
                label="Moradores (Censo 2022)"
                note={
                  model?.population
                    ? `${POPULATION_SOURCE.agency} · dados de ${POPULATION_SOURCE.reference}`
                    : "Sem dados agora"
                }
                value={model?.population?.total ?? null}
              />
              <KpiCard
                fractionDigits={1}
                icon={Ruler}
                label="Tamanho da cidade (km²)"
                note={
                  model?.areaKm2
                    ? `${LAYER_SOURCES.boundary.agency} · dados de ${LAYER_SOURCES.boundary.reference}`
                    : "Sem dados agora"
                }
                value={model?.areaKm2 ?? null}
              />
              <KpiCard
                icon={Navigation}
                label="Pessoas perto de um posto"
                note="Veja as estimativas e os limites no modo Simular"
                value={null}
              />
            </div>

            {model ? (
              <button className="story-reopen" onClick={onOpenStory} type="button">
                <BookOpen size={16} aria-hidden="true" />
                <span>
                  <strong>Ver a história de novo</strong>
                  <small>Seis telas curtas para entender o mapa</small>
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <section className="neighborhood-index" aria-labelledby="index-title">
            <div className="index-head">
              <h3 id="index-title">Lista de bairros</h3>
              <span className="index-count">
                {filtered.length}/{model.neighborhoods.length}
              </span>
            </div>
            <label className="index-filter">
              <span className="visually-hidden">Procurar bairro pelo nome</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome do bairro…"
                type="search"
                value={query}
              />
            </label>
            <FilterList
              items={filtered.map((item) => ({
                id: item.code,
                label: item.name,
                srText: `, ${neighborhoodSummary(item)}`,
                trailing: (
                  <>
                    <span className="index-meter" aria-hidden="true">
                      {Array.from({ length: item.facilityIds.length }, (_, index) => (
                        <i key={index} />
                      ))}
                    </span>
                    <span className="index-value" aria-hidden="true">
                      {item.facilityIds.length}
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
              Em ordem alfabética. Ter mais postos não quer dizer melhor acesso, nem que o
              bairro precisa menos.
            </p>
            {filtered.length > 0 ? (
              <button className="story-reopen csv-download" onClick={downloadList} type="button">
                <Download size={16} aria-hidden="true" />
                <span>
                  <strong>Baixar esta lista (CSV)</strong>
                  <small>
                    {filtered.length} {filtered.length === 1 ? "bairro" : "bairros"}, com fonte e
                    método em cada linha
                  </small>
                </span>
              </button>
            ) : null}
            <p aria-live="polite" className="visually-hidden">
              {downloaded}
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
  population,
  onBack,
  onFrame,
  onSelectFacility,
}: {
  neighborhood: NeighborhoodShape;
  facilities: FacilityPoint[];
  population: NeighborhoodPopulation | null;
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
        Resumo
      </button>
      <header className="reading-header">
        <span className="section-label">Bairro</span>
        <AnimatedHeading id="reading-title" text={neighborhood.name} />
      </header>

      <div className="detail-stat">
        <strong>
          <RollingNumber value={facilities.length} />
        </strong>
        <span>
          {facilities.length === 1 ? "posto de saúde fica" : "postos de saúde ficam"} dentro do
          limite do bairro
        </span>
      </div>

      <div className="detail-actions">
        <button className="action-button" onClick={onFrame} type="button">
          <Crosshair size={15} aria-hidden="true" />
          Mostrar no mapa
        </button>
      </div>

      {population ? <PeopleBlock facilities={facilities.length} population={population} /> : null}

      {facilities.length > 0 ? (
        <ListStack
          collapseLabel="Recolher a lista"
          expandLabel={(count) => `Ver os ${count} postos`}
          items={facilities.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: "Toque para ver detalhes",
          }))}
          onSelect={onSelectFacility}
        />
      ) : (
        <p className="detail-empty">
          Nenhum posto de saúde fica dentro do limite deste bairro. Isso não quer dizer que
          quem mora aqui fica sem atendimento: muita gente usa o posto de um bairro vizinho.
        </p>
      )}

      {nearest ? (
        <div aria-labelledby="nearest-title" className="detail-proxy" role="group">
          <span className="section-label" id="nearest-title">
            Posto mais perto em linha reta <span className="proxy-badge">aproximação</span>
          </span>
          <p>
            <strong>{nearestName(nearest.facilityId)}</strong> fica a{" "}
            {formatStraightLineDistance(nearest.distanceM)} do centro do bairro.
          </p>
          <small>{STRAIGHT_LINE_CAVEAT}</small>
        </div>
      ) : null}

      <p className="detail-caveat">{LAYER_SOURCES.neighborhoods.limitation}</p>

      <HowWeKnow>
        <p>
          Limite do bairro: {LAYER_SOURCES.neighborhoods.agency}, dados de{" "}
          {neighborhood.reference ?? LAYER_SOURCES.neighborhoods.reference} (código{" "}
          {neighborhood.code}). Postos: {LAYER_SOURCES.facilities.agency}, dados de{" "}
          {LAYER_SOURCES.facilities.reference}.
        </p>
        <p>
          Um posto conta para o bairro quando o ponto dele no mapa fica dentro do limite do
          bairro. A distância é medida em linha reta (fórmula de haversine) a partir do centro
          geométrico do bairro, que nem sempre é onde as pessoas moram.
        </p>
        {population ? (
          <p>
            População: {POPULATION_SOURCE.agency}, Censo {POPULATION_SOURCE.reference} (revisão
            de {POPULATION_SOURCE.revision}), somada a partir dos setores do Censo. O número
            principal conta cada setor inteiro no bairro onde fica a maior parte dele; a faixa
            usa também a divisão pela área. {POPULATION_SOURCE.license}.
          </p>
        ) : null}
      </HowWeKnow>
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
        {neighborhood ? neighborhood.name : "Resumo"}
      </button>
      <header className="reading-header">
        <span className="section-label">
          <Building2 size={13} aria-hidden="true" /> {unitTypeLabel(facility.type)}
        </span>
        <AnimatedHeading id="reading-title" text={facility.name} />
      </header>

      <dl className="detail-grid">
        <div className="detail-wide">
          <dt>Bairro</dt>
          <dd>{neighborhood?.name ?? "Fora dos limites dos bairros"}</dd>
        </div>
        <div>
          <dt>Atende pelo SUS</dt>
          <dd>{facility.sus === null ? NOT_INFORMED : facility.sus ? "Sim" : "Não"}</dd>
        </div>
        <div>
          <dt>Quem administra</dt>
          <dd>{managementLabel(facility.management)}</dd>
        </div>
      </dl>

      {mismatch ? (
        <p className="detail-warning">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>
            A Prefeitura lista este posto no bairro “{facility.declaredNeighborhood}”, mas o ponto
            no mapa fica dentro de “{neighborhood?.name}”. Pode ser diferença de nome ou de
            limite; não corrigimos isso por conta própria.
          </span>
        </p>
      ) : null}

      <div className="detail-actions">
        <button className="action-button" onClick={onFrame} type="button">
          <Crosshair size={15} aria-hidden="true" />
          Mostrar no mapa
        </button>
        {neighborhood ? (
          <button
            className="action-button action-ghost"
            onClick={() => onOpenNeighborhood(neighborhood.code)}
            type="button"
          >
            <MapIcon size={15} aria-hidden="true" />
            Ver o bairro
          </button>
        ) : null}
      </div>

      <p className="detail-caveat">{source.limitation}</p>

      <HowWeKnow>
        <dl className="detail-grid">
          <div>
            <dt>Tipo</dt>
            <dd>{unitTypeLabel(facility.type)}</dd>
          </div>
          <div>
            <dt>Natureza (fonte)</dt>
            <dd>{facility.nature ?? NOT_INFORMED}</dd>
          </div>
          <div>
            <dt>Código nacional (CNES)</dt>
            <dd>{facility.cnes ?? NOT_INFORMED}</dd>
          </div>
          <div>
            <dt>Dados de</dt>
            <dd>{facility.reference ?? NOT_INFORMED}</dd>
          </div>
          <div>
            <dt>Baixados em</dt>
            <dd>{SOURCE_COLLECTED_AT}</dd>
          </div>
          <div className="detail-wide">
            <dt>Bairro informado pela Prefeitura</dt>
            <dd>{facility.declaredNeighborhood ?? NOT_INFORMED}</dd>
          </div>
          <div className="detail-wide">
            <dt>Coordenada</dt>
            <dd className="mono">{formatCoordinate(facility.position)}</dd>
          </div>
        </dl>
        <p>
          Fonte: {source.agency}, via Fortaleza em Mapas (camada {source.catalogId}), atualizado{" "}
          {source.catalogUpdate ? `em ${source.catalogUpdate}` : catalogUpdateLabel(source)}. O
          bairro lá em cima vem de onde o ponto cai no mapa, não do que a Prefeitura escreveu.
        </p>
      </HowWeKnow>
    </div>
  );
}
