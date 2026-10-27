import type { LucideIcon } from "lucide-react";

type KpiValue = number | string | null;

type KpiCardProps = {
  icon: LucideIcon;
  label: string;
  note: string;
  value: KpiValue;
};

export function KpiCard({ icon: Icon, label, note, value }: KpiCardProps) {
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
        {hasData ? value : "—"}
      </strong>
      <small>{note}</small>
    </article>
  );
}
