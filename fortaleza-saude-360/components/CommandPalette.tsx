"use client";

/**
 * Visual e movimento adaptados de "command-search" — Watermelon UI (MIT):
 * entrada com desfoque, seções e destaque deslizante na opção ativa.
 * A lógica é própria: combobox acessível, foco preso e retorno de foco.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Hospital, Map as MapIcon, Search } from "lucide-react";
import { normalizeName } from "@/lib/geo";
import type { MapModel } from "@/lib/map-model";
import { unitTypeLabel } from "@/lib/sources";

type Result = {
  kind: "neighborhood" | "facility";
  id: string;
  label: string;
  detail: string;
};

type CommandPaletteProps = {
  model: MapModel;
  onClose: () => void;
  onSelectNeighborhood: (code: string) => void;
  onSelectFacility: (id: string) => void;
};

const LIMIT_PER_GROUP = 7;

export function CommandPalette({
  model,
  onClose,
  onSelectNeighborhood,
  onSelectFacility,
}: CommandPaletteProps) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const listId = useId();
  const titleId = useId();

  const neighborhoodNames = useMemo(
    () => new Map(model.neighborhoods.map((item) => [item.code, item.name])),
    [model.neighborhoods],
  );

  const results = useMemo<Result[]>(() => {
    const term = normalizeName(query);
    const matches = (value: string) => term === "" || normalizeName(value).includes(term);

    const neighborhoods = model.neighborhoods
      .filter(({ name }) => matches(name))
      .slice(0, LIMIT_PER_GROUP)
      .map<Result>(({ code, name, facilityIds }) => ({
        kind: "neighborhood",
        id: code,
        label: name,
        detail: `Bairro · ${facilityIds.length} UAPS no cadastro`,
      }));

    const facilities = [...model.facilities, ...model.otherUnits]
      .filter(({ name, cnes }) => matches(name) || (cnes !== null && cnes.includes(query.trim())))
      .slice(0, LIMIT_PER_GROUP)
      .map<Result>(({ id, name, type, cnes, neighborhoodCode }) => ({
        kind: "facility",
        id,
        label: name,
        detail: [
          unitTypeLabel(type),
          neighborhoodCode ? neighborhoodNames.get(neighborhoodCode) : null,
          cnes ? `CNES ${cnes}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    return [...neighborhoods, ...facilities];
  }, [model, neighborhoodNames, query]);

  // Montado apenas enquanto aberto: foca o campo e devolve o foco ao fechar.
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, []);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    if (result.kind === "neighborhood") onSelectNeighborhood(result.id);
    else onSelectFacility(result.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // Único elemento focável do diálogo: mantém o foco preso no campo.
      event.preventDefault();
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;
  const firstFacility = results.findIndex(({ kind }) => kind === "facility");

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="palette-backdrop"
      initial={reduce ? false : { opacity: 0 }}
      onMouseDown={onClose}
      transition={{ duration: 0.16 }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        aria-labelledby={titleId}
        aria-modal="true"
        className="palette"
        initial={reduce ? false : { opacity: 0, y: -12, scale: 0.96, filter: "blur(6px)" }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <h2 className="visually-hidden" id={titleId}>
          Buscar bairro ou UAPS
        </h2>
        <div className="palette-input">
          <Search size={18} aria-hidden="true" />
          <input
            aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded="true"
            aria-label="Buscar bairro, UAPS ou CNES"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Bairro, UAPS ou CNES…"
            ref={inputRef}
            role="combobox"
            spellCheck={false}
            type="text"
            value={query}
          />
          <kbd aria-hidden="true">Esc</kbd>
        </div>

        <ul aria-label="Resultados" className="palette-results" id={listId} role="listbox">
          {results.map((result, index) => (
            <li
              aria-selected={index === active}
              className={[
                "palette-option",
                index === active ? "is-active" : "",
                index === 0 || index === firstFacility ? "starts-group" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-group={result.kind === "facility" ? "UAPS" : "Bairros"}
              id={optionId(index)}
              key={`${result.kind}-${result.id}`}
              onClick={() => choose(result)}
              onMouseMove={() => setActive(index)}
              role="option"
            >
              {index === active ? (
                <motion.span
                  aria-hidden="true"
                  className="palette-active-pill"
                  layoutId="palette-active"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }}
                />
              ) : null}
              {result.kind === "facility" ? (
                <Hospital size={15} aria-hidden="true" />
              ) : (
                <MapIcon size={15} aria-hidden="true" />
              )}
              <span>
                <strong>{result.label}</strong>
                <small>{result.detail}</small>
              </span>
            </li>
          ))}
        </ul>

        {results.length === 0 ? (
          <p className="palette-empty" role="status">
            Nada encontrado para “{query}”.
          </p>
        ) : null}

        <footer className="palette-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> abrir ficha
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}
