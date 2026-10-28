import { ArrowLeft, Lock } from "lucide-react";
import { AnimatedHeading } from "@/components/motion/AnimatedHeading";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import type { Mode } from "@/components/CommandBar";

type ConceptContent = {
  title: string;
  question: string;
  method: string[];
  dependencies: string[];
  guardrail: string;
};

export type ConceptModeId = Exclude<Mode, "explore" | "story">;

const concepts: Record<ConceptModeId, ConceptContent> = {
  compare: {
    title: "Comparar dois bairros",
    question: "Quem mora mais longe de um posto de saúde: o bairro A ou o bairro B?",
    method: [
      "Quantas pessoas moram em cada bairro, pelo Censo 2022.",
      "Distância em linha reta até o posto mais perto, sempre marcada como aproximação.",
      "A margem de erro de cada número, lado a lado — sem ranking automático.",
    ],
    dependencies: [
      "População por bairro (pronta)",
      "Distância em linha reta (pronta)",
      "Números por bairro (em breve)",
    ],
    guardrail: "Nenhum bairro será chamado de vulnerável só por contar postos.",
  },
  simulate: {
    title: "Simular um posto novo",
    question: "Se abrisse um posto aqui, quantas pessoas a mais ficariam perto de um?",
    method: [
      "Distância pelo caminho das ruas (OpenStreetMap), não em linha reta.",
      "Áreas que se alcança a pé em 10, 20 e 30 minutos, com margem de erro.",
      "Cenários salvos só no seu navegador, comparados com a situação de hoje.",
    ],
    dependencies: ["Mapa das ruas para caminhar", "Áreas por tempo a pé", "Simulador"],
    guardrail: "O simulador não promete vagas nem atendimento: só mostra quem ficaria mais perto.",
  },
};

type ConceptModeProps = {
  mode: ConceptModeId;
  onBack: () => void;
};

export function ConceptMode({ mode, onBack }: ConceptModeProps) {
  const content = concepts[mode];

  return (
    <div className="concept-overlay">
      <div className="concept-rings" aria-hidden="true">
        <i />
        <i />
        <i />
        <b />
      </div>

      <div className="concept-card">
        <div className="story-kicker">
          <span className="concept-status">
            <Lock size={13} aria-hidden="true" /> Em breve
          </span>
        </div>
        <AnimatedHeading className="concept-title" text={content.title} />
        <hr className="story-rule" />
        <p className="concept-question">{content.question}</p>

        <h3>Como vai funcionar</h3>
        <ol>
          {content.method.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <h3>O que falta</h3>
        <ul className="concept-deps">
          {content.dependencies.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="concept-guardrail">{content.guardrail}</p>

        <div className="concept-foot">
          <ProvenanceBadge label="Ilustração, não é mapa real" tone="warning" />
          <button className="action-button" onClick={onBack} type="button">
            <ArrowLeft size={15} aria-hidden="true" />
            Voltar ao mapa
          </button>
        </div>
      </div>
    </div>
  );
}
