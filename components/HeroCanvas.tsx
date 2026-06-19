"use client";

/**
 * WebGL shader-aurora — a single full-viewport plane running a simplex-noise
 * gradient flow in the accent palette. Progressive enhancement only:
 *
 *   • Loaded client-only via next/dynamic({ ssr: false }) from Hero.tsx
 *   • Returns null (→ CSS AuroraFallback shows through) when WebGL is missing,
 *     prefers-reduced-motion is set, or the viewport is < 768px.
 *   • Pauses rendering (frameloop="never") when scrolled out of view.
 *   • dpr clamped to [1, 2]; one cheap fragment shader, no geometry to speak of.
 */

import { useEffect, useRef, useState } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Ignore the camera — fill clip space directly. planeGeometry [2,2] maps
    // position.xy to [-1,1] and uv to [0,1].
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  // Ashima simplex noise (webgl-noise) ------------------------------------
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                   + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  // -----------------------------------------------------------------------

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= uRes.x / uRes.y;

    float t = uTime * 0.045;

    // Two-stage domain warp → rich, flowing filament detail (the "depth").
    vec2 q = vec2(
      fbm(p * 1.5 + vec2(0.0, t)),
      fbm(p * 1.5 + vec2(5.2, t * 1.25))
    );
    vec2 r = vec2(
      fbm(p * 1.8 + q * 1.4 + vec2(1.7, 9.2) + t * 0.5),
      fbm(p * 1.8 + q * 1.4 + vec2(8.3, 2.8) - t * 0.4)
    );
    float n = fbm(p * 2.0 + r * 1.5);
    n = n * 0.5 + 0.5;

    vec3 base = vec3(0.035, 0.035, 0.055);
    vec3 col = base;

    // Bold, layered aurora glows — vivid and present, not a faint wash.
    col = mix(col, uColorA, smoothstep(0.35, 0.95, n) * 0.85);
    col = mix(col, uColorB,
      smoothstep(0.45, 1.0, fbm(p * 1.2 + r) * 0.5 + 0.5) * 0.55);
    col = mix(col, uColorC, smoothstep(0.72, 1.0, n) * 0.30);

    // Carve deep shadow pockets for contrast and drama.
    col *= 0.82 + 0.18 * smoothstep(0.2, 0.85, n);

    // Soft edge vignette so the aurora frames the hero rather than flooding it.
    float d = length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.05));
    float vig = smoothstep(1.25, 0.3, d);
    col = mix(base, col, 0.55 + 0.45 * vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const AuroraMaterial = shaderMaterial(
  {
    uTime: 0,
    uRes: new THREE.Vector2(1, 1),
    uColorA: new THREE.Color("#6366F1"),
    uColorB: new THREE.Color("#8B5CF6"),
    uColorC: new THREE.Color("#22D3EE"),
  },
  vertexShader,
  fragmentShader
);

extend({ AuroraMaterial });

// Tell TS about the custom JSX element created by extend().
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      auroraMaterial: any;
    }
  }
}

function AuroraPlane() {
  const ref = useRef<any>(null);
  const { size, viewport } = useThree();

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.uTime = state.clock.elapsedTime;
    ref.current.uRes.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr
    );
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <auroraMaterial ref={ref} />
    </mesh>
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function HeroCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(true);

  // Decide once on the client whether WebGL should run at all.
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const wideEnough = window.matchMedia("(min-width: 768px)").matches;
    if (!reduce && wideEnough && hasWebGL()) setEnabled(true);
  }, []);

  // Pause the render loop when the hero scrolls out of view.
  useEffect(() => {
    if (!enabled || !wrapRef.current) return;
    const el = wrapRef.current;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  // Not eligible → render nothing; the CSS AuroraFallback below shows through.
  if (!enabled) return null;

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden>
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
        // Camera is irrelevant (vertex shader ignores it) but R3F wants one.
        orthographic
        camera={{ position: [0, 0, 1] }}
      >
        <AuroraPlane />
      </Canvas>
      {/* fade the canvas into the page below the hero */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-base-900" />
    </div>
  );
}
