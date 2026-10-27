"use client";

/**
 * Adaptado de "labeled-progress-indicator" — Watermelon UI (MIT).
 * Controlado por props: o rótulo vira em 3D quando muda e a barra tem brilho
 * correndo. Exposto como role="progressbar" com valor textual.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type LabeledProgressProps = {
  className?: string;
  label: string;
  max: number;
  value: number;
  valueText: string;
};

export function LabeledProgress({ className, label, max, value, valueText }: LabeledProgressProps) {
  const reduce = useReducedMotion();
  const percent = `${Math.round((value / max) * 100)}%`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="relative h-5 overflow-hidden perspective-[800px]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            className="block truncate font-mono text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase"
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateX: 90, filter: "blur(4px)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, rotateX: -60, filter: "blur(4px)" }}
            key={label}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div
        aria-label="Progresso da história"
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="h-2 overflow-hidden rounded-full border border-border bg-muted"
        role="progressbar"
      >
        <motion.div
          animate={{ width: percent }}
          className="relative h-full overflow-hidden rounded-full bg-primary"
          initial={false}
          transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {reduce ? null : (
            <motion.div
              animate={{ x: "200%" }}
              className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-white/45 to-transparent"
              initial={{ x: "-100%" }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
