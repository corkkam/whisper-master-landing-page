"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { features, type Feature } from "@/lib/content";
import FeatureSchematic from "./FeatureSchematic";

const COUNT = features.length;
const STEP = 360 / COUNT;
/** Cards beyond this angle from the apex aren't painted — immediate neighbours only. */
const CULL = STEP * 1.35;

/**
 * The features carousel: cards ride a large wheel whose hub sits below the
 * viewport, so you see an arc of them across the top and the one at the apex is
 * the one you're reading.
 *
 * Deliberately does *not* hijack vertical wheel events — that would fight the
 * page's smooth scrolling. It spins on drag, horizontal trackpad swipe, arrow
 * keys, the prev/next controls, and clicking any visible card.
 */
export default function FeatureWheel() {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [radius, setRadius] = useState(860);
  // Continuous so a drag can land between cards; the release snaps it.
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);

  const drag = useRef<{ id: number; startX: number; startAngle: number; moved: boolean } | null>(null);

  /**
   * Radius controls how much of the neighbouring cards you see. Too large and
   * they sit entirely off-screen (the arc stops reading as a wheel at all); too
   * small and the cards collide at the apex. At ~0.62 of the container width the
   * adjacent card is roughly a third visible on desktop, and on narrow screens
   * the floor pushes it off-frame so only the active card shows — which is the
   * behaviour you want on a phone anyway.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setRadius(Math.max(560, Math.min(860, w * 0.62)));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const active = ((Math.round(-angle / STEP) % COUNT) + COUNT) % COUNT;

  const goTo = useCallback((index: number) => {
    setAngle((current) => {
      // Rotate to the requested card by the shortest path from where we are.
      const currentIndex = Math.round(-current / STEP);
      let delta = index - (((currentIndex % COUNT) + COUNT) % COUNT);
      if (delta > COUNT / 2) delta -= COUNT;
      if (delta < -COUNT / 2) delta += COUNT;
      return -(currentIndex + delta) * STEP;
    });
  }, []);

  const nudge = useCallback((dir: 1 | -1) => {
    setAngle((current) => -(Math.round(-current / STEP) + dir) * STEP);
  }, []);

  // Horizontal-intent wheel/trackpad gestures only, so the page still scrolls.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || reduce) return;

    let cooling = false;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 6) return;
      e.preventDefault();
      if (cooling) return;
      cooling = true;
      window.setTimeout(() => (cooling = false), 240);
      nudge(e.deltaX > 0 ? 1 : -1);
    }

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [nudge, reduce]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType === "touch") return;
    drag.current = { id: e.pointerId, startX: e.clientX, startAngle: angle, moved: false };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    // Map horizontal travel to rotation: one card per ~180px feels controllable.
    setAngle(d.startAngle - (dx / 180) * STEP);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    // Snap to whichever card ended up nearest the apex.
    setAngle((current) => -Math.round(-current / STEP) * STEP);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nudge(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nudge(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(COUNT - 1);
    }
  }

  const heading = (
    <div className="section-head">
      <p className="label">
        <i className="rec-dot" />
        What it does
      </p>
      <h2 className="section-title">
        Eight things it does<br />
        so you don&rsquo;t have to.
      </h2>
      <p className="section-lede">
        Every one of these ships today, and every one runs on your machine. Spin
        the wheel — or use the arrow keys.
      </p>
    </div>
  );

  // Reduced motion: no wheel, no orbit, just the same content as a plain grid.
  if (reduce) {
    return (
      <section className="section wheel-section" id="features">
        {heading}
        <div className="feature-grid">
          {features.map((f) => (
            <article className={`fcard fcard--flat accent-${f.accent}`} key={f.id}>
              <FeatureCardBody feature={f} />
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="section wheel-section" id="features">
      {heading}

      <div
        className={`wheel ${dragging ? "is-dragging" : ""}`}
        ref={hostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Whisper Master features"
        data-cursor="Drag to spin"
        style={{ ["--wheel-r" as string]: `${radius}px` }}
      >
        <div className="wheel-hub" aria-hidden="true">
          <Rim radius={radius} angle={angle} />
        </div>

        {/* Sits in the wheel, not on the rim — the rim's centre is a full radius
            below the frame, so anything parented to it would be clipped away. */}
        <span className="wheel-count" aria-hidden="true">
          {String(active + 1).padStart(2, "0")}
          <em>/{String(COUNT).padStart(2, "0")}</em>
        </span>

        <div className="wheel-track">
          {features.map((f, i) => {
            // Signed shortest angular distance from the apex.
            let theta = i * STEP + angle;
            theta = ((theta % 360) + 540) % 360 - 180;
            const hidden = Math.abs(theta) > CULL;
            const rad = (theta * Math.PI) / 180;
            const x = Math.sin(rad) * radius;
            const y = radius - Math.cos(rad) * radius;
            const near = Math.abs(theta) / CULL; // 0 at apex → 1 at the cull edge
            const isActive = i === active;

            return (
              <article
                key={f.id}
                className={`fcard accent-${f.accent} ${isActive ? "is-active" : ""}`}
                aria-hidden={hidden}
                aria-current={isActive}
                style={{
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(theta * 0.32).toFixed(2)}deg) scale(${(1 - near * 0.16).toFixed(3)})`,
                  opacity: hidden ? 0 : 1 - near * 0.72,
                  // Nearer cards paint on top of their neighbours.
                  zIndex: 100 - Math.round(Math.abs(theta)),
                  pointerEvents: hidden ? "none" : "auto",
                  transition: dragging
                    ? "none"
                    : "transform 620ms cubic-bezier(.16,1,.3,1), opacity 400ms ease",
                }}
              >
                <FeatureCardBody feature={f} showMedia={isActive} />
                {!isActive && !hidden && (
                  <button
                    className="fcard-hit"
                    type="button"
                    onClick={() => goTo(i)}
                    tabIndex={-1}
                  >
                    <span className="sr-only">Show {f.title}</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <div className="wheel-fade" aria-hidden="true" />
      </div>

      <div className="wheel-controls">
        <button
          type="button"
          className="wheel-btn"
          onClick={() => nudge(-1)}
          aria-label="Previous feature"
          data-cursor="Back"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="wheel-dots" role="tablist" aria-label="Choose a feature">
          {features.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={f.title}
              className={`wheel-dot ${i === active ? "is-on" : ""}`}
              onClick={() => goTo(i)}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="wheel-btn"
          onClick={() => nudge(1)}
          aria-label="Next feature"
          data-cursor="Next"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Announce the active card for screen readers without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {features[active].title}. {features[active].body}
      </p>
    </section>
  );
}

function FeatureCardBody({
  feature,
  showMedia = true,
}: {
  feature: Feature;
  showMedia?: boolean;
}) {
  return (
    <>
      <div className="fcard-media">
        {feature.media && showMedia ? (
          feature.media.kind === "video" ? (
            <video
              src={feature.media.src}
              poster={feature.media.poster}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={feature.media.src} alt="" loading="lazy" />
          )
        ) : (
          <FeatureSchematic id={feature.id} />
        )}
      </div>
      <div className="fcard-text">
        <span className="fcard-tag">{feature.tag}</span>
        <h3>{feature.title}</h3>
        <p>{feature.body}</p>
      </div>
    </>
  );
}

/**
 * The visible hub: a tick ring that turns with the wheel, so the rotation reads
 * as one mechanism rather than cards drifting independently.
 */
function Rim({ radius, angle }: { radius: number; angle: number }) {
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => i), []);
  return (
    <div
      className="rim"
      style={{
        width: radius * 2,
        height: radius * 2,
        transform: `translate(-50%, 0) rotate(${angle}deg)`,
      }}
    >
      {ticks.map((i) => (
        <i
          key={i}
          className={i % 9 === 0 ? "rim-tick is-major" : "rim-tick"}
          style={{ transform: `rotate(${i * 5}deg) translateY(-${radius}px)` }}
        />
      ))}
    </div>
  );
}
