type ProvenanceTone = "neutral" | "warning" | "source";

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
      aria-label="Protótipo em teste: mostra onde ficam os postos, não quanto atendem"
      role="note"
    >
      <span className="demo-notice-dot" aria-hidden="true" />
      Protótipo<span className="demo-notice-extra"> · em teste</span>
    </strong>
  );
}
