"use client";

import { BookOpen, Compass, Search } from "lucide-react";
import { JangadaMark } from "@/components/fortaleza/JangadaMark";
import { DemoNotice } from "@/components/ProvenanceBadge";
import { ContinuousTabs, type ContinuousTab } from "@/components/vendor/continuous-tabs";

export type Mode = "story" | "explore" | "compare" | "simulate";

export const MODES: ContinuousTab<Mode>[] = [
  { id: "story", label: "História", icon: <BookOpen size={14} aria-hidden="true" /> },
  { id: "explore", label: "Explorar", icon: <Compass size={14} aria-hidden="true" /> },
  { id: "compare", label: "Comparar" },
  { id: "simulate", label: "Simular" },
];

type CommandBarProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onOpenSearch: () => void;
  searchDisabled: boolean;
};

export function CommandBar({ mode, onModeChange, onOpenSearch, searchDisabled }: CommandBarProps) {
  return (
    <header className="command-bar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <JangadaMark size={24} />
          <span>
            F<span className="brand-slash">/</span>360
          </span>
        </span>
        <div>
          <strong>Fortaleza Saúde 360°</strong>
          <small>Postos de saúde no mapa · protótipo</small>
        </div>
      </div>

      <ContinuousTabs
        ariaLabel="Formas de ver o mapa"
        className="mode-switch"
        controls="stage-panel"
        idPrefix="mode-tab"
        onChange={onModeChange}
        tabs={MODES}
        value={mode}
      />

      <div className="command-actions">
        <span className="geo-stamp" aria-hidden="true">
          03°43′S 38°32′O
        </span>
        <button
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K"
          className="search-trigger"
          disabled={searchDisabled}
          onClick={onOpenSearch}
          type="button"
        >
          <Search size={15} aria-hidden="true" />
          <span>Buscar bairro ou posto</span>
          <kbd aria-hidden="true">Ctrl K</kbd>
        </button>
        <DemoNotice />
      </div>
    </header>
  );
}
