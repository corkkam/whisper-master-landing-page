"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * An illustrated plate, animated.
 *
 * The app's §6 is explicit that nothing in this system animates perpetually —
 * the single breathing element is the record dot, where the breath *means* "you
 * are live". A pond shimmering forever would spend that meaning a second time
 * and turn the art into a screensaver.
 *
 * So the water here never moves on its own. It moves in response, and only in
 * three ways:
 *
 *   1. **Parallax** — the plate drifts against the scroll. Responds to the
 *      reader, so it cannot read as ambience.
 *   2. **Settle** — it arrives once, on the house curve, when it enters view.
 *   3. **Ripple** — a ring crosses the water when the dictation demo changes
 *      state, in that state's own accent. Ember while you are speaking, signal
 *      when the machine has settled the words. That makes the illustration a
 *      readout of the product rather than a backdrop behind it.
 *
 * The displacement filter that warps the water is driven by the same events, so
 * the surface distorts as the ring passes and is perfectly still otherwise.
 */
export function Pond({
  src,
  alt,
  priority = false,
  /** Parallax travel in px across the whole scroll of the section. */
  drift = 60,
  /** Fires a ripple each time this value changes. `null` never ripples. */
  pulse = null,
  /** Which accent the ripple takes. */
  tone = "ember",
  className = "",
  children,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  drift?: number;
  pulse?: string | null;
  tone?: "ember" | "signal";
  className?: string;
  children?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const [settled, setSettled] = useState(false);
  // Until the artwork is dropped in, the plate renders as bare paper rather
  // than as a broken image. Removing this is safe once every file is present.
  const [missing, setMissing] = useState(false);
  const [rings, setRings] = useState<{ id: number; tone: string }[]>([]);
  const ringId = useRef(0);

  // Arrival.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSettled(true);
          io.disconnect();
        }
      },
      { rootMargin: "-10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Parallax. rAF-gated and only while the plate is on screen, so a long page
  // is not paying for six of these at once.
  useEffect(() => {
    const host = hostRef.current;
    const art = artRef.current;
    if (!host || !art || !drift) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let live = false;

    const apply = () => {
      const r = host.getBoundingClientRect();
      // -1 above the fold to +1 below it.
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      art.style.transform = `translate3d(0, ${(-p * drift).toFixed(2)}px, 0) scale(1.08)`;
      raf = live ? requestAnimationFrame(apply) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !live) {
        live = true;
        raf = requestAnimationFrame(apply);
      } else if (!e.isIntersecting) {
        live = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(host);
    return () => {
      io.disconnect();
      live = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [drift]);

  // Ripple on state change.
  useEffect(() => {
    if (!pulse) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = ringId.current++;
    setRings((r) => [...r, { id, tone }]);
    const t = window.setTimeout(
      () => setRings((r) => r.filter((x) => x.id !== id)),
      2600
    );
    return () => window.clearTimeout(t);
  }, [pulse, tone]);

  return (
    <div
      ref={hostRef}
      className={`pond ${settled ? "is-settled" : ""} ${className}`.trim()}
      data-missing={missing || undefined}
    >
      {!missing && (
        <div ref={artRef} className="pond-art">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="100vw"
            className="pond-img"
            onError={() => setMissing(true)}
          />
        </div>
      )}

      {rings.map((r) => (
        <span key={r.id} className={`pond-ring pond-ring--${r.tone}`} aria-hidden="true" />
      ))}

      {children}
    </div>
  );
}
