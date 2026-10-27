"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "p";

type AnimatedHeadingProps = {
  as?: HeadingTag;
  className?: string;
  delay?: number;
  id?: string;
  shimmer?: boolean;
  text: string;
};

const motionTags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
};

/**
 * Título que surge palavra a palavra (desfoque + subida), com brilho opcional.
 * Reinicia quando o texto muda; sem animação sob prefers-reduced-motion.
 */
export function AnimatedHeading({
  as = "h2",
  className,
  delay = 0,
  id,
  shimmer = false,
  text,
}: AnimatedHeadingProps) {
  const reduce = useReducedMotion();
  const Tag = motionTags[as];
  const words = text.split(" ");

  return (
    <Tag
      className={cn("animated-heading", shimmer && "has-shimmer", className)}
      id={id}
      initial="hidden"
      animate="visible"
      key={text}
      transition={{ staggerChildren: reduce ? 0 : 0.055, delayChildren: delay }}
    >
      {words.map((word, index) => [
        index > 0 ? " " : null,
        <motion.span
          className="animated-word"
          key={`${word}-${index}`}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          variants={
            reduce
              ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
              : {
                  hidden: { opacity: 0, y: "0.45em", filter: "blur(8px)" },
                  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                }
          }
        >
          {word}
        </motion.span>,
      ])}
    </Tag>
  );
}
