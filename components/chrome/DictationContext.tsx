"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useReducedMotion } from "framer-motion";
import { dictationTakes } from "@/lib/content";

/**
 * The one dictation clock the whole page runs on.
 *
 * The demo used to live entirely inside the hero's capture panel, which was
 * fine while the notch was also drawn there. Now the notch hangs in the top
 * bezel — outside the page, in the chrome — and the panel stays in the hero, so
 * two separate components have to depict the same moment. Two loops would
 * drift within seconds and the band would claim "Delivered" over a line still
 * being spoken.
 *
 * So the take, the character count and the phase are owned here and read from
 * both places. This is the web port of `NotchActivity`: the app has exactly one
 * activity state and every surface renders it, rather than each surface keeping
 * its own idea of what the machine is doing.
 */

export type DictationPhase = "speaking" | "thinking" | "written" | "resting";

type State = { take: number; chars: number; phase: DictationPhase };

/** Milliseconds per spoken character — roughly a natural 160 wpm. */
const CHAR_MS = 42;
const THINK_MS = 620;
const HOLD_MS = 2600;
/**
 * The gap between takes, and the reason it exists: this is the only stretch
 * where the band is closed, so it is the only stretch where the thing at the
 * top of the screen reads as a *notch* rather than as a widget. Cut it and the
 * bezel just has a permanent black pill in it.
 */
const REST_MS = 1500;

function reducer(
  state: State,
  action: { type: "chars"; n: number } | { type: "settle" | "write" | "rest" | "next" }
): State {
  switch (action.type) {
    case "chars":
      return state.chars === action.n ? state : { ...state, chars: action.n };
    case "settle":
      return { ...state, phase: "thinking" };
    case "write":
      return { ...state, phase: "written" };
    case "rest":
      return { ...state, phase: "resting" };
    case "next":
      return {
        take: (state.take + 1) % dictationTakes.length,
        chars: 0,
        phase: "speaking",
      };
  }
}

export type Dictation = {
  phase: DictationPhase;
  /** The take being spoken now. */
  take: (typeof dictationTakes)[number];
  /** What has been heard so far — the full line under reduced motion. */
  heard: string;
  /**
   * What is on the page as written text. The previous take's result stays up
   * while the next one is being spoken, so the output column is never blank.
   */
  shown: string;
  /** True once this take's own result is the one being shown. */
  written: boolean;
  /** The band's word, from `NotchActivity.label`. */
  label: string;
  /** Is the band open? Closed between takes — see `REST_MS`. */
  live: boolean;
  reduced: boolean;
};

const Ctx = createContext<Dictation | null>(null);

export function useDictation() {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useDictation must be used inside <DictationProvider>");
  }
  return value;
}

export default function DictationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, {
    take: 0,
    chars: 0,
    phase: "speaking" as DictationPhase,
  });

  /**
   * The loop used to pause on the capture panel leaving the viewport. It can't
   * any more — the notch is fixed to the bezel and is on screen the whole way
   * down the page. The tab being hidden is the honest version of that check,
   * and it is the one that actually saves the work.
   */
  const awakeRef = useRef(true);
  useEffect(() => {
    const read = () => {
      awakeRef.current = document.visibilityState === "visible";
    };
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);

  const take = dictationTakes[state.take];

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
      if (awakeRef.current) {
        const n = Math.min(total, Math.floor((now - start) / CHAR_MS));
        dispatch({ type: "chars", n });
        if (n >= total) {
          raf = 0;
          window.setTimeout(() => dispatch({ type: "settle" }), 420);
          return;
        }
      } else {
        // Backgrounded: hold the clock rather than racing ahead while hidden.
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
    const next =
      state.phase === "thinking" ? "write" : state.phase === "written" ? "rest" : "next";
    const ms =
      state.phase === "thinking" ? THINK_MS : state.phase === "written" ? HOLD_MS : REST_MS;
    const id = window.setTimeout(() => dispatch({ type: next }), ms);
    return () => window.clearTimeout(id);
  }, [state.phase, reduce]);

  const value = useMemo<Dictation>(() => {
    const settled = state.phase === "written" || state.phase === "resting";
    const written = reduce || settled;
    return {
      phase: state.phase,
      take,
      heard: reduce ? take.said : take.said.slice(0, state.chars),
      shown: written
        ? take.wrote
        : dictationTakes[(state.take + dictationTakes.length - 1) % dictationTakes.length]
            .wrote,
      written,
      label: reduce
        ? // Nothing is being spoken under reduced motion — the take is simply
          // already finished, so the band must not claim to be listening.
          "Delivered"
        : state.phase === "thinking"
          ? "Polishing"
          : state.phase === "written"
            ? "Delivered"
            : "Dictating",
      // Under reduced motion the band stays open on its finished state rather
      // than opening and closing on a timer nobody asked for.
      live: reduce ? true : state.phase !== "resting",
      reduced: !!reduce,
    };
  }, [state.phase, state.take, state.chars, take, reduce]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
