"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Living water.
 *
 * The illustrations are pencil contour lines standing in for a water surface, so
 * the honest way to animate them is to move the surface — not to draw something
 * on top of it. This samples the artwork through a travelling flow field that
 * displaces the UV, so the drawn lines glide along their own length.
 *
 * Two things separate this from a wobble, and both were wrong in the first pass:
 *
 *   1. **The waves travel.** Every term moves in the same direction as its axis,
 *      so crests cross the frame. Mixing the signs makes the waves *stand*
 *      instead — the whole surface pulses in place, in sync, and that is what
 *      reads as hypnotic. Water flows; it does not breathe.
 *   2. **Solids stay solid.** The koi, the lily pads, the stones and the hand
 *      are keyed out of the displacement by saturation and value, so they hold
 *      their shape while the water moves around them. Rippling the fish along
 *      with the surface is the single thing that gave the whole effect away.
 *
 * Timing is read from the clock, never accumulated per frame, so a dropped frame
 * cannot make the surface stutter or drift out of phase.
 *
 * A note on the house rules: the app's §6 forbids perpetual motion, on the
 * grounds that the record dot's breath is the only thing allowed to loop. This
 * deliberately breaks that, at the client's direction — the water is scenery
 * rather than a status readout, so it is not competing for the same meaning.
 * It still stops dead when off screen and under Reduce Motion.
 */

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
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_amp;
uniform vec2  u_res;
uniform vec2  u_img;

/*
 * The flow field.
 *
 * Every term travels in the same direction as its axis, sin(k*x - w*t), so
 * the crests move *across* the frame. The earlier version mixed the signs, which
 * made the waves stand rather than travel: the whole surface pulsed in place, in
 * sync, which is what read as hypnotic. Water does not breathe; it flows.
 *
 * Three components at incommensurable wavelengths, so the pattern never visibly
 * repeats and no single beat dominates.
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
 * How much of this pixel is water.
 *
 * The subject of every one of these drawings is a solid object floating on a
 * surface — a koi, lily pads, stones, a hand. Displacing those along with the
 * water made them ripple like jelly, which is the single thing that gave the
 * whole effect away.
 *
 * The artwork separates them cleanly enough to key on: the water is pale and
 * near-monochrome (cream paper with grey pencil), while the objects carry real
 * saturation or real darkness. So saturation and value give us a mask, and the
 * displacement is scaled by it — full in open water, zero on the fish, and a
 * smooth ramp across the boundary so no edge smears.
 */
float waterness(vec2 uv) {
  vec3 c = texture2D(u_tex, vec2(uv.x, 1.0 - uv.y)).rgb;
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = (mx - mn) / max(mx, 0.001);
  float dark = 1.0 - mx;
  /* Saturated *or* dark counts as solid. */
  float solid = max(smoothstep(0.13, 0.30, sat), smoothstep(0.42, 0.70, dark));
  return 1.0 - solid;
}

