"use client";

import { ArrowLeft, ArrowRight, Compass, TriangleAlert } from "lucide-react";
import { SunRise } from "@/components/fortaleza/SunRise";
import { AnimatedHeading } from "@/components/motion/AnimatedHeading";
import { FeatureTour } from "@/components/vendor/feature-tour";
import { LabeledProgress } from "@/components/vendor/labeled-progress-indicator";
import type { StoryChapter } from "@/lib/story";
import type { NeighborhoodShape } from "@/lib/map-model";

type StoryModeProps = {
  chapters: StoryChapter[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  neighborhoods: NeighborhoodShape[];
  selectedNeighborhood: NeighborhoodShape | undefined;
  onSelectNeighborhood: (code: string) => void;
  onExplore: () => void;
  onCompare: () => void;
  onSimulate: () => void;
};

export function StoryMode({ chapters, index, onIndexChange, onClose, neighborhoods, selectedNeighborhood, onSelectNeighborhood, onExplore, onCompare, onSimulate }: StoryModeProps) {
  const chapter = chapters[index];
  const isLast = index === chapters.length - 1;

  return (
    <FeatureTour
      className="story-card"
      closeLabel="Pular a história e ir para o mapa"
      footer={
        <div className="story-nav">
          <button
            className="story-nav-button"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
            type="button"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="visually-hidden">Tela anterior</span>
          </button>
          <LabeledProgress
            className="story-progress"
            label={chapter.kicker}
            max={chapters.length}
            value={index + 1}
            valueText={`Capítulo ${index + 1} de ${chapters.length}`}
          />
          <button
            className="action-button story-next"
            data-autofocus
            onClick={() => (isLast ? onExplore() : onIndexChange(index + 1))}
            type="button"
          >
            {isLast ? (
              <>
                <Compass size={15} aria-hidden="true" /> Ir para o mapa
              </>
            ) : (
              <>
                Próximo <ArrowRight size={15} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      }
      index={index}
      labelledBy="story-title"
      onClose={onClose}
      onIndexChange={onIndexChange}
      steps={chapters.map(({ id, kicker }) => ({ id, label: kicker }))}
    >
      {chapter.phase === "intro" ? <SunRise /> : null}

      <p className="story-kicker section-label">
        Capítulo {index + 1} · {chapter.kicker}
      </p>

      <AnimatedHeading className="story-title" id="story-title" shimmer={chapter.phase === "intro"} text={chapter.title} />
      <hr className="story-rule" />

      <div className="story-body">
        {chapter.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {chapter.phase === "contours" ? <div className="story-participation">
        <label htmlFor="story-neighborhood">Escolha um bairro na história</label>
        <select id="story-neighborhood" value={selectedNeighborhood?.code ?? ""} onChange={event => onSelectNeighborhood(event.target.value)}>
          <option value="">Um bairro que você conhece…</option>
          {neighborhoods.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        {selectedNeighborhood ? <>
          <p role="status"><strong>{selectedNeighborhood.name}</strong> {selectedNeighborhood.facilityIds.length === 0 ? "não tem posto" : `tem ${selectedNeighborhood.facilityIds.length} ${selectedNeighborhood.facilityIds.length === 1 ? "posto" : "postos"}`} dentro do seu limite, na lista de 2026.</p>
          <button className="action-button" type="button" onClick={onExplore}>Conhecer este bairro</button>
        </> : null}
      </div> : null}

      {isLast ? <div className="story-choices">
        <button className="action-button action-ghost" type="button" onClick={onCompare}>{selectedNeighborhood ? "Comparar este bairro" : "Comparar dois bairros"}</button>
        <button className="action-button action-ghost" type="button" onClick={onSimulate}>Experimentar um posto novo</button>
      </div> : null}

      {chapter.caveat ? (
        <p className="story-caveat">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>{chapter.caveat}</span>
        </p>
      ) : null}
    </FeatureTour>
  );
}
