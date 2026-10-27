"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";

type RollingNumberProps = {
  value: number;
  maximumFractionDigits?: number;
  className?: string;
};

/**
 * Dígitos que rolam até o valor (NumberFlow, dependência do catálogo Watermelon).
 * O texto final fica também em um span oculto para leitores de tela e testes.
 */
export function RollingNumber({ value, maximumFractionDigits = 0, className }: RollingNumberProps) {
  const [shown, setShown] = useState(0);
  const format = { maximumFractionDigits, minimumFractionDigits: maximumFractionDigits };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      <NumberFlow aria-hidden="true" format={format} locales="pt-BR" value={shown} />
      <span className="visually-hidden">{value.toLocaleString("pt-BR", format)}</span>
    </span>
  );
}
