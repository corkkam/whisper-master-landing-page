"use client";

import { useEffect, useReducer, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { dictationTakes } from "@/lib/content";

type Phase = "speaking" | "thinking" | "written" | "resting";

type State = { take: number; chars: number; phase: Phase };

/**
 * The orb state each phase is actually in. `solving` for the clean-up pass
 * because that is what it depicts — bands scrambling and clicking back — and
 * `listening` holds through `written`, where the orb is frozen anyway.
 */
const ORB_FOR_PHASE: Record<Phase, OrbState> = {
  speaking: "listening",
  thinking: "solving",
  written: "listening",
  resting: "listening",
};

/** Milliseconds per spoken character — roughly a natural 160 wpm. */
const CHAR_MS = 42;
const THINK_MS = 620;
const HOLD_MS = 2600;

function reducer(state: State, action: "tick" | "settle" | "write" | "next"): State {
  switch (action) {
    case "tick":
      return { ...state, chars: state.chars + 1 };
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
export default function LiveDictation() {
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
    if (reduce) return;

    let id: number;

    if (state.phase === "speaking") {
      if (state.chars < take.said.length) {
        // Pause a little longer on spaces — it reads as breathing, not typing.
        const isSpace = take.said[state.chars] === " ";
        id = window.setTimeout(
          () => visibleRef.current && dispatch("tick"),
          CHAR_MS + (isSpace ? 55 : 0)
        );
      } else {
        id = window.setTimeout(() => dispatch("settle"), 420);
      }
    } else if (state.phase === "thinking") {
      id = window.setTimeout(() => dispatch("write"), THINK_MS);
    } else {
      id = window.setTimeout(() => dispatch("next"), HOLD_MS);
    }

    return () => window.clearTimeout(id);
  }, [state.phase, state.chars, take.said, reduce]);

  const written = reduce || state.phase === "written";
  const heard = reduce ? take.said : take.said.slice(0, state.chars);

  return (
    <div className="capture" ref={hostRef}>
      <div className="capture-bar">
        <span className="capture-mark">
          {/* The glyph and the word are the same claim, so the orb is driven by
              the phase rather than picked once: hearing you, working it out, then
              frozen when there is nothing left to do. */}
          <ThinkingOrb
            className="capture-orb"
            state={ORB_FOR_PHASE[state.phase]}
            size={20}
            theme="dark"
            paused={written}
            aria-hidden="true"
          />
          {written ? "written" : state.phase === "thinking" ? "cleaning" : "listening"}
        </span>
        <Meter live={!written && !reduce} />
        <span className="capture-shows">{take.shows}</span>
      </div>

      <div className="capture-body">
        <div className="capture-row">
          <span className="capture-tag">You say</span>
          <p className="capture-said">
            {heard}
            {!written && <i className="caret" aria-hidden="true" />}
          </p>
        </div>

        <div className={`capture-row capture-row--out ${written ? "is-in" : ""}`}>
          <span className="capture-tag capture-tag--out">It writes</span>
          <p className="capture-wrote" aria-live="polite">
            {written ? take.wrote : ""}
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
