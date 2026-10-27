import { useId } from "react";

/** Divisória em renda de bilro: picôs (arcos) e pontos de linha. */
export function LaceDivider({ className = "" }: { className?: string }) {
  const id = useId();

  return (
    <svg aria-hidden="true" className={`lace-divider ${className}`} height="14" width="100%">
      <defs>
        <pattern height="14" id={id} patternUnits="userSpaceOnUse" width="24">
          <path d="M0 4 Q6 13 12 4 Q18 13 24 4" fill="none" />
          <circle cx="12" cy="4" r="1.6" />
          <circle cx="6" cy="9.5" r="0.9" />
          <circle cx="18" cy="9.5" r="0.9" />
        </pattern>
      </defs>
      <rect fill={`url(#${id})`} height="14" width="100%" />
    </svg>
  );
}
