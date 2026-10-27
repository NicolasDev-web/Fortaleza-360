/** Ondas do mar atrás do contorno da cidade; a terra (preenchimento opaco) as cobre. */
export function SeaWaves() {
  const wave = "M0 10 q 25 -10 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0";

  return (
    <svg aria-hidden="true" className="sea-waves" preserveAspectRatio="none" viewBox="0 0 400 120">
      {[14, 38, 62, 86].map((y, index) => (
        <path
          d={wave}
          key={y}
          style={{ animationDelay: `${index * -2.2}s` }}
          transform={`translate(0 ${y})`}
        />
      ))}
    </svg>
  );
}
