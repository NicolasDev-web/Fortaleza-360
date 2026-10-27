type ProvenanceTone = "neutral" | "warning";

type ProvenanceBadgeProps = {
  label: string;
  tone?: ProvenanceTone;
};

export function ProvenanceBadge({
  label,
  tone = "neutral",
}: ProvenanceBadgeProps) {
  return (
    <span className={`provenance-badge provenance-badge-${tone}`}>
      {label}
    </span>
  );
}

export function DemoNotice() {
  return (
    <strong
      className="demo-notice"
      aria-label="Modo demonstrativo, sem dados reais"
      role="note"
    >
      Modo demo · sem dados reais
    </strong>
  );
}
