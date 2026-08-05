"use client";

import { useEffect, useReducer, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { dictationTakes } from "@/lib/content";

type Phase = "speaking" | "thinking" | "written" | "resting";

type State = { take: number; chars: number; phase: Phase };

/** Milliseconds per spoken character — roughly a natural 160 wpm. */
const CHAR_MS = 42;
const THINK_MS = 620;
const HOLD_MS = 2600;

function reducer(
  state: State,
  action: { type: "chars"; n: number } | { type: "settle" | "write" | "next" }
): State {
  switch (action.type) {
    case "chars":
      return state.chars === action.n ? state : { ...state, chars: action.n };
    case "settle":
      return { ...state, phase: "thinking" };
    case "write":
      return { ...state, phase: "written" };
    case "next":
      return {
        take: (state.take + 1) % dictationTakes.length,
        chars: 0,
        phase: "speaking",
      };
  }
}

/**
 * The hero's proof: a faux capture window that speaks a messy line, pauses, and
 * replaces it with the cleaned result. Runs on a loop, pauses when scrolled out
 * of view, and shows the finished state immediately under reduced motion.
 */
export default function LiveDictation({
  onPhase,
}: {
  /**
   * Reports each phase change to the hero, which drives the notch replica and
   * the pond's ripple from it. The demo stays the single source of truth for
   * what the product is doing, so the band, the water and the panel can never
   * disagree — the same reason `NotchActivity` exists in the app.
   */
  onPhase?: (phase: Phase) => void;
} = {}) {
  const reduce = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, {
    take: 0,
    chars: 0,
    phase: "speaking" as Phase,
  });
  const hostRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(true);

  // Don't burn a timer loop while the panel is off screen.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.15 }
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  const take = dictationTakes[state.take];

  useEffect(() => {
    onPhase?.(state.phase);
  }, [state.phase, onPhase]);

  /**
   * The speaking pass runs off the clock inside one rAF rather than a chain of
   * `setTimeout`s, one per character. A timeout chain accumulates every late
   * frame — the line visibly stutters and the whole take drifts long. Reading
   * elapsed time each frame is self-correcting: a dropped frame costs nothing
   * because the next one computes the right character count regardless.
   */
  useEffect(() => {
    if (reduce) return;
    if (state.phase !== "speaking") return;

    let raf = 0;
    let start = 0;
    const total = take.said.length;

    const step = (now: number) => {
      if (!start) start = now;
      if (visibleRef.current) {
        const n = Math.min(total, Math.floor((now - start) / CHAR_MS));
        dispatch({ type: "chars", n });
        if (n >= total) {
          raf = 0;
          window.setTimeout(() => dispatch({ type: "settle" }), 420);
          return;
        }
      } else {
        // Off screen: hold the clock rather than racing ahead while hidden.
        start += 16;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [state.phase, state.take, take.said.length, reduce]);

  useEffect(() => {
    if (reduce) return;
    if (state.phase === "speaking") return;
    const id = window.setTimeout(
      () => dispatch({ type: state.phase === "thinking" ? "write" : "next" }),
      state.phase === "thinking" ? THINK_MS : HOLD_MS
    );
    return () => window.clearTimeout(id);
  }, [state.phase, reduce]);

  const written = reduce || state.phase === "written";
  /**
   * The previous take's result stays on the page while the next one is being
   * spoken. Clearing it left the right-hand column blank for most of every
   * cycle, which is what made the panel read as a large empty box.
   */
  const shown = written
    ? take.wrote
    : dictationTakes[(state.take + dictationTakes.length - 1) % dictationTakes.length].wrote;
  const heard = reduce ? take.said : take.said.slice(0, state.chars);

  return (
    <div className="capture" ref={hostRef}>
      {/* The top edge of the screen, with the band hanging off it exactly as
          the app draws it: the camera housing centred, the state word in the
          left wing, your level in the right. See `.screen-edge` in globals. */}
      <div className="screen-edge">
        <div className="screen-band">
          <span className="screen-wing screen-wing--l">
            {written ? "Delivered" : state.phase === "thinking" ? "Polishing" : "Dictating"}
          </span>
          {/* The housing. The band moulds around it; nothing renders behind. */}
          <span className="screen-housing" aria-hidden="true">
            <i className="screen-lens" />
          </span>
          <span className="screen-wing screen-wing--r">
            <Meter live={!written && !reduce} />
          </span>
        </div>
      </div>

      <div className="capture-body">
        <div className="capture-row">
          <span className="capture-tag">You say</span>
          <p className="capture-said">
            {heard}
            {!written && <i className="caret" aria-hidden="true" />}
          </p>
        </div>

        <div className="capture-row capture-row--out is-in" data-fresh={written || undefined}>
          <span className="capture-tag capture-tag--out">It writes</span>
          <p className="capture-wrote" aria-live="polite">
            {shown}
          </p>
        </div>
      </div>

    </div>
  );
}

/** Twelve bars on staggered CSS delays — cheaper and calmer than sampling audio. */
function Meter({ live }: { live: boolean }) {
  return (
    <span className={`meter ${live ? "is-live" : ""}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i % 6) * 0.11}s` }} />
      ))}
    </span>
  );
}
