"use client";

import { useEffect, useRef, useState } from "react";
// Written by scripts/split-koi.py alongside the two layers, so the seat can
// never drift out of step with the images it describes.
import plate from "@/public/hero/koi.json";

const SEAT = plate.seat;

/**
 * PLATE 00 — the pond, in two layers.
 *
 * `Water.tsx` animates a plate by displacing one flat raster, which is all the
 * other four plates need. This one cannot work that way, because the koi has to
 * act independently of the surface it is floating on. `scripts/split-koi.py`
 * separates the artwork into `pond.webp` (water and wake, no fish) and
 * `koi.webp` (the fish alone, with alpha); this composites them back together.
 *
 * ## Registration
 *
 * Both layers are drawn inside the shader rather than as stacked DOM nodes.
 * The hero's art box is letterboxed on desktop and cropped onto the koi on
 * mobile, so two CSS-positioned images would have to reproduce that fit exactly
 * and stay locked through every resize. Drawing both in one pass means they
 * share a single mapping by construction and cannot drift apart. The seat
 * rectangle comes from `koi.json`, written by the same script that cut the
 * layers, so the fish sits in its own hole to the pixel.
 *
 * ## The koi speaks
 *
 * The koi is your voice — the one ember-coloured thing in the drawing, and
 * ember is *you* in this palette. So when you hold the key, the fish talks: its
 * mouth works, and the rings go out from the mouth across the water.
 *
 * Two earlier attempts are worth recording, because both looked reasonable
 * while they were being built and both were wrong.
 *
 *   1. **A breach.** The koi leapt out and splashed back. A jump is an escape,
 *      not a capture — a fish that leaves the water has got away from you, and
 *      this product does the opposite. The motion argued against the thing it
 *      was decorating, so no trigger could have rescued it.
 *   2. **Refraction.** The surface was disturbed while you spoke and the koi
 *      smeared with it, on the theory that a thing underwater is illegible
 *      until the water stills. It read as the fish shrinking and melting, which
 *      is not a thing a fish does and not a thing this product does either.
 *
 * What both missed is that the fish already has the right organ for the job.
 * Speech comes out of a mouth. From directly overhead a koi's mouth is a small
 * round thing at the tip of the snout, and when it works the lips push forward
 * and a dark cavity opens — which is exactly a local radial displacement plus a
 * local darkening, both cheap. The rings then start where the sound would start
 * rather than at the middle of the animal.
 *
 * ## House rules
 *
 * The app's §6 forbids perpetual motion. The drifting surface already breaks
 * that at the client's direction. The mouth does not: it works only while a key
 * is down, stops the moment it comes up, and is skipped entirely under Reduce
 * Motion, where the still artwork is all anyone ever sees. At rest the koi is
 * *perfectly still* — an early pass let the surface ripple it continuously and
 * the client's note was exact, that a fish moving with the water reads as
 * hypnotic and gives the whole effect away.
 */

/**
 * The mouth, in plate UV with y measured from the bottom.
 *
 * Read off the artwork at (1250, 112) of 1672×941: the tip of the snout, on the
 * arc between the two barbels and above the eyes. Everything the koi does
 * happens here, so it is worth being exact — a few pixels out and the ripples
 * appear to come from its forehead.
 */
const MOUTH_X = 1250 / 1672;
const MOUTH_Y = 1 - 112 / 941;

/**
 * How far the lips push out at full opening, in UV, and how wide the movement
 * and the cavity inside it reach.
 *
 * All three started roughly a third of this size, chosen by eye on a zoomed
 * crop. At the size the plate actually ships — the koi is about a fifth of the
 * band — none of it was visible at all. Anything on this fish has to be scaled
 * against the whole plate, not against the head.
 */
const LIP_PUSH = 0.028;
const LIP_R2 = 0.00095;
const CAVITY_R2 = 0.00022;

/** Time constants for the mouth starting and stopping, seconds. */
const ENV_RISE = 0.09;
const ENV_FALL = 0.16;

