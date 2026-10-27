"use client";

import { motion, useReducedMotion } from "motion/react";

/** Sol da Terra da Luz nascendo do mar (abertura do Modo História). */
export function SunRise() {
  const reduce = useReducedMotion();

  return (
    <svg aria-hidden="true" className="sun-rise" viewBox="0 0 240 96">
      <defs>
        <clipPath id="sun-horizon">
          <rect height="70" width="240" />
        </clipPath>
        <radialGradient id="sun-glow">
          <stop offset="0%" stopColor="#eca400" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#eca400" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.g
        animate={{ y: 0, opacity: 1 }}
        clipPath="url(#sun-horizon)"
        initial={reduce ? false : { y: 34, opacity: 0.3 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <circle cx="120" cy="70" fill="url(#sun-glow)" r="64" />
        <circle className="sun-disc" cx="120" cy="70" r="26" />
        {Array.from({ length: 9 }, (_, index) => {
          const angle = Math.PI + (index * Math.PI) / 8;
          return (
            <line
              className="sun-ray"
              key={index}
              x1={120 + Math.cos(angle) * 34}
              x2={120 + Math.cos(angle) * 46}
              y1={70 + Math.sin(angle) * 34}
              y2={70 + Math.sin(angle) * 46}
            />
          );
        })}
      </motion.g>
      <line className="sun-horizon" x1="0" x2="240" y1="70.5" y2="70.5" />
      {[78, 85, 92].map((y, index) => (
        <line
          className="sun-reflection"
          key={y}
          x1={120 - 34 + index * 9}
          x2={120 + 34 - index * 9}
          y1={y}
          y2={y}
        />
      ))}
    </svg>
  );
}
