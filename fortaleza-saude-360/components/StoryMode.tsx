"use client";

import { ArrowLeft, ArrowRight, Compass, TriangleAlert } from "lucide-react";
import { CordelRule } from "@/components/fortaleza/CordelRule";
import { SunRise } from "@/components/fortaleza/SunRise";
import { AnimatedHeading } from "@/components/motion/AnimatedHeading";
import { FeatureTour } from "@/components/vendor/feature-tour";
import { LabeledProgress } from "@/components/vendor/labeled-progress-indicator";
import type { StoryChapter } from "@/lib/story";

type StoryModeProps = {
  chapters: StoryChapter[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function StoryMode({ chapters, index, onIndexChange, onClose }: StoryModeProps) {
  const chapter = chapters[index];
  const isLast = index === chapters.length - 1;

  return (
    <FeatureTour
      className="story-card"
      closeLabel="Pular a história e explorar"
      footer={
        <div className="story-nav">
          <button
            className="story-nav-button"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
            type="button"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="visually-hidden">Capítulo anterior</span>
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
            onClick={() => (isLast ? onClose() : onIndexChange(index + 1))}
            type="button"
          >
            {isLast ? (
              <>
                <Compass size={15} aria-hidden="true" /> Explorar o mapa
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

      <div className="story-kicker">
        {chapter.folheto !== null ? (
          <span className="cordel-badge" aria-label={`Folheto número ${chapter.folheto}`}>
            Nº {chapter.folheto}
          </span>
        ) : null}
        <span className="section-label">{chapter.kicker}</span>
      </div>

      <AnimatedHeading className="story-title" id="story-title" shimmer={chapter.phase === "intro"} text={chapter.title} />
      <CordelRule />

      <div className="story-body">
        {chapter.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {chapter.caveat ? (
        <p className="story-caveat">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>{chapter.caveat}</span>
        </p>
      ) : null}
    </FeatureTour>
  );
}
