"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { demoLines } from "@/lib/config";
import { MicIcon } from "./icons";

// Fixed bar heights so the waveform looks intentional, not random noise.
const BAR_HEIGHTS = [
  0.4, 0.7, 1, 0.55, 0.85, 0.35, 0.95, 0.6, 0.45, 0.8, 1, 0.5, 0.7, 0.3, 0.9,
  0.55, 0.75, 0.4, 1, 0.65, 0.5, 0.85, 0.35, 0.7, 0.95, 0.45, 0.6, 0.8,
];

export default function VoiceDemo() {
  const reduce = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [wordCount, setWordCount] = useState(reduce ? Infinity : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const words = useMemo(
    () => demoLines[lineIndex].split(" "),
    [lineIndex]
  );
  const done = wordCount >= words.length;

  // Word-by-word dictation loop. Disabled under prefers-reduced-motion.
  useEffect(() => {
    if (reduce) return;
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    if (!done) {
      const t = setTimeout(
        () => setWordCount((c) => c + 1),
        // first word lands a touch slower (feels like speech ramping up)
        wordCount === 0 ? 520 : 230
      );
      timers.current.push(t);
    } else {
      // Hold the finished sentence, then reset to the next line.
      const hold = setTimeout(() => {
        setWordCount(0);
        setLineIndex((i) => (i + 1) % demoLines.length);
      }, 2600);
      timers.current.push(hold);
    }
    return clearAll;
  }, [wordCount, done, reduce]);

  const recording = !reduce && !done;
  const shown = reduce ? words.join(" ") : words.slice(0, wordCount).join(" ");

  return (
    <div
      className="glass relative w-full overflow-hidden rounded-2xl p-1.5 shadow-glass"
      role="img"
      aria-label={`Whispr dictating into an app: "${demoLines[lineIndex]}"`}
    >
      <div className="rounded-xl bg-base-800/80 ring-1 ring-white/[0.04]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
          </span>
          <span className="ml-2 truncate text-xs font-medium text-white/40">
            #engineering — Slack
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent-300 ring-1 ring-accent/25">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-accent-300 ${
                recording ? "animate-pulse" : ""
              }`}
            />
            On-device
          </span>
        </div>

        {/* Dictation surface */}
        <div className="px-5 py-6">
          <div className="min-h-[5.5rem] sm:min-h-[5rem]">
            <p className="text-balance text-left text-[15px] leading-relaxed text-white/90 sm:text-base">
              {shown}
              {recording && (
                <span
                  className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-accent-300 align-middle motion-safe:animate-blink"
                  aria-hidden
                />
              )}
            </p>
          </div>

          {/* Mic + waveform footer */}
          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-300 ring-1 ring-accent/30">
              {recording && (
                <span
                  className="absolute inset-0 rounded-full bg-accent/40 motion-safe:animate-pulse-ring"
                  aria-hidden
                />
              )}
              <MicIcon className="relative h-4 w-4" />
            </span>

            <div
              className="flex h-8 flex-1 items-center gap-[3px]"
              aria-hidden
            >
              {BAR_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className="w-full max-w-[6px] flex-1 rounded-full bg-gradient-to-t from-accent/40 to-accent-300/90"
                  style={{
                    height: `${Math.round(h * 100)}%`,
                    transformOrigin: "center",
                    animation: recording
                      ? `waveform ${0.9 + (i % 5) * 0.12}s ease-in-out ${
                          (i % 7) * 0.08
                        }s infinite`
                      : "none",
                    opacity: recording ? 1 : 0.4,
                    transform: recording ? undefined : `scaleY(${h})`,
                  }}
                />
              ))}
            </div>

            <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/35">
              {recording ? "Listening…" : "Inserted ✓"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
