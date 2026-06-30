"use client";

import { PointerEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const waveform = [
  12, 18, 8, 27, 18, 38, 23, 54, 34, 62, 48, 75, 42, 58, 32, 70, 51, 82,
  58, 72, 45, 63, 38, 52, 29, 61, 37, 46, 24, 39, 18, 28, 14, 21, 10,
];

const demoMoments = [
  {
    app: "Notes",
    meta: "FRIDAY, 9:41 AM",
    text: "Let's move the launch review to Tuesday morning so everyone has time to test the new onboarding flow.",
    cleanup: "Removed 3 filler words · Fixed punctuation",
  },
  {
    app: "Slack",
    meta: "TEAM UPDATE",
    text: "Quick update — the new recording flow is live. Try it today and drop anything strange in the feedback channel.",
    cleanup: "Matched your team tone · Added structure",
  },
  {
    app: "Mail",
    meta: "DRAFT REPLY",
    text: "Thanks for the thoughtful notes. We've addressed the main concerns and I'll send a revised proposal before noon.",
    cleanup: "Made concise · Adjusted tone",
  },
] as const;

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5c.5 4.7 2.8 7 7.5 7.5-4.7.5-7 2.8-7.5 7.5-.5-4.7-2.8-7-7.5-7.5 4.7-.5 7-2.8 7.5-7.5Z" />
      <path d="M19 16.5c.2 2 1.2 3 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3Z" />
    </svg>
  );
}

export default function VoiceDemo() {
  const reduceMotion = useReducedMotion();
  const [momentIndex, setMomentIndex] = useState(0);
  const activeMoment = demoMoments[momentIndex];

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setMomentIndex((i) => (i + 1) % demoMoments.length);
    }, 5600);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  function tiltDemo(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || e.pointerType === "touch") return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    e.currentTarget.style.setProperty("--demo-rotate-y", `${x * 3}deg`);
    e.currentTarget.style.setProperty("--demo-rotate-x", `${y * -2.2}deg`);
  }

  function resetTilt(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty("--demo-rotate-y", "0deg");
    e.currentTarget.style.setProperty("--demo-rotate-x", "0deg");
  }

  return (
    <motion.div
      className="demo-stage"
      initial={reduceMotion ? false : { opacity: 0, y: 28, rotateX: 3 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={tiltDemo}
      onPointerLeave={resetTilt}
    >
      <div className="sound-ripples" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className="demo-shell">
        <div className="demo-sheen" aria-hidden="true" />

        {/* Window chrome */}
        <div className="demo-topbar">
          <div className="traffic" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              className="demo-title"
              key={activeMoment.app}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28 }}
            >
              {activeMoment.app}
            </motion.div>
          </AnimatePresence>
          <div className="privacy-pill">
            <span />
            ON DEVICE
          </div>
        </div>

        {/* Content area */}
        <div className="demo-body">
          <div className="doc-meta">
            <AnimatePresence mode="wait">
              <motion.span
                key={activeMoment.meta}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {activeMoment.meta}
              </motion.span>
            </AnimatePresence>
            <span>{activeMoment.app.toUpperCase()}</span>
          </div>

          <div className="dictated-copy" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeMoment.text}
                initial={reduceMotion ? false : { opacity: 0, filter: "blur(5px)", y: 8 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(5px)", y: -8 }}
                transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeMoment.text}
                <span className="caret" aria-hidden="true" />
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="suggestion">
            <span className="suggestion-icon">
              <SparkIcon />
            </span>
            <div>
              <small>WHISPR CLEANUP</small>
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeMoment.cleanup}
                  initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {activeMoment.cleanup}
                </motion.p>
              </AnimatePresence>
            </div>
            <button aria-label="Accept cleanup suggestion">Accept</button>
          </div>
        </div>

        {/* Recording dock */}
        <div className="voice-dock">
          <div className="record-dot" aria-hidden="true" />
          <div className="waveform" aria-label="Voice is being captured">
            {waveform.map((height, i) => (
              <i
                key={i}
                style={
                  {
                    "--bar-height": `${height}%`,
                    "--delay": `${i * -0.045}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="timer">LIVE</div>
          <kbd>⌥ Space</kbd>
        </div>
      </div>
    </motion.div>
  );
}
