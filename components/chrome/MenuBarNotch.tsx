"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { useDictation } from "./DictationContext";

/**
 * The notch, where the notch actually is.
 *
 * The band used to be drawn inside the hero, hanging off a hairline that stood
 * in for the top of a display. That was a *picture* of the product's chrome
 * sitting in the middle of a page. Here the browser viewport is the display, so
 * the band hangs off the real top edge, dead centre, with the wordmark and the
 * contents index either side of it — which is the arrangement a Mac menu bar
 * has, and the arrangement Whisper Master lives in.
 *
 * Two things follow from that, and both are load-bearing:
 *
 *   - **The housing never moves.** It is a hole in a machine, not a widget. The
 *     wings grow outward from it, symmetrically, so the black shape stays
 *     pinned to the centre of the screen through every state.
 *   - **The band closes between takes.** A pill that is always open is a badge;
 *     a shape that opens when there is something to say and closes when there
 *     isn't is a notch. See `REST_MS` in DictationContext.
 *
 * Geometry and colour are ported from `NotchShape.swift` / `Theme.Notch` — the
 * concave top corners flare out to full width at the bezel, and the fill is ink
 * in every appearance, because it sits on the bezel rather than on the page.
 */
export default function MenuBarNotch() {
  const { label, live, phase, reduced } = useDictation();
  const orbState: OrbState =
    phase === "speaking"
      ? "listening"
      : phase === "thinking"
        ? "working"
        : "solving";

  return (
    <div className="runhead-notch">
      <div className="screen-band" data-live={live} aria-hidden="true">
        {/* The state word owns the left wing. */}
        <span className="screen-wing screen-wing--l">
          <span>{label}</span>
        </span>

        {/* The housing. The band moulds around it; nothing renders behind. */}
        <span className="screen-housing">
          <i className="screen-lens" />
        </span>

        {/* Your level owns the right wing — ember, because it is your voice, and
            only while the machine is actually hearing it. The animation is the
            same Thinking Orbs renderer used by the Mac app. */}
        <span className="screen-wing screen-wing--r">
          <ThinkingOrb
            state={orbState}
            size={20}
            theme="dark"
            paused={!live || reduced}
            aria-hidden="true"
          />
        </span>
      </div>

      {/* The band is decorative; this is the part a screen reader gets. */}
      <span className="sr-only" aria-live="polite">
        {live ? `Whisper Master: ${label}` : ""}
      </span>
    </div>
  );
}
