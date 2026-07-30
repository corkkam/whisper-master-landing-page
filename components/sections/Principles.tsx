"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { principles } from "@/lib/content";

/** Distance from camera to sphere centre, in sphere radii. */
const PERSPECTIVE = 2.9;
const GOLDEN = Math.PI * (1 + Math.sqrt(5));

/**
 * Principles orbiting a sphere.
 *
 * The words are real DOM text, billboarded to always face the viewer, and the
 * projection is computed in JS rather than handed to a CSS 3D transform. That is
 * the whole point: canvas-rendered or tangent-rotated text is what makes these
 * word spheres unreadable. Here the front-most words sit at full `--bone` (and
 * the leading one in `--ember`), while receding words dim on a fixed ramp — so
 * every word is legible and depth is still obvious.
 */
export default function Principles() {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [radius, setRadius] = useState(240);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // 0.32 keeps the widest phrase inside the box once perspective scaling is
      // applied to words sitting out at the equator.
      setRadius(Math.max(140, Math.min(width, height) * 0.32));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) return;

    const n = principles.length;
    // Even distribution over the sphere — avoids the clustering you get from
    // naive random or lat/long placement.
    const base = Array.from({ length: n }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN * i;
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    });

    let raf = 0;
    let ry = 0;
    let rx = -0.18;
    let visible = true;
    let hovered = false;

    const host = hostRef.current;
    const io = host
      ? new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 })
      : null;
    if (host && io) io.observe(host);

    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    host?.addEventListener("pointerenter", onEnter);
    host?.addEventListener("pointerleave", onLeave);

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      // Slow down on hover so a word can actually be read.
      ry += hovered ? 0.0012 : 0.0042;
      // Shallow tilt on purpose. A steeper one mixes z into the vertical axis,
      // which slides words out of their latitude band and into each other.
      rx = -0.07 + Math.sin(ry * 0.55) * 0.055;

      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      // Which word is nearest the camera — it gets the accent.
      let leadIndex = 0;
      let leadZ = -Infinity;
      const projected: { px: number; py: number; z: number; scale: number }[] = [];

      for (let i = 0; i < n; i++) {
        const p = base[i];
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = PERSPECTIVE / (PERSPECTIVE - z2);
        /**
         * Perspective is applied in full horizontally, but heavily damped
         * vertically. Full perspective on both axes is what made words collide:
         * it pushes near words away from the equator by up to 1.55x and pulls far
         * ones in by 0.74x, so a near word at one latitude lands on the same
         * screen row as a far word two latitudes away. Damping y keeps each word
         * in its own horizontal band while depth still reads via x, size and
         * opacity.
         */
        const pyScale = 0.88 + scale * 0.12;
        projected.push({ px: x1 * radius * scale, py: y2 * radius * pyScale, z: z2, scale });

        if (z2 > leadZ) {
          leadZ = z2;
          leadIndex = i;
        }
      }

      for (let i = 0; i < n; i++) {
        const el = wordRefs.current[i];
        if (!el) continue;
        const { px, py, z, scale } = projected[i];
        // Depth ramp: 1 at the front, 0 at the back.
        const depth = (z + 1) / 2;

        el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.66 + scale * 0.3).toFixed(3)})`;
        // Never below 0.28 — receding, but never lost in the background.
        el.style.opacity = (0.28 + depth * 0.72).toFixed(3);
        el.style.zIndex = String(Math.round(depth * 100));
        el.classList.toggle("is-lead", i === leadIndex);
        el.classList.toggle("is-back", depth < 0.45);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      host?.removeEventListener("pointerenter", onEnter);
      host?.removeEventListener("pointerleave", onLeave);
    };
  }, [radius, reduce]);

  return (
    <section className="section principles-section" id="principles">
      <div className="principles-grid">
        <div className="principles-copy">
          <p className="label">
            <i className="rec-dot" />
            What we optimise for
          </p>
          <h2 className="section-title">
            The rules we<br />
            won&rsquo;t trade away.
          </h2>
          <p className="section-lede">
            A dictation tool sits between your thoughts and your work, which is a
            lot of trust to ask for. These are the commitments that decide what
            gets built and, more often, what doesn&rsquo;t.
          </p>
          <ul className="principles-list">
            <li>
              <strong>Private by default.</strong> On-device isn&rsquo;t a mode you
              switch on — it&rsquo;s the only way it runs.
            </li>
            <li>
              <strong>Honest about limits.</strong> Our own evaluation numbers are
              published, including the ones that aren&rsquo;t flattering yet.
            </li>
            <li>
              <strong>Quiet until you speak.</strong> No badges, no nagging, no
              streak guilt. It waits.
            </li>
          </ul>
        </div>

        <div className="sphere" ref={hostRef} data-cursor="Hover to slow it">
          <div className="sphere-scrim" aria-hidden="true" />
          <div className="sphere-rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className={`sphere-words ${reduce ? "is-static" : ""}`}>
            {principles.map((p, i) => (
              <span
                key={p}
                className="sphere-word"
                ref={(el) => {
                  wordRefs.current[i] = el;
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
