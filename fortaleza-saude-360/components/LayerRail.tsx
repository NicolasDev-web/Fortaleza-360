"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Lock, SlidersHorizontal } from "lucide-react";
import type { LayerVisibility } from "@/components/CityMap";
import { POPULATION_SOURCE } from "@/lib/population";
import {
  catalogUpdateLabel,
  LAYER_SOURCES,
  SOURCE_ATTRIBUTION,
  SOURCE_COLLECTED_AT,
  SOURCE_LICENSE,
  SOURCE_TERMS_URL,
} from "@/lib/sources";

type LayerRailProps = {
  counts: { neighborhoods: number; facilities: number; upas: number; hospitals: number } | null;
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
};

const numberFormat = new Intl.NumberFormat("pt-BR");

export function LayerRail({ counts, layers, onToggle }: LayerRailProps) {
  const [open, setOpen] = useState(false);
  const available = counts !== null;

  const rows: Array<{
    key: keyof LayerVisibility;
    label: string;
    meta: string;
    count: number | null;
  }> = [
    {
      key: "boundary",
      label: "Limite da cidade",
      meta: `${LAYER_SOURCES.boundary.agency} · dados de ${LAYER_SOURCES.boundary.reference}`,
      count: null,
    },
    {
      key: "neighborhoods",
      label: "Bairros",
      meta: `${LAYER_SOURCES.neighborhoods.agency} · dados de ${LAYER_SOURCES.neighborhoods.reference}`,
      count: counts?.neighborhoods ?? null,
    },
    {
      key: "facilities",
      label: "Postos de saúde (UAPS)",
      meta: `${LAYER_SOURCES.facilities.agency} · dados de ${LAYER_SOURCES.facilities.reference}`,
      count: counts?.facilities ?? null,
    },
    {
      key: "upas",
      label: "UPAs (pronto atendimento)",
      meta: `${LAYER_SOURCES.upas.agency} · dados de ${LAYER_SOURCES.upas.reference}`,
      count: counts?.upas ?? null,
    },
    {
      key: "hospitals",
      label: "Hospitais municipais",
      meta: `${LAYER_SOURCES.hospitals.agency} · dados de ${LAYER_SOURCES.hospitals.reference}`,
      count: counts?.hospitals ?? null,
    },
  ];

  return (
    <section className="layer-rail" aria-labelledby="rail-title">
      <div className="rail-intro">
        <span className="section-label">Explore o mapa</span>
        <h1 id="rail-title">Onde ficam os postos de saúde de Fortaleza?</h1>
        <p>
          O posto de saúde é a porta de entrada do SUS. Veja onde ficam os postos, as
          UPAs e os hospitais municipais — e toque num bairro para saber o que tem lá.
        </p>
      </div>

      <button
        aria-controls="rail-body"
        aria-expanded={open}
        className="rail-toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>O que mostrar e de onde vem</span>
        <ChevronDown className="rail-toggle-chevron" size={16} aria-hidden="true" />
      </button>

      <div className="rail-body" data-open={open} id="rail-body">
        <section className="rail-section" aria-labelledby="layers-title">
          <h2 className="section-label" id="layers-title">
            O que mostrar no mapa
          </h2>
          <ul className="layer-list">
            {rows.map(({ key, label, meta, count }) => (
              <li key={key}>
                <button
                  aria-pressed={available && layers[key]}
                  className={`layer-toggle layer-toggle-${key}`}
                  disabled={!available}
                  onClick={() => onToggle(key)}
                  type="button"
                >
                  <span className="layer-swatch" aria-hidden="true" />
                  <span className="layer-text">
                    <strong>{label}</strong>
                    <small>{meta}</small>
                  </span>
                  {count !== null ? (
                    <span className="layer-count">{numberFormat.format(count)}</span>
                  ) : null}
                  <span className="layer-switch" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <div className="layer-toggle is-locked" aria-disabled="true">
                <span className="layer-swatch" aria-hidden="true">
                  <Lock size={11} />
                </span>
                <span className="layer-text">
                  <strong>Distância até o posto</strong>
                  <small>Já aparece no bairro · no mapa, em breve</small>
                </span>
              </div>
            </li>
          </ul>
        </section>

        <section className="rail-section" aria-labelledby="legend-title">
          <h2 className="section-label" id="legend-title">
            Legenda
          </h2>
          <ul className="legend-list">
            <li>
              <i className="legend-dot" aria-hidden="true" /> Posto de saúde (UAPS)
            </li>
            <li>
              <i className="legend-upa" aria-hidden="true" /> UPA (pronto atendimento)
            </li>
            <li>
              <i className="legend-hospital" aria-hidden="true" /> Hospital municipal
            </li>
            <li>
              <i className="legend-line" aria-hidden="true" /> Limite de bairro
            </li>
            <li>
              <i className="legend-coast" aria-hidden="true" /> Limite da cidade
            </li>
            <li>
              <i className="legend-selected" aria-hidden="true" /> O que você escolheu
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="sources-title"
          className="rail-section rail-sources"
          data-technical
        >
          <h2 className="section-label" id="sources-title">
            De onde vêm os dados
          </h2>
          <ul>
            {Object.values(LAYER_SOURCES).map((source) => (
              <li key={source.id}>
                <a href={source.pageUrl} rel="noopener noreferrer" target="_blank">
                  {source.title}
                  <ExternalLink size={12} aria-hidden="true" />
                  <span className="visually-hidden"> (abre em nova aba)</span>
                </a>
                <small>
                  {source.agency} · dados de {source.reference} · atualizado{" "}
                  {catalogUpdateLabel(source)}
                </small>
              </li>
            ))}
            <li>
              <a href={POPULATION_SOURCE.pageUrl} rel="noopener noreferrer" target="_blank">
                {POPULATION_SOURCE.title}
                <ExternalLink size={12} aria-hidden="true" />
                <span className="visually-hidden"> (abre em nova aba)</span>
              </a>
              <small>
                {POPULATION_SOURCE.agency} · dados de {POPULATION_SOURCE.reference} · revisão de{" "}
                {POPULATION_SOURCE.revision} · {POPULATION_SOURCE.license}
              </small>
            </li>
          </ul>
          <p className="rail-attribution">{SOURCE_ATTRIBUTION}</p>
          <p className="rail-license">
            <a href={SOURCE_TERMS_URL} rel="noopener noreferrer" target="_blank">
              {SOURCE_LICENSE}
              <span className="visually-hidden"> (abre em nova aba)</span>
            </a>
            . Baixados em {SOURCE_COLLECTED_AT}. Dados de anos diferentes nunca são
            misturados num mesmo número.
          </p>
        </section>
      </div>
    </section>
  );
}
