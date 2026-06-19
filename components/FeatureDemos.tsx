"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MicIcon } from "./icons";

/**
 * Small live elements that live inside the Features bento tiles — they're what
 * make the grid feel built, not generated. All respect prefers-reduced-motion.
 */

// Command Mode: a casual draft gets reshaped by a spoken command. Loops.
export function CommandModeDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0 draft · 1 listening · 2 polished

  useEffect(() => {
    if (reduce) {
      setPhase(2);
      return;
    }
    const hold = [2000, 1500, 3000][phase];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 3), hold);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const draft = "hey send me the deck when you get a sec";
  const polished = "Hi — could you send the deck when you have a moment?";

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-base-900/60 p-3">
      <div className="min-h-[3.25rem] text-[13px] leading-relaxed">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={phase === 2 ? "polished" : "draft"}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className={phase === 2 ? "text-white" : "text-white/45"}
          >
            {phase === 2 ? polished : draft}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-all duration-300 ${
            phase >= 1
              ? "bg-accent/15 text-accent-300 ring-accent/30"
              : "bg-white/[0.04] text-white/35 ring-white/10"
          }`}
        >
          <MicIcon className="h-3 w-3" />
          “make this more formal”
        </span>
        {phase === 1 && !reduce && (
          <span className="text-[11px] text-white/35">listening…</span>
        )}
      </div>
    </div>
  );
}

// Languages: one greeting, cycled across scripts. Loops.
const greetings = [
  { t: "Hello", l: "English" },
  { t: "Hola", l: "Español" },
  { t: "こんにちは", l: "日本語" },
  { t: "Bonjour", l: "Français" },
  { t: "नमस्ते", l: "हिन्दी" },
  { t: "你好", l: "中文" },
];

export function LanguageCycle() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % greetings.length), 1700);
    return () => clearInterval(t);
  }, [reduce]);

  const g = greetings[i];
  return (
    <div className="mt-4 flex items-baseline gap-2.5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={g.t}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-semibold tracking-tight text-white"
        >
          {g.t}
        </motion.span>
      </AnimatePresence>
      <span className="text-xs text-white/40">{g.l}</span>
    </div>
  );
}
