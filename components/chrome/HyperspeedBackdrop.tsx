"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const Hyperspeed = dynamic(() => import("@/components/vendor/Hyperspeed/Hyperspeed"), {
  ssr: false,
});

/**
 * Retuned to the site palette so the effect belongs to the page instead of
 * looking bolted on: traffic moving away is `ember` (you), traffic coming toward
 * you is `signal` (the machine), on the same `ink` ground as everything else.
 *
 * MUST stay module-level — Hyperspeed rebuilds its whole scene whenever this
 * object identity changes.
 */
const EFFECT_OPTIONS = {
  distortion: "turbulentDistortion",
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.8, 0.8] as [number, number],
  carFloorSeparation: [0, 5] as [number, number],
  colors: {
    roadColor: 0x07090e,
    islandColor: 0x0b0f17,
    background: 0x07090e,
    shoulderLines: 0x18202f,
    brokenLines: 0x18202f,
    leftCars: [0xff6a3d, 0xd94a20, 0xff8b64],
    rightCars: [0x6ee7df, 0x3bbdb4, 0x9df3ed],
    sticks: 0x6ee7df,
  },
};

/**
 * The Hyperspeed road, as a self-contained background layer.
 *
 * Fills its positioned parent, so the parent controls how much of the page it
 * covers. Three layers, back to front: a pure-CSS road that is always painted,
 * the WebGL scene when the browser and the visitor both allow it, and a veil
 * that buys back the contrast the effect spends.
 *
 * `variant` only changes the veil — which is the readability lever:
 *   - `cta`  darkens the middle, for a headline sitting on top of it
 *   - `page` fades to solid ink at the bottom, so page content below it is clean
 */
export default function HyperspeedBackdrop({
  variant = "cta",
}: {
  variant?: "cta" | "page";
}) {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [showEffect, setShowEffect] = useState(false);

  /**
   * Only ever build the WebGL scene when the section is actually on screen, the
   * visitor hasn't asked for reduced motion, and the browser can do WebGL. The
   * CSS road underneath is a complete design in its own right, so bailing out
   * costs nothing visually.
   */
  useEffect(() => {
    if (reduce) return;

    const host = hostRef.current;
    if (!host) return;

    const canWebGL = (() => {
      try {
        const canvas = document.createElement("canvas");
        return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!canWebGL) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowEffect(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(host);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div className={`hs-backdrop hs-backdrop--${variant}`} ref={hostRef} aria-hidden="true">
      {/* Road-into-the-distance in CSS: the layer the WebGL fades in over, so
          there's never a black flash, and the whole picture without it. */}
      <div className="hs-road" />
      {showEffect && <Hyperspeed effectOptions={EFFECT_OPTIONS} />}
      <div className="hs-veil" />
    </div>
  );
}
