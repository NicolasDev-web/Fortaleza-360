"use client";

import { motion, useReducedMotion } from "motion/react";

/** Uma onda atravessa o mapa de baixo para cima quando o modo muda. Só decorativa. */
export function ModeWave() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden="true" className="mode-wave">
      <motion.svg
        animate={{ y: "-105%", opacity: [0, 1, 1, 0] }}
        initial={{ y: "45%", opacity: 0 }}
        preserveAspectRatio="none"
        transition={{ duration: 1.1, ease: [0.4, 0, 0.6, 1], opacity: { duration: 1.1, times: [0, 0.2, 0.75, 1] } }}
        viewBox="0 0 400 260"
      >
        <path
          d="M0 40 q 50 -30 100 0 t 100 0 t 100 0 t 100 0 v 12 q -50 -30 -100 0 t -100 0 t -100 0 t -100 0 z"
          fillOpacity={0.6}
        />
        <path
          d="M0 64 q 50 -30 100 0 t 100 0 t 100 0 t 100 0 V 200 q -50 30 -100 0 t -100 0 t -100 0 t -100 0 z"
          fillOpacity={0.2}
        />
      </motion.svg>
    </div>
  );
}
