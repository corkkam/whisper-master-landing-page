"use client";

import { useEffect, useRef, useState } from "react";

const SAMPLES = 88;
/** Half-width of the trace, in the SVG's own user units. */
const REACH = 15;

/**
 * The page's signature element: an oscilloscope trace pinned to the left edge
 * that behaves like a microphone level meter fed by *your scrolling*.
 *
 * Scroll fast and the trace goes turbulent; stop and it settles to a flat line.
 * The portion above the reading position is drawn in `--signal`, so the spine
 * also doubles as a progress indicator.
 *
 * Reads `window.scrollY` directly rather than subscribing to Lenis, so it works
 * identically with smoothing on, smoothing off, and reduced motion.
 */
export default function SignalSpine() {
  const pathRef = useRef<SVGPolylineElement | null>(null);
  const gradTopRef = useRef<SVGStopElement | null>(null);
  const gradBottomRef = useRef<SVGStopElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduce) return;

    // Fixed per-sample phases keep the trace stable frame to frame — without
    // this it reads as static noise rather than one continuous signal.
    const phases = Array.from({ length: SAMPLES }, (_, i) => i * 0.7 + Math.sin(i * 2.3) * 2);

    let raf = 0;
    let lastY = window.scrollY;
    let amp = 0; // smoothed 0..1 excitement level
    let t = 0;
    let lastProgress = -1;

    function frame() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      // Normalise per-frame delta into a 0..1 target; ~55px/frame saturates.
      const target = Math.min(1, Math.abs(y - lastY) / 55);
      lastY = y;

      // Rise fast (it should feel responsive), fall slow (it should settle).
      amp += (target - amp) * (target > amp ? 0.28 : 0.055);
      t += 0.055 + amp * 0.22;

      const points: string[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const yPos = (i / (SAMPLES - 1)) * 100;
        // Two detuned sines give a non-repeating envelope; the taper keeps the
        // trace pinned at both ends so it reads as a wire under tension.
        const taper = Math.sin((i / (SAMPLES - 1)) * Math.PI);
        const wobble =
          Math.sin(t + phases[i]) * 0.65 + Math.sin(t * 1.73 + phases[i] * 1.9) * 0.35;
        points.push(`${(16 + wobble * REACH * amp * taper).toFixed(2)},${yPos.toFixed(2)}`);
      }
      pathRef.current?.setAttribute("points", points.join(" "));

      if (progress !== lastProgress) {
        const pct = `${(progress * 100).toFixed(2)}%`;
        gradTopRef.current?.setAttribute("offset", pct);
        gradBottomRef.current?.setAttribute("offset", pct);
        if (readoutRef.current) {
          readoutRef.current.textContent = String(Math.round(progress * 100)).padStart(2, "0");
        }
        lastProgress = progress;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div className="spine" aria-hidden="true">
      <svg viewBox="0 0 32 100" preserveAspectRatio="none" className="spine-scope">
        <defs>
          {/* Hard two-stop gradient: traversed portion in signal, the rest dim.
              Both stops sit at the scroll progress offset, giving a crisp edge. */}
          <linearGradient id="spine-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--signal)" />
            <stop ref={gradTopRef} offset="0%" stopColor="var(--signal)" />
            <stop ref={gradBottomRef} offset="0%" stopColor="var(--spine-dim)" />
            <stop offset="100%" stopColor="var(--spine-dim)" />
          </linearGradient>
        </defs>
        <polyline
          ref={pathRef}
          points={reduce ? "16,0 16,100" : ""}
          fill="none"
          stroke="url(#spine-grad)"
          strokeWidth="0.9"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="spine-readout">
        <span ref={readoutRef}>00</span>
        <i />
      </div>
    </div>
  );
}
