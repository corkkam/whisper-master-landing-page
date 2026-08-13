"use client";

import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The scrollbar, moved inside the glass.
 *
 * The native one could not stay. A classic (non-overlay) scrollbar takes its
 * width out of the layout, and the lid is `position: fixed; inset: 0`, which
 * resolves against the client box — so the native bar is laid out in the strip
 * *outside* the bezel and the machine reads as a display with a grey rail bolted
 * to its right edge. The root scrollbar cannot be inset, so the only fix that
 * leaves the frame intact is to stop drawing it (see `html::-webkit-scrollbar`)
 * and put this in its place, offset from the bezel by the same hairline the
 * glass edge uses.
 *
 * Behaves like an overlay scrollbar rather than a permanent rail: it appears
 * while the page is moving or the pointer is near it, and fades once you stop.
 * Draggable, and the track takes a click — anything less would be taking a
 * control away from the visitor in exchange for a nicer edge.
 *
 * Scroll writes go through Lenis when it is mounted. Anything that scrolls the
 * window natively while Lenis is running leaves its virtual position stale and
 * the next wheel event snaps the page back — the same trap `HashNavigation`
 * documents. Under reduced motion there is no Lenis and `window.scrollTo` is
 * correct.
 */

/** Shortest the thumb is allowed to get on a very long page. */
const MIN_THUMB = 28;

/** Idle time before an untouched bar fades out. */
const FADE_AFTER = 1100;

export default function ScreenScrollbar() {
  const lenis = useLenis();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Geometry lives in a ref and is written straight to style: this updates on
  // every scroll frame, and routing it through state would re-render the tree
  // at 120fps for two numbers no other component reads.
  const geo = useRef({ track: 0, thumb: 0, max: 0 });
  const frame = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const [scrollable, setScrollable] = useState(false);
  const [active, setActive] = useState(false);
  const [held, setHeld] = useState(false);

  /** Show, and start the clock that hides it again. */
  const wake = useCallback(() => {
    setActive(true);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      // A drag that pauses mid-flight must not fade out under the cursor.
      if (!dragging.current) setActive(false);
    }, FADE_AFTER);
  }, []);

  const measure = useCallback(() => {
    const viewport = window.innerHeight;
    const doc = document.documentElement.scrollHeight;
    const max = Math.max(0, doc - viewport);

    // Decided before the track is consulted, and deliberately so: the rail is
    // only in the DOM while the page overflows, so reading its height first
    // would make this un-flippable — no track, no measurement, no rail.
    setScrollable(max > 1);

    const track = trackRef.current;
    if (!track) return;
    const trackLen = track.clientHeight;
    const thumb = max
      ? Math.max(MIN_THUMB, Math.round((trackLen * viewport) / doc))
      : 0;

    geo.current = { track: trackLen, thumb, max };
    if (thumbRef.current) thumbRef.current.style.height = `${thumb}px`;
  }, []);

  /** Position the thumb from the window's current offset. */
  const draw = useCallback(() => {
    const thumbEl = thumbRef.current;
    if (!thumbEl) return;
    const { track, thumb, max } = geo.current;
    const progress = max ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    thumbEl.style.transform = `translateY(${(track - thumb) * progress}px)`;
  }, []);

  useEffect(() => {
    measure();
    draw();

    const onScroll = () => {
      // One paint per frame regardless of how many events arrive.
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        draw();
      });
      wake();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    // The page grows and shrinks under its own animations and image loads, so
    // the thumb has to be re-derived from content height, not just on resize.
    const ro = new ResizeObserver(() => {
      measure();
      draw();
    });
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      if (idle.current) clearTimeout(idle.current);
    };
  }, [measure, draw, wake]);

  // The pass that actually sizes the thumb. The first `measure` above runs
  // while the rail is still absent and can only decide *whether* to mount it;
  // this one fires once it has, when there is finally a track to measure.
  useEffect(() => {
    if (!scrollable) return;
    measure();
    draw();
  }, [scrollable, measure, draw]);

  /** Scroll to an absolute offset, through Lenis when it owns the window. */
  const scrollTo = useCallback(
    (y: number) => {
      const clamped = Math.min(geo.current.max, Math.max(0, y));
      if (lenis) lenis.scrollTo(clamped, { immediate: true, force: true });
      else window.scrollTo(0, clamped);
    },
    [lenis]
  );

  /** Map a viewport y to the offset that puts the thumb's *top* there. */
  const offsetFromThumbTop = useCallback((thumbTop: number) => {
    const { track, thumb, max } = geo.current;
    const span = track - thumb;
    if (span <= 0) return 0;
    return (Math.min(span, Math.max(0, thumbTop)) / span) * max;
  }, []);

  const onThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const track = trackRef.current;
      if (!track) return;

      const grabOffset = e.clientY - thumbRef.current!.getBoundingClientRect().top;
      const trackTop = track.getBoundingClientRect().top;

      dragging.current = true;
      setHeld(true);
      setActive(true);
      e.currentTarget.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        scrollTo(offsetFromThumbTop(ev.clientY - trackTop - grabOffset));
      };
      const onUp = () => {
        dragging.current = false;
        setHeld(false);
        wake();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [scrollTo, offsetFromThumbTop, wake]
  );

  /** A click on the empty track jumps, centring the thumb on the pointer. */
  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const track = trackRef.current;
      if (!track) return;
      const y = e.clientY - track.getBoundingClientRect().top;
      scrollTo(offsetFromThumbTop(y - geo.current.thumb / 2));
      wake();
    },
    [scrollTo, offsetFromThumbTop, wake]
  );

  if (!scrollable) return null;

  return (
    // Decorative duplicate of a control the visitor already has: wheel, keys and
    // trackpad all still scroll the document, so announcing a second one to a
    // screen reader would be noise.
    <div
      ref={trackRef}
      className="screen-scroll"
      data-active={active || held ? "true" : "false"}
      data-held={held ? "true" : "false"}
      aria-hidden="true"
      onPointerDown={onTrackPointerDown}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => {
        if (!dragging.current) wake();
      }}
    >
      <div
        ref={thumbRef}
        className="screen-scroll-thumb"
        onPointerDown={onThumbPointerDown}
      />
    </div>
  );
}
