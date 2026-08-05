"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ElementType,
} from "react";

/**
 * One IntersectionObserver hook behind every reveal on the site.
 *
 * `once` is the default because a section that re-animates every time it
 * re-enters the viewport reads as a glitch rather than an effect.
 */
export function useInView<T extends HTMLElement>(rootMargin = "-12% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/** Rises into place. The only entrance the paper sections use. */
export function Rise({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={`rise ${inView ? "is-in" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * A plate: the manual's section unit.
 *
 * `tone="void"` is the stretch inside the machine. It is a prop rather than a
 * separate component because the shell is genuinely identical — only the ground
 * it is printed on changes, and that is the point the story is making.
 */
export function Plate({
  id,
  tone = "paper",
  className = "",
  backdrop,
  children,
}: {
  id?: string;
  tone?: "paper" | "void";
  className?: string;
  /**
   * A full-bleed layer behind the plate's content — an illustration, usually.
   * It is a named slot rather than just another child because it has to be a
   * *sibling* of `.plate-inner`: an absolutely positioned layer nested inside
   * the content wrapper has no box to fill and collapses to zero height.
   */
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`plate ${tone === "void" ? "plate--void" : ""} ${className}`.trim()}
    >
      {backdrop}
      <div className="plate-inner">{children}</div>
    </section>
  );
}

/** The plate number and its rule. */
export function PlateNo({ n, title }: { n: string; title: string }) {
  return (
    <p className="plate-no">
      <b>Plate {n}</b>
      <span>{title}</span>
    </p>
  );
}

/**
 * A figure that draws itself.
 *
 * Every stroked child is measured with `getTotalLength()` and given its own
 * dash length, so a long outline and a short tick take the same time to draw
 * instead of the tick snapping into place. Falls back to simply appearing if
 * the geometry cannot be measured.
 */
export function Figure({
  children,
  caption,
  className = "",
}: {
  children: ReactNode;
  caption?: { ref: string; text: string };
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>("-18% 0px");

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.querySelectorAll<SVGGeometryElement>("path, rect, circle, ellipse").forEach((el) => {
      const fill = el.getAttribute("fill");
      if (fill && fill !== "none") return;
      let len = 0;
      try {
        len = el.getTotalLength();
      } catch {
        return;
      }
      if (!len) return;
      // Stagger by position down the drawing, so it is laid down roughly the
      // way a hand would lay it down: top to bottom.
      el.style.setProperty("--len", String(Math.ceil(len)));
      el.style.animationDuration = `${Math.min(2.2, 0.5 + len / 900)}s`;
    });
  }, [ref]);

  return (
    <div
      ref={ref}
      className={`figure ${inView ? "is-drawn" : ""} ${className}`.trim()}
    >
      {children}
      {caption && (
        <p className="figure-cap">
          <b>{caption.ref}</b>
          <span>{caption.text}</span>
        </p>
      )}
    </div>
  );
}
