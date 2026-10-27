/** Vela de jangada estilizada: marca do F/360. */
export function JangadaMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="jangada-mark"
      fill="none"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <path className="jangada-sail" d="M11 3.5v20h15.5C21 18.5 15.5 11.5 11 3.5Z" />
      <path className="jangada-mast" d="M11 3v22" />
      <path className="jangada-hull" d="M4 25.5h22.5l-2.5 3H7.5Z" />
      <path className="jangada-wave" d="M2 30.5c2.5-1.4 4.5-1.4 7 0s4.5 1.4 7 0 4.5-1.4 7 0 4.5 1.4 7 0" />
    </svg>
  );
}
