"use client";

/**
 * Adaptado de "list-stack" — Watermelon UI (MIT).
 * Cartões empilhados em 3D que se abrem em lista com mola. Recolhido, só o
 * primeiro cartão é interativo; os demais ficam inertes e ocultos do leitor.
 */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type StackItem = { id: string; title: string; subtitle: string };

type ListStackProps = {
  items: StackItem[];
  onSelect: (id: string) => void;
  expandLabel: (count: number) => string;
  collapseLabel: string;
};

const CARD_HEIGHT = 62;
const GAP = 8;
const PEEK = 8;
const MAX_PEEK = 3;

export function ListStack({ items, onSelect, expandLabel, collapseLabel }: ListStackProps) {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const canStack = items.length > 1;
  const open = expanded || !canStack;

  const height = open
    ? items.length * (CARD_HEIGHT + GAP) - GAP
    : CARD_HEIGHT + (Math.min(items.length, MAX_PEEK) - 1) * PEEK;

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 220, damping: 24 };

  return (
    <div className="list-stack flex flex-col gap-3">
      <motion.ul
        animate={{ height }}
        className="relative m-0 list-none p-0 perspective-[1000px]"
        initial={false}
        transition={spring}
      >
        {items.map((item, index) => {
          const hidden = !open && index > 0;
          const peeking = !open && index < MAX_PEEK;

          return (
            <motion.li
              animate={
                open
                  ? { y: index * (CARD_HEIGHT + GAP), scale: 1, opacity: 1 }
                  : { y: index * PEEK, scale: 1 - index * 0.05, opacity: peeking ? 1 - index * 0.25 : 0 }
              }
              aria-hidden={hidden || undefined}
              className="absolute inset-x-0 top-0"
              initial={false}
              inert={hidden}
              key={item.id}
              style={{ height: CARD_HEIGHT, zIndex: items.length - index }}
              transition={spring}
            >
              <button
                className={cn(
                  "stack-card flex h-full w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
                )}
                onClick={() => onSelect(item.id)}
                type="button"
              >
                <span className="stack-card-dot" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] font-bold text-foreground">
                    {item.title}
                  </strong>
                  <small className="block truncate font-mono text-[10.5px] text-muted-foreground">
                    {item.subtitle}
                  </small>
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>

      {canStack ? (
        <button
          aria-expanded={expanded}
          className="stack-toggle inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-xs font-bold"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={expanded ? "hide" : "show"}
              transition={{ duration: 0.18 }}
            >
              {expanded ? collapseLabel : expandLabel(items.length)}
            </motion.span>
          </AnimatePresence>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            aria-hidden="true"
            className="inline-flex"
            transition={spring}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>
      ) : null}
    </div>
  );
}
