import { ArrowLeft, Lock } from "lucide-react";
import { CordelRule } from "@/components/fortaleza/CordelRule";
import { AnimatedHeading } from "@/components/motion/AnimatedHeading";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import type { Mode } from "@/components/CommandBar";

type ConceptContent = {
  folheto: number;
  title: string;
  question: string;
  method: string[];
  dependencies: string[];
  guardrail: string;
};

export type ConceptModeId = Exclude<Mode, "explore" | "story">;

const concepts: Record<ConceptModeId, ConceptContent> = {
  compare: {
    folheto: 5,
    title: "Comparar territórios",
    question: "Como dois bairros diferem em distância até a UAPS mais próxima?",
    method: [
      "Denominador populacional do Censo 2022 compatibilizado com os bairros.",
      "Proxy de distância em linha reta, sempre rotulado como proxy.",
      "Faixas de incerteza lado a lado, sem ranking automático.",
    ],
    dependencies: ["SDD-025 · Censo", "SDD-032 · Proxy de distância", "SDD-033 · Indicadores"],
    guardrail: "Nenhum bairro será classificado como vulnerável a partir de contagens de cadastro.",
  },
  simulate: {
    folheto: 6,
    title: "Simulador de cenários",
    question: "Quanto mudaria a cobertura modelada com uma unidade candidata?",
    method: [
      "Tempo pela malha viária (OSM) em vez de linha reta.",
      "Isócronas e população coberta com análise de sensibilidade.",
      "Cenários salvos apenas no navegador, comparados a um cenário-base.",
    ],
    dependencies: ["SDD-035 · Malha viária", "SDD-037 · Isócronas", "SDD-039 · Simulador"],
    guardrail: "O simulador não promete capacidade assistencial nem demanda atendida.",
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
          <span className="cordel-badge" aria-label={`Folheto número ${content.folheto}`}>
            Nº {content.folheto}
          </span>
          <span className="concept-status">
            <Lock size={13} aria-hidden="true" /> Modo em preparação
          </span>
        </div>
        <AnimatedHeading className="concept-title" text={content.title} />
        <CordelRule />
        <p className="concept-question">{content.question}</p>

        <h3>Como vai funcionar</h3>
        <ol>
          {content.method.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <h3>Depende de</h3>
        <ul className="concept-deps">
          {content.dependencies.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="concept-guardrail">{content.guardrail}</p>

        <div className="concept-foot">
          <ProvenanceBadge label="Ilustração conceitual · não geográfica" tone="warning" />
          <button className="action-button" onClick={onBack} type="button">
            <ArrowLeft size={15} aria-hidden="true" />
            Voltar a Explorar
          </button>
        </div>
      </div>
    </div>
  );
}
