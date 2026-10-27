"use client";

/**
 * Adaptado de "feature-tour" — Watermelon UI (MIT).
 * Preserva as transições com desfoque e os pontos de navegação; vira um
 * componente controlado que renderiza o conteúdo de cada passo, com teclado
 * (setas e Esc) no próprio contêiner e foco inicial no botão principal.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TourStep = { id: string; label: string };

type FeatureTourProps = {
  children: ReactNode;
  className?: string;
  closeLabel: string;
  footer: ReactNode;
  index: number;
  labelledBy: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  steps: TourStep[];
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function FeatureTour({
  children,
  className,
  closeLabel,
  footer,
  index,
  labelledBy,
  onClose,
  onIndexChange,
  steps,
}: FeatureTourProps) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const current = steps[index];

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLButtonElement>("[data-autofocus]")
      ?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight" && index < steps.length - 1) onIndexChange(index + 1);
    else if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    else if (event.key === "Escape") onClose();
    else return;
    event.preventDefault();
  };

  return (
    <motion.section
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      aria-labelledby={labelledBy}
      aria-roledescription="história guiada"
      className={cn("feature-tour", className)}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
      onKeyDown={onKeyDown}
      ref={containerRef}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <button aria-label={closeLabel} className="tour-close" onClick={onClose} type="button">
        <X size={18} strokeWidth={2.6} aria-hidden="true" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="tour-content"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(3px)" }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(3px)" }}
          key={current.id}
          transition={{ duration: 0.26, ease: EASE_OUT }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <div className="tour-dots" role="group" aria-label="Capítulos">
        {steps.map((step, stepIndex) => (
          <button
            aria-current={stepIndex === index ? "step" : undefined}
            aria-label={`Ir para o capítulo: ${step.label}`}
            className="tour-dot"
            key={step.id}
            onClick={() => onIndexChange(stepIndex)}
            type="button"
          >
            <motion.span
              animate={{ scale: stepIndex === index ? 1.35 : 1 }}
              className={stepIndex === index ? "is-current" : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </button>
        ))}
      </div>

      {footer}
    </motion.section>
  );
}
