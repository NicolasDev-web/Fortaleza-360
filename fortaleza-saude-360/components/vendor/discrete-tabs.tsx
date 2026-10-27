"use client";

/**
 * Adaptado de "discrete-tabs" — useLayouts (uselayouts.com, licença MIT).
 * A aba ativa se expande mostrando o rótulo com desfoque e um brilho; as
 * inativas ficam só com ícone (nome acessível preservado). ARIA de abas.
 */
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type DiscreteTab<T extends string> = { id: T; title: string; icon: ReactNode };

type DiscreteTabsProps<T extends string> = {
  ariaLabel: string;
  controls?: string;
  idPrefix: string;
  onChange: (id: T) => void;
  tabs: DiscreteTab<T>[];
  value: T;
};

const SPRING = { type: "spring", damping: 20, stiffness: 230, mass: 1.2 } as const;

export function DiscreteTabs<T extends string>({
  ariaLabel,
  controls,
  idPrefix,
  onChange,
  tabs,
  value,
}: DiscreteTabsProps<T>) {
  const reduce = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = (index + offset + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <LayoutGroup id={idPrefix}>
      <div aria-label={ariaLabel} className="flex flex-wrap items-center gap-2" role="tablist">
        {tabs.map((tab, index) => {
          const active = tab.id === value;

          return (
            <motion.button
              aria-controls={controls}
              aria-label={tab.title}
              aria-selected={active}
              className={cn(
                "discrete-tab relative flex items-center gap-2 overflow-hidden rounded-full border border-border bg-secondary/60 py-2.5 font-mono text-xs font-bold tracking-wide uppercase",
                active ? "px-4 text-foreground" : "px-3 text-muted-foreground hover:text-foreground",
              )}
              id={`${idPrefix}-${tab.id}`}
              key={tab.id}
              layout
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              ref={(element) => {
                refs.current[index] = element;
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              transition={reduce ? { duration: 0 } : { layout: SPRING }}
              type="button"
            >
              <motion.span aria-hidden="true" className="shrink-0" layout="position">
                {tab.icon}
              </motion.span>
              {active ? (
                <motion.span
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  aria-hidden="true"
                  className="whitespace-nowrap"
                  initial={reduce ? false : { opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: [0.86, 0, 0.07, 1] }}
                >
                  {tab.title}
                </motion.span>
              ) : null}
              {active && !reduce ? (
                <motion.span
                  animate={{ x: "220%" }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-120%" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