/** A ring leaves the mouth each time it opens past this. */
const RING_AT = 0.62;
/** Ring slots carried by the shader. Enough for the overlap at speaking rate. */
const RING_SLOTS = 4;

const VERT = `
attribute vec2 a;
varying vec2 v;
void main() {
  v = a * 0.5 + 0.5;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 v;

uniform sampler2D u_pond;
uniform sampler2D u_koi;
uniform float u_time;
uniform float u_amp;
uniform vec2  u_res;
uniform vec2  u_img;
uniform vec2  u_focus;
uniform vec4  u_seat;   /* koi rect in plate UV: xy origin, zw size */
uniform float u_mouth;  /* 0 shut, 1 wide open */
uniform vec4  u_rings[${RING_SLOTS}]; /* xy centre, z radius, w amplitude */

/*
 * The flow field. Every term travels in the direction of its own axis,
 * sin(k*x - w*t), so crests cross the frame. Mixing the signs makes the waves
 * stand instead: the whole surface pulses in place, in sync, which is what
 * reads as hypnotic. Water flows; it does not breathe.
 */
vec2 flow(vec2 p, float t) {
  float a = sin(p.x * 1.30 + p.y * 0.70 - t * 0.44);
  float b = sin(p.x * 2.90 - p.y * 1.70 - t * 0.31) * 0.42;
  float c = sin(p.y * 3.70 + p.x * 0.40 - t * 0.58) * 0.28;

  float d = sin(p.y * 1.10 - p.x * 0.60 - t * 0.37);
  float e = sin(p.y * 3.10 + p.x * 1.40 - t * 0.52) * 0.42;
  float f = sin(p.x * 4.30 - p.y * 0.30 - t * 0.28) * 0.28;

  return vec2(a + b + c, d + e + f);
}

/*
 * How much of this pixel is water. The lily pads carry real saturation against
 * pale near-monochrome water, so saturation and value key them out and they
 * hold their shape while the surface moves around them. The koi used to need
 * this too; now that it is its own layer, the water where it sits is free to
 * move like water.
 */
float waterness(vec2 uv) {
  vec3 c = texture2D(u_pond, vec2(uv.x, 1.0 - uv.y)).rgb;
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = (mx - mn) / max(mx, 0.001);
  float dark = 1.0 - mx;
  float solid = max(smoothstep(0.13, 0.30, sat), smoothstep(0.42, 0.70, dark));
  return 1.0 - solid;
}

/* One expanding ring of radial displacement. Gaussian in radius, so it is a
   travelling band rather than a disc, and it dies by amplitude alone. */
vec2 ripple(vec4 R, vec2 p, float ia) {
  if (R.w <= 0.0001) return vec2(0.0);
  vec2 d = p - vec2(R.x * ia, R.y);
  float r = length(d);
  float k = r - R.z;
  float band = exp(-(k * k) / 0.0018);
  return (r > 1e-4 ? d / r : vec2(0.0)) * band * R.w;
}

/* Plate UV -> koi texture UV. The fish never leaves its seat; only its mouth
   moves. */
vec2 koiUV(vec2 pt) {
  return (pt - u_seat.xy) / u_seat.zw;
}

void main() {
  float canvasA = u_res.x / max(u_res.y, 1.0);
  float imgA = u_img.x / max(u_img.y, 1.0);
  vec2 fit = canvasA > imgA ? vec2(1.0, canvasA / imgA) : vec2(imgA / canvasA, 1.0);
  vec2 base = (v - u_focus) / fit + u_focus;

  /* Blur the water mask over a small neighbourhood so solids fade into the
     moving surface instead of leaving a seam where displacement stops. */
  float r = 0.012;
  float w = waterness(base) * 0.36
          + waterness(base + vec2( r, 0.0)) * 0.16
          + waterness(base + vec2(-r, 0.0)) * 0.16
          + waterness(base + vec2(0.0,  r)) * 0.16
          + waterness(base + vec2(0.0, -r)) * 0.16;
  w = clamp(w, 0.0, 1.0);
  w = w * w;

  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v.x * aspect, v.y);
  vec2 d = flow(p * 2.6, u_time);
  vec2 offset = vec2(d.x * 0.6, d.y) * u_amp;

  /* The rings leave the mouth, so they are centred there and not on the middle
     of the animal. Aspect-corrected space, or they would be ellipses. */
  vec2 ap = vec2(base.x * imgA, base.y);
  for (int i = 0; i < ${RING_SLOTS}; i++) {
    offset += ripple(u_rings[i], ap, imgA);
  }

  vec2 uv = clamp(base + offset * w, vec2(0.0005), vec2(0.9995));
  vec3 col = texture2D(u_pond, vec2(uv.x, 1.0 - uv.y)).rgb;

  /* The mouth.
     Seen from overhead, a koi's mouth working is the lips pushing forward into
     a round O with a dark cavity opening inside them. That is a small radial
     displacement plus a small darkening, both falling off fast — the rest of
     the fish must not move at all, or this becomes the melting effect it
     replaced. */
  vec2 md = ap - vec2(${MOUTH_X.toFixed(6)} * imgA, ${MOUTH_Y.toFixed(6)});
  float mr = length(md);
  float lip = exp(-(mr * mr) / ${LIP_R2}) * u_mouth;
  vec2 push = (mr > 1e-4 ? md / mr : vec2(0.0)) * lip * ${LIP_PUSH};
  push.x /= imgA;

  vec2 k = koiUV(base - push);
  vec4 koi = texture2D(u_koi, vec2(clamp(k.x, 0.0, 1.0), 1.0 - clamp(k.y, 0.0, 1.0)));
  float inside = step(0.0, k.x) * step(k.x, 1.0) * step(0.0, k.y) * step(k.y, 1.0);
  float a = clamp(koi.a, 0.0, 1.0) * inside;
  col = mix(col, koi.rgb, a);

  /* Masked to the fish: a dark mouth floating over open water would read as a
     hole punched in the pond. */
  float cavity = exp(-(mr * mr) / ${CAVITY_R2}) * u_mouth;
  col = mix(col, vec3(0.10, 0.07, 0.06), clamp(cavity, 0.0, 1.0) * 0.82 * a);

  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * How open the mouth is at time `t` into an utterance, 0..1.
 *
 * Three incommensurable rates summed. One rate is a fish blowing bubbles; three
 * that never line up is speech — the pattern does not repeat inside any hold a
 * reader will actually perform.
 */
function mouthAt(t: number): number {
  const s =
    0.54 * Math.sin(t * 8.6) +
    0.32 * Math.sin(t * 13.9 + 1.3) +
    0.14 * Math.sin(t * 4.7 + 0.7);
  return Math.min(1, Math.max(0, 0.46 + s * 0.72));
}

type Ring = { t0: number; amp: number };

export function HeroPond({
  /**
   * Push-to-talk, owned by the hero.
   *
   * The band reports presses through `onSpeakStart`/`onSpeakEnd` rather than
   * acting on them, so the state lives in one place and the same utterance can
   * be started from here or from the control in the copy. `null` means nobody
   * has taken the key yet.
   */
  speaking = null,
  onSpeakStart,
  onSpeakEnd,
  amp = 0.011,
  className = "",
  priority = false,
}: {
  speaking?: boolean | null;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  amp?: number;
  className?: string;
  priority?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pondRef = useRef<HTMLImageElement | null>(null);
  const koiRef = useRef<HTMLImageElement | null>(null);
  const [live, setLive] = useState(false);
  const [held, setHeld] = useState(false);

  /* All read by the render loop rather than closed over, so starting or ending
     an utterance never has to tear down and rebuild the GL context. */
  const holding = useRef(false);
  const startedAt = useRef(0);
  const env = useRef(0);
  const lastFrame = useRef(0);
  const wasOpen = useRef(false);
  const rings = useRef<Ring[]>([]);

  /** Newest first; the shader carries a fixed number of slots. */
  const pushRing = (now: number, amp: number) => {
    rings.current.unshift({ t0: now, amp });
    if (rings.current.length > RING_SLOTS) rings.current.length = RING_SLOTS;
  };

  useEffect(() => {
    if (speaking === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (speaking === holding.current) return;
    holding.current = speaking;
    setHeld(speaking);
    if (speaking) startedAt.current = performance.now();
  }, [speaking]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const pond = pondRef.current;
    const koi = koiRef.current;
    if (!host || !canvas || !pond || !koi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let onScreen = false;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      if (disposed) return;
      // Safari hands back a texture from an <img> whose `complete` is true but
      // whose pixels are not decoded, which uploads blank.
      try {
        await Promise.all([pond.decode?.(), koi.decode?.()]);
      } catch {
        /* Non-fatal: try the upload anyway. */
      }
      if (disposed) return;

      const gl = canvas.getContext("webgl", {
        // Opaque on purpose: Safari composites non-premultiplied alpha buffers
        // unreliably and can present nothing at all.
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) return; // The still <img> underneath is already showing.

      const sh = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn("pond:", gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      };
      const vs = sh(gl.VERTEX_SHADER, VERT);
      const fs = sh(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return;

      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      const loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const upload = (img: HTMLImageElement, unit: number) => {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      };
      upload(pond, 0);
      upload(koi, 1);

      const u = {
        pond: gl.getUniformLocation(prog, "u_pond"),
        koi: gl.getUniformLocation(prog, "u_koi"),
        time: gl.getUniformLocation(prog, "u_time"),
        amp: gl.getUniformLocation(prog, "u_amp"),
        res: gl.getUniformLocation(prog, "u_res"),
        img: gl.getUniformLocation(prog, "u_img"),
        focus: gl.getUniformLocation(prog, "u_focus"),
        seat: gl.getUniformLocation(prog, "u_seat"),
        mouth: gl.getUniformLocation(prog, "u_mouth"),
        rings: gl.getUniformLocation(prog, "u_rings[0]"),
      };
      gl.uniform1i(u.pond!, 0);
      gl.uniform1i(u.koi!, 1);
      gl.uniform1f(u.amp!, amp);
      gl.uniform2f(u.img!, pond.naturalWidth, pond.naturalHeight);
      gl.uniform4f(
        u.seat!,
        SEAT.left,
        1 - SEAT.top - SEAT.height,
        SEAT.width,
        SEAT.height
      );

      /* Match the CSS `object-position` so the canvas frames the plate exactly
         as the still image it replaces. Portrait crops onto the koi; landscape
         gives the art a box of its own aspect, where this is a no-op. */
      const narrow = window.matchMedia("(max-width: 900px)");
      const setFocus = () =>
        gl.uniform2f(u.focus!, narrow.matches ? 0.84 : 0.5, narrow.matches ? 0.74 : 0.5);
      setFocus();
      narrow.addEventListener("change", setFocus);

      const resize = () => {
        const r = canvas.getBoundingClientRect();
        // Capped at 1.75: this is a soft-focus backdrop and the extra samples
        // above that are invisible while the cost is quadratic.
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const w = Math.max(1, Math.round(r.width * dpr));
        const h = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width === w && canvas.height === h) return;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res!, w, h);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      const ringData = new Float32Array(RING_SLOTS * 4);
      const t0 = performance.now();
      lastFrame.current = t0;

      const frame = (now: number) => {
        // Read the clock rather than accumulating, so a dropped frame cannot
        // make the surface stutter or drift out of phase.
        gl.uniform1f(u.time!, (now - t0) / 1000);

        /* Envelope, so the mouth starts and stops rather than snapping open
           mid-syllable. */
        const dt = Math.min((now - lastFrame.current) / 1000, 0.1);
        lastFrame.current = now;
        const target = holding.current ? 1 : 0;
        const tau = target > env.current ? ENV_RISE : ENV_FALL;
        env.current += (target - env.current) * (1 - Math.exp(-dt / tau));
        if (env.current < 0.002 && !holding.current) env.current = 0;

        let mouth = 0;
        if (env.current > 0.002) {
          mouth = mouthAt((now - startedAt.current) / 1000) * env.current;
          /* A ring on each opening, not on a timer: the ripples *are* the
             speech, so the thing making it has to emit them. */
          const open = mouth > RING_AT;
          if (open && !wasOpen.current) pushRing(now, 0.020 + 0.018 * mouth);
          wasOpen.current = open;
        } else {
          wasOpen.current = false;
        }
        gl.uniform1f(u.mouth!, mouth);

        for (let i = 0; i < RING_SLOTS; i++) {
          const R = rings.current[i];
          if (!R) {
            ringData.set([0, 0, 0, 0], i * 4);
            continue;
          }
          const age = (now - R.t0) / 1000;
          const a = R.amp * Math.exp(-age * 1.35);
          ringData.set(
            [MOUTH_X, MOUTH_Y, 0.012 + age * 0.34, a > 0.0004 ? a : 0],
            i * 4
          );
        }
        gl.uniform4fv(u.rings!, ringData);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = onScreen ? requestAnimationFrame(frame) : 0;
      };

      // Draw once up front and declare the surface live off a real frame rather
      // than off the observer firing. If anything above failed we never get
      // here, and the still image simply stays visible.
      gl.uniform1f(u.time!, 0);
      gl.uniform1f(u.mouth!, 0);
      gl.uniform4fv(u.rings!, new Float32Array(RING_SLOTS * 4));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      setLive(true);

      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting && !onScreen) {
            onScreen = true;
            lastFrame.current = performance.now();
            raf = requestAnimationFrame(frame);
          } else if (!e.isIntersecting) {
            onScreen = false;
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
          }
        },
        { rootMargin: "12% 0px" }
      );
      io.observe(host);

      cleanup = () => {
        ro.disconnect();
        io.disconnect();
        narrow.removeEventListener("change", setFocus);
      };
    };

    const ready = (img: HTMLImageElement) =>
      new Promise<void>((res) => {
        if (img.complete && img.naturalWidth) res();
        else img.addEventListener("load", () => res(), { once: true });
      });
    void Promise.all([ready(pond), ready(koi)]).then(start);

    return () => {
      disposed = true;
      onScreen = false;
      if (raf) cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [amp]);

  /* Tabbing away or switching apps mid-hold would otherwise leave the koi
     talking to an empty room forever. */
  useEffect(() => {
    const drop = () => {
      if (holding.current) onSpeakEnd?.();
    };
    window.addEventListener("blur", drop);
    return () => window.removeEventListener("blur", drop);
  }, [onSpeakEnd]);

  return (
    <div
      ref={hostRef}
      className={`water ${className}`.trim()}
      data-live={live}
      data-held={held || undefined}
      /* Pointer capture means the release always comes back here even if the
         finger has wandered off the band. It also turns a scroll into a
         `pointercancel`, which ends the utterance instead of fighting the
         gesture — the band is a third of a phone screen and has no business
         swallowing a scroll. */
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onSpeakStart?.();
      }}
      onPointerUp={() => onSpeakEnd?.()}
      onPointerCancel={() => onSpeakEnd?.()}
    >
      {/* The floor is the original undivided artwork, so anything that stops the
          canvas — no WebGL, Reduce Motion, a failed decode — falls back to the
          plate exactly as drawn rather than to a pond with no fish in it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/koi-single.webp"
        alt="A koi turning in still water, drawn in coloured pencil, its wake spreading across the surface"
        className="water-img"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
      {/* The two layers the shader composites. Never painted by the browser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={pondRef} src="/hero/pond.webp" alt="" aria-hidden="true" className="water-src" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={koiRef} src="/hero/koi.webp" alt="" aria-hidden="true" className="water-src" decoding="async" />
      <canvas ref={canvasRef} className="water-canvas" aria-hidden="true" />
    </div>
  );
}
