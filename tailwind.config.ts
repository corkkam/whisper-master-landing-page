import type { Config } from "tailwindcss";

/**
 * Palette concept: a treated recording room at night.
 *
 * The ground is a flat neutral stack — no gradients, no tinted fields. Every
 * background on the site is one of these six values and nothing between them,
 * so depth comes from the step between surfaces rather than from a blur.
 *
 * The two accents carry meaning and should not be used interchangeably:
 *   ember  → you. Your voice, the live record light, anything human.
 *   signal → the machine. On-device processing, locked-in text, data.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The approved flat dark stack. `ink.950` is the warm near-black used
        // where a surface sits directly under ember.
        ink: {
          DEFAULT: "#000000",
          950: "#131209",
          900: "#000000",
          800: "#181818",
          700: "#1f1f1f",
          600: "#272727",
          500: "#313131",
        },
        haze: {
          DEFAULT: "#9b9b9b",
          bright: "#c4c4c4",
          dim: "#6e6e6e",
        },
        bone: "#f2efe9",
        ember: {
          DEFAULT: "#ff6a3d",
          bright: "#ff8b64",
          deep: "#d94a20",
          // Foreground for text sitting *on* an ember fill — a warm near-black
          // rather than `ink`, which goes cold against the orange. Mirrors
          // `.btn--primary` in globals.css so the modal matches the page CTAs.
          ink: "#1a0a04",
        },
        signal: {
          DEFAULT: "#6ee7df",
          bright: "#9df3ed",
          deep: "#3bbdb4",
        },
      },
      fontFamily: {
        // `display` is the same face as `sans`; the alias only survives so the
        // headline rules read as headline rules.
        display: ["var(--font-sans)", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        label: "0.2em",
        display: "-0.04em",
      },
      transitionTimingFunction: {
        fluid: "cubic-bezier(0.32,0.72,0,1)",
      },
      maxWidth: {
        content: "1240px",
        prose: "62ch",
      },
      boxShadow: {
        raised: "0 18px 50px rgba(0,0,0,0.45)",
        ember: "0 0 70px -12px rgba(255,106,61,0.55)",
        signal: "0 0 70px -12px rgba(110,231,223,0.45)",
      },
      keyframes: {
        "record-breathe": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(255,106,61,0.45)" },
          "70%": { opacity: "0.75", boxShadow: "0 0 0 7px rgba(255,106,61,0)" },
        },
        caret: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-20px,0)" },
        },
      },
      animation: {
        "record-breathe": "record-breathe 2.6s ease-out infinite",
        caret: "caret 1.1s step-end infinite",
        drift: "drift 16s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