void main() {
  /* Cover: fill the canvas without distorting the artwork's own aspect. */
  float canvasA = u_res.x / max(u_res.y, 1.0);
  float imgA = u_img.x / max(u_img.y, 1.0);
  vec2 scale = canvasA > imgA ? vec2(1.0, canvasA / imgA) : vec2(imgA / canvasA, 1.0);
  vec2 base = (v - 0.5) / scale + 0.5;

  /* Blur the mask over a small neighbourhood, so the fish's edge fades into the
     moving water instead of leaving a visible seam where displacement stops. */
  float r = 0.012;
  float w = waterness(base) * 0.36
          + waterness(base + vec2( r, 0.0)) * 0.16
          + waterness(base + vec2(-r, 0.0)) * 0.16
          + waterness(base + vec2(0.0,  r)) * 0.16
          + waterness(base + vec2(0.0, -r)) * 0.16;
  w = clamp(w, 0.0, 1.0);
  /* Bias toward holding the object still: a little water frozen at the fish's
     edge is invisible, a rippling fish is not. */
  w = w * w;

  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v.x * aspect, v.y);
  vec2 d = flow(p * 2.6, u_time);
  vec2 offset = vec2(d.x * 0.6, d.y) * u_amp * w;

  vec2 uv = clamp(base + offset, vec2(0.0005), vec2(0.9995));
  gl_FragColor = vec4(texture2D(u_tex, vec2(uv.x, 1.0 - uv.y)).rgb, 1.0);
}`;

export function Water({
  src,
  alt,
  /**
   * Displacement amplitude in UV, applied only where the mask says water.
   * 0.010 is the house value — roughly 12px of travel on a 1200px plate, which
   * reads clearly now that it is confined to the surface. Below ~0.006 nobody
   * notices it at all, which is worse than not doing it.
   */
  amp = 0.01,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  amp?: number;
  className?: string;
  priority?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!host || !canvas || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let onScreen = false;
    let disposed = false;
    let cleanupResize: (() => void) | undefined;

    const start = async () => {
      if (disposed) return;
      // Safari will hand back a texture from an `<img>` whose `complete` is
      // true but whose pixels are not decoded yet, which uploads blank. Waiting
      // on decode() is the fix, and it is cheap when already decoded.
      try {
        await img.decode?.();
      } catch {
        /* Non-fatal: fall through and try the upload anyway. */
      }
      if (disposed) return;
      const gl = canvas.getContext("webgl", {
        // Opaque on purpose. Safari composites a non-premultiplied alpha buffer
        // unreliably and can end up presenting nothing at all; the artwork has
        // no transparency to preserve, so this costs us none.
        alpha: false,
        antialias: false,
        // The surface is redrawn every frame it is visible, so there is nothing
        // worth preserving between them.
        preserveDrawingBuffer: false,
      });
      if (!gl) return; // The <img> underneath is already showing.

      const sh = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn("water:", gl.getShaderInfoLog(s));
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

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      const u = {
        tex: gl.getUniformLocation(prog, "u_tex"),
        time: gl.getUniformLocation(prog, "u_time"),
        amp: gl.getUniformLocation(prog, "u_amp"),
        res: gl.getUniformLocation(prog, "u_res"),
        img: gl.getUniformLocation(prog, "u_img"),
      };
      gl.uniform1i(u.tex!, 0);
      gl.uniform1f(u.amp!, amp);
      gl.uniform2f(u.img!, img.naturalWidth, img.naturalHeight);

      const resize = () => {
        const r = canvas.getBoundingClientRect();
        // Capped at 1.75: this is a soft-focus backdrop, and the extra samples
        // above that are not visible while the cost is quadratic.
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
      cleanupResize = () => ro.disconnect();

      const t0 = performance.now();
      const frame = (now: number) => {
        // Read the clock rather than accumulating, so a dropped frame cannot
        // make the surface stutter or drift.
        gl.uniform1f(u.time!, (now - t0) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = onScreen ? requestAnimationFrame(frame) : 0;
      };

      // Draw once up front, then declare the surface live off that real frame
      // rather than off the observer firing. If anything above failed we never
      // get here, and the still image simply stays visible.
      gl.uniform1f(u.time!, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      setLive(true);

      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting && !onScreen) {
            onScreen = true;
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
      const prevCleanup = cleanupResize;
      cleanupResize = () => {
        prevCleanup?.();
        io.disconnect();
      };
    };

    if (img.complete && img.naturalWidth) void start();
    else img.addEventListener("load", () => void start(), { once: true });

    return () => {
      disposed = true;
      onScreen = false;
      if (raf) cancelAnimationFrame(raf);
      cleanupResize?.();
    };
  }, [amp]);

  return (
    <div ref={hostRef} className={`water ${className}`.trim()} data-live={live}>
      {/* The still artwork is the floor: it shows before GL is ready, when
          WebGL is unavailable, and under Reduce Motion. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="water-img"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
      <canvas ref={canvasRef} className="water-canvas" aria-hidden="true" />
    </div>
  );
}
