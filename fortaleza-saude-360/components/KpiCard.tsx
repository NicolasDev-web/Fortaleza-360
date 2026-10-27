import type { LucideIcon } from "lucide-react";
import { RollingNumber } from "@/components/motion/RollingNumber";

type KpiValue = number | string | null;

type KpiCardProps = {
  icon: LucideIcon;
  label: string;
  note: string;
  value: KpiValue;
  fractionDigits?: number;
};

export function KpiCard({ icon: Icon, label, note, value, fractionDigits = 0 }: KpiCardProps) {
  const hasData = value !== null;

  return (
    <article className="readout">
      <div className="readout-heading">
        <span className="readout-icon" aria-hidden="true">
          <Icon size={17} />
        </span>
        <span>{label}</span>
      </div>
      <strong aria-label={hasData ? undefined : "Sem dados"}>
        {typeof value === "number" ? (
          <RollingNumber maximumFractionDigits={fractionDigits} value={value} />
        ) : hasData ? (
          value
        ) : (
          "—"
        )}
      </strong>
      <small>{note}</small>
    </article>
  );
}
