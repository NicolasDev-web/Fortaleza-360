"use client";

/**
 * Adaptado de "continuous-tabs" — Watermelon UI (ui.watermelon.sh, licença MIT).
 * Mantém a pílula deslizante com mola; acrescenta papéis ARIA de abas,
 * tabindex itinerante e navegação por setas/Home/End.
 */
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type ContinuousTab<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
  suffix?: ReactNode;
};

type ContinuousTabsProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  controls?: string;
  idPrefix: string;
  onChange: (id: T) => void;
  tabs: ContinuousTab<T>[];
  value: T;
};

export function ContinuousTabs<T extends string>({
  ariaLabel,
  className,
  controls,
  idPrefix,
  onChange,
  tabs,
  value,
}: ContinuousTabsProps<T>) {
  const reduce = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;

    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <LayoutGroup id={idPrefix}>
      <div
        aria-label={ariaLabel}
        className={cn(
          "relative flex items-center gap-1 rounded-full border border-border bg-popover/80 p-1",
          className,
        )}
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === value;

          return (
            <button
              aria-controls={controls}
              aria-selected={active}
              className="continuous-tab relative flex min-h-9 items-center rounded-full px-4 text-sm font-bold"
              id={`${idPrefix}-${tab.id}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              ref={(element) => {
                refs.current[index] = element;
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              {active ? (
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary shadow-[0_6px_18px_rgba(156,163,219,0.28)]"
                  layoutId="active-pill"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 30, mass: 0.9 }
                  }
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex items-center gap-2 transition-colors duration-200",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.suffix}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
