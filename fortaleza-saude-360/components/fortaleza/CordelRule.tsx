/** Filete duplo levemente irregular, como as bordas impressas dos folhetos de cordel. */
export function CordelRule({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`cordel-rule ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 300 8"
    >
      <path d="M0 2.2 C40 1.6 70 2.8 110 2 S190 1.4 230 2.4 285 1.8 300 2.1" />
      <path d="M0 6 C35 6.6 80 5.4 120 6.2 S205 6.8 245 5.8 290 6.3 300 6" />
    </svg>
  );
}
