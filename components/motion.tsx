"use client";

import {
  motion,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";
import type { ReactNode } from "react";

/**
 * The site's one easing curve — heavy at the start, settling rather than
 * stopping. Everything that moves resolves through it.
 */
const EASE = [0.32, 0.72, 0, 1] as const;

/** 800ms. Long enough that the element reads as having mass. */
const DURATION = 0.8;

/**
 * Elements arrive from below and out of focus, not just faded. The blur is what
 * makes the entrance read as depth instead of opacity.
 *
 * `whileInView` compiles to an IntersectionObserver — there is no scroll
 * listener anywhere in this file, deliberately.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 64, filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION, ease: EASE },
  },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

/** Single element that fades + rises into view once. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y: 64, filter: "blur(12px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: DURATION, delay, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Wrap a group of <Item> children to stagger them in. */
export function Stagger({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={container}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Item({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}
