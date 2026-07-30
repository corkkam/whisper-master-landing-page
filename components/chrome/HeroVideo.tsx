"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The dictation loop, playing in the hero's right flank: a real MacBook, framed
 * on its notch, with the ember-lit orb alive in the band's right wing.
 *
 * Composition, in one line: **the notch stays sharp on the right, everything
 * left of it goes soft so the headline keeps its contrast.** The blur is a
 * separate masked pane (`.hero-video-veil`) rather than a `filter` on the video,
 * so the falloff is a gradient across the hero — sharp at the trailing edge
 * where the machine and its one light source are, progressively out of focus
 * under the type. It doubles as the depth-of-field the shot already has.
 *
 * `HeroAppBackdrop` — the DOM replica of this same row — fades out while this
 * plays (see `.hero:has(.hero-video[data-ready])` in `globals.css`). Two notch
 * bands would depict a state the app can't be in; the replica is the fallback.
 *
 * Nothing in `Hero`'s text layer moves for this: the video and the veil are
 * absolutely positioned behind `.hero-inner` (`z-index: 1`), so the eyebrow,
 * the name, the tagline and the actions render exactly where they did.
 *
 * Degrades to the existing `HeroAppBackdrop` in three cases — reduced motion,
 * a missing asset, and a decode failure — by simply not painting. It only fades
 * in once the file is actually playable, so a hero without the asset present
 * looks like the hero did before, not like a broken frame.
 */
export default function HeroVideo({ onReady }: { onReady?: (ready: boolean) => void }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Report upward so the hero can retire the DOM replica of this same row.
  // Reported from an effect, not the event handler, so a later failure (autoplay
  // refused after `canplay`) walks the flag back and the replica returns.
  useEffect(() => {
    onReady?.(ready && !failed && !reduce);
  }, [ready, failed, reduce, onReady]);

  // Autoplay can be refused (Low Power Mode, background tab on load) after the
  // element has already reported itself playable. Ask once, and treat a refusal
  // as "don't paint" rather than showing a frozen first frame.
  useEffect(() => {
    if (reduce || failed) return;
    const el = ref.current;
    if (!el) return;
    el.play().catch(() => setFailed(true));
  }, [reduce, failed, ready]);

  if (reduce || failed) return null;

  return (
    <div className="hero-video" data-ready={ready || undefined} aria-hidden="true">
      <video
        ref={ref}
        // Decorative loop, so: no controls, no sound, never fullscreen on iOS.
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        onCanPlay={() => setReady(true)}
        onError={() => setFailed(true)}
      >
        <source src="/hero/orb-dictation.webm" type="video/webm" />
        <source src="/hero/orb-dictation.mp4" type="video/mp4" />
      </video>

      {/* The soft field. Blurs whatever is behind it — video, glow, grain — and
          releases toward the right so the orb reads at full clarity. */}
      <i className="hero-video-veil" />
    </div>
  );
}
