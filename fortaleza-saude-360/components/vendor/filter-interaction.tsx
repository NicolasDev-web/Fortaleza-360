"use client";

/**
 * Adaptado de "filter-interaction" — useLayouts (uselayouts.com, licença MIT).
 * Linhas que entram em cascata com mola e um indicador de seleção que se
 * preenche. Aqui vira a lista do Índice de bairros (botões nativos).
 */
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterListItem = {
  id: string;
  label: string;
  trailing: ReactNode;
  srText?: string;
};

type FilterListProps = {
  items: FilterListItem[];
  onSelect: (id: string) => void;
  selectedId: string | null;
};

const STAGGER_LIMIT = 18;

export function FilterList({ items, onSelect, selectedId }: FilterListProps) {
  const reduce = useReducedMotion();

  return (
    <ul className="index-list">
      {items.map((item, index) => {
        const selected = item.id === selectedId;

        return (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            key={item.id}
            transition={{
              type: "spring",
              bounce: 0.1,
              duration: 0.35,
              delay: Math.min(index, STAGGER_LIMIT) * 0.022,
            }}
          >
            <button
              aria-current={selected ? "true" : undefined}
              className={cn(selected && "is-selected")}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <span className="index-check" aria-hidden="true">
                {selected ? <Check size={11} strokeWidth={3.2} /> : null}
              </span>
              <span className="index-label">{item.label}</span>
              {item.trailing}
              {item.srText ? <span className="visually-hidden">{item.srText}</span> : null}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
