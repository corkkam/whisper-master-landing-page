"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The two things we want someone to feel about the product, alternating in the
 * cursor's trailing label. Any element carrying `data-cursor="…"` overrides them
 * with a contextual verb while the pointer is over it.
 */
const TAGLINES = ["Innovate with purpose", "Innovate with a human touch"];
const SWAP_MS = 4800;

/**
 * Trailing cursor: an exact-tracking dot, a lerped ring behind it, and a label
 * carrying the taglines.
 *
 * Only mounts for fine pointers, and steps aside entirely under reduced motion —
 * a lagging cursor is precisely the kind of motion that setting asks us to drop,
 * and hiding the real cursor to replace it with a laggy one would be worse than
 * showing nothing.
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [tagIndex, setTagIndex] = useState(0);

  // Gate on a fine pointer *and* motion preference before taking over the cursor.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setActive(fine.matches && !still.matches);
    evaluate();
    fine.addEventListener("change", evaluate);
    still.addEventListener("change", evaluate);
    return () => {
      fine.removeEventListener("change", evaluate);
      still.removeEventListener("change", evaluate);
    };
  }, []);

  // Only suppress the native cursor once ours is genuinely running.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("has-cursor", active);
    return () => root.classList.remove("has-cursor");
  }, [active]);

  useEffect(() => {
    if (!active || label) return;
    const id = window.setInterval(
      () => setTagIndex((i) => (i + 1) % TAGLINES.length),
      SWAP_MS
    );
    return () => window.clearInterval(id);
  }, [active, label]);

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    // Start off-screen so the cursor doesn't flash at the origin on load.
    let targetX = -200;
    let targetY = -200;
    let ringX = -200;
    let ringY = -200;
    let seen = false;

    function onMove(e: PointerEvent) {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!seen) {
        seen = true;
        ringX = targetX;
        ringY = targetY;
        ringRef.current?.classList.add("is-visible");
        dotRef.current?.classList.add("is-visible");
      }

      const hit = (e.target as HTMLElement | null)?.closest?.("[data-cursor]");
      setLabel(hit?.getAttribute("data-cursor") || null);

      const interactive = (e.target as HTMLElement | null)?.closest?.(
        "a, button, input, textarea, select, [role='button'], [tabindex]:not([tabindex='-1'])"
      );
      ringRef.current?.classList.toggle("is-hot", !!interactive);
    }

    function onDown() {
      ringRef.current?.classList.add("is-down");
    }
    function onUp() {
      ringRef.current?.classList.remove("is-down");
    }
    function onLeave() {
      ringRef.current?.classList.remove("is-visible");
      dotRef.current?.classList.remove("is-visible");
      seen = false;
    }

    function frame() {
      // The dot is exact so precision never suffers; only the ring trails.
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="cursor-layer" aria-hidden="true">
      <div className="cursor-ring" ref={ringRef}>
        <span className="cursor-label" key={label ?? tagIndex}>
          {label ?? TAGLINES[tagIndex]}
        </span>
      </div>
      <div className="cursor-dot" ref={dotRef} />
    </div>
  );
}
