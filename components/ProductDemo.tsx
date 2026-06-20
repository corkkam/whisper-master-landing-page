"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { MicIcon, CheckIcon } from "./icons";

/**
 * The hero's concrete product mockup — shows the actual value in one glance:
 * your rambly spoken line on top, Whispr's polished output below, dropped into
 * a real app. Cycles through examples; the output types in for a live feel.
 */
const examples = [
  {
    raw: "hey can you send me the deck when you get a sec",
    polished: "Hi — could you send me the deck when you have a moment?",
    app: "#general · Slack",
  },
  {
    raw: "move the investor call to thursday at 2 and loop in priya",
    polished: "Let's move the investor call to Thursday at 2 PM — I'll loop in Priya.",
    app: "Reply · Gmail",
  },
  {
    raw: "parser breaks on empty input add a guard clause and a test",
    polished: "The parser breaks on empty input. Add a guard clause and a unit test.",
    app: "Comment · GitHub",
  },
];

const BARS = [
  0.4, 0.7, 1, 0.55, 0.85, 0.35, 0.95, 0.6, 0.45, 0.8, 1, 0.5, 0.7, 0.3, 0.9,
  0.55, 0.75, 0.4, 1, 0.65, 0.5, 0.85, 0.35, 0.7,
];

type Phase = "listening" | "writing" | "done";

export default function ProductDemo() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduce ? "done" : "listening");
  const [words, setWords] = useState(reduce ? 999 : 0);

  const ex = examples[idx];
  const polishedWords = useMemo(() => ex.polished.split(" "), [ex]);

  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (phase === "listening") {
      timers.push(setTimeout(() => setPhase("writing"), 2200));
    } else if (phase === "writing") {
      if (words < polishedWords.length) {
        timers.push(setTimeout(() => setWords((w) => w + 1), 95));
      } else {
        timers.push(setTimeout(() => setPhase("done"), 250));
      }
    } else {
      timers.push(
        setTimeout(() => {
          setIdx((i) => (i + 1) % examples.length);
          setWords(0);
          setPhase("listening");
        }, 2700)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [phase, words, reduce, polishedWords.length]);

  const listening = phase === "listening";
  const writing = phase === "writing";
  const done = phase === "done" || reduce;
  const shownPolished = reduce
    ? ex.polished
    : polishedWords.slice(0, words).join(" ");

  return (
    <div className="glass relative w-full overflow-hidden rounded-2xl p-1.5 shadow-glass">
      <div className="rounded-xl bg-base-800/80 ring-1 ring-white/[0.04]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
          </span>
          <span className="ml-2 text-xs font-semibold tracking-tight text-white/70">
            Whispr
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent-300 ring-1 ring-accent/25">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-accent-300 ${
                listening ? "animate-pulse" : ""
              }`}
            />
            On-device
          </span>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {/* INPUT — what you said */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-white/35">
              You said
            </span>
            <span className="flex items-center gap-2 text-[11px] text-white/35">
              {listening ? "Listening…" : "Captured"}
              <MicIcon
                className={`h-3.5 w-3.5 ${
                  listening ? "text-accent-300" : "text-white/35"
                }`}
              />
            </span>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-white/45 sm:text-base">
            “{ex.raw}”
          </p>

          {/* mini waveform */}
          <div className="mt-3 flex h-6 items-center gap-[3px]" aria-hidden>
            {BARS.map((h, i) => (
              <span
                key={i}
                className="w-full max-w-[5px] flex-1 rounded-full bg-gradient-to-t from-accent/40 to-accent-300/80"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  transformOrigin: "center",
                  animation: listening
                    ? `waveform ${0.9 + (i % 5) * 0.12}s ease-in-out ${
                        (i % 7) * 0.08
                      }s infinite`
                    : "none",
                  opacity: listening ? 1 : 0.25,
                  transform: listening ? undefined : `scaleY(${h})`,
                }}
              />
            ))}
          </div>

          {/* transform divider */}
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/55">
              <DownArrow />
              Whispr cleans it up
            </span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* OUTPUT — what Whispr wrote */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-accent-300">
              Whispr wrote
            </span>
          </div>
          <div className="mt-2 min-h-[3.25rem]">
            <p className="text-[15px] leading-relaxed text-white sm:text-base">
              {shownPolished}
              {writing && (
                <span
                  className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-accent-300 align-middle motion-safe:animate-blink"
                  aria-hidden
                />
              )}
            </p>
          </div>

          {/* inserted-into chip */}
          <div className="mt-4 h-7">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-[11.5px] font-medium text-accent-300 ring-1 ring-accent/20 transition-all duration-500 ${
                done ? "opacity-100" : "translate-y-1 opacity-0"
              }`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Inserted into {ex.app}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownArrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
