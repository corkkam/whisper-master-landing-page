"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The notch band, as the app actually draws it.
 *
 * This is a replica, not an impression — every value here is read from
 * `Sources/WhisperMaster/UI/`:
 *
 *   - `NotchShape.swift` — the top corners are *concave*, flaring outward to
 *     full width at the bezel, so the band looks moulded out of the notch
 *     rather than stuck under it. That curve is the whole silhouette.
 *   - `NotchActivity.swift` — the state list, the label each one shows, which
 *     accent it lights in, and how strongly.
 *   - `Theme.Notch` — the band is always ink (#07090e) in every appearance,
 *     because it sits on the physical bezel. That is why this dark object is
 *     legitimate on a light site.
 *
 * The accent assignment is the system's load-bearing rule and is not a styling
 * choice: **listening is the one ember state** — that is your voice, live — and
 * every state where the machine is working or has settled the words is signal.
 */
export type NotchState =
  | "idle"
  | "preparing"
  | "listening"
  | "transcribing"
  | "polished"
  | "delivered";

/** Label, accent and glow strength per state, from `NotchActivity`. */
const STATES: Record<
  NotchState,
  { label: string; accent: "ember" | "signal" | null; glow: number }
> = {
  idle: { label: "", accent: null, glow: 0 },
  preparing: { label: "Getting ready", accent: "signal", glow: 0.1 },
  // The brightest, because it is the one state that means you are being heard.
  listening: { label: "Dictating", accent: "ember", glow: 0.22 },
  transcribing: { label: "Transcribing", accent: "signal", glow: 0.14 },
  polished: { label: "Polished", accent: "signal", glow: 0.16 },
  delivered: { label: "Delivered", accent: "signal", glow: 0.18 },
};

const ACCENT = { ember: "#ff6a3d", signal: "#6ee7df" } as const;

export function Notch({ state }: { state: NotchState }) {
  const spec = STATES[state];
  const tint = spec.accent ? ACCENT[spec.accent] : null;

  return (
    <div className="notch" data-state={state}>
      <svg className="notch-body" viewBox="0 0 420 44" preserveAspectRatio="none" aria-hidden="true">
        {/* The concave flare, ported from NotchShape.path(in:). */}
        <path
          d="M0 0 Q12 0 12 12 L12 28 Q12 44 28 44 L392 44 Q408 44 408 28 L408 12 Q408 0 420 0 Z"
          fill="var(--notch)"
        />
      </svg>

      {/* One light source at the trailing edge, behind the orb — never a
          coloured border, per §4. Ember over black goes brown fast, so these
          strengths stay low. */}
      {tint && (
        <span
          className="notch-bloom"
          aria-hidden="true"
          style={{
            background: `radial-gradient(60% 140% at 88% 100%, ${tint}, transparent 70%)`,
            opacity: spec.glow,
          }}
        />
      )}

      <div className="notch-row">
        <span className="notch-label">{spec.label}</span>
        {state === "listening" && <NotchWave />}
        {(state === "delivered" || state === "polished") && (
          <svg className="notch-tick" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 8.5l3.5 3.5L13 5"
              fill="none"
              stroke={ACCENT.signal}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * The live level meter.
 *
 * Ember, because it is your voice. The bars are driven from a single rAF loop
 * rather than CSS keyframes so this is the *only* moving thing while it runs —
 * and it exists solely during `listening`, which is the app's rule: motion means
 * you are live, and it must not be spent anywhere else.
 */
function NotchWave() {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [bars, setBars] = useState<number[]>(() => Array(14).fill(0.2));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.08;
      setBars(
        Array.from({ length: 14 }, (_, i) => {
          // Two out-of-phase waves so it reads as speech rather than a sweep.
          const a = Math.sin(t + i * 0.55);
          const b = Math.sin(t * 0.6 + i * 0.9);
          return 0.18 + Math.abs(a * 0.55 + b * 0.35) * 0.7;
        })
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="notch-wave" ref={ref} aria-hidden="true">
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${Math.min(1, h) * 100}%` }} />
      ))}
    </span>
  );
}
