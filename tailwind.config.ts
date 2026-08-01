import type { Config } from "tailwindcss";

/**
 * Palette concept: a treated recording room at night.
 *
 * The two accents carry meaning and should not be used interchangeably:
 *   ember  → you. Your voice, the live record light, anything human.
 *   signal → the machine. On-device processing, locked-in text, data.
 *
 * Text is warm (`bone`) on a cool ground (`ink`) — that contrast *is* the
 * product thesis: warm human speech into a cool private machine.
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
        ink: {
          DEFAULT: "#07090e",
          900: "#07090e",
          800: "#0b0f17",
          700: "#101623",
          600: "#18202f",
        },
        haze: {
          DEFAULT: "#8a94a8",
          bright: "#aab3c4",
          dim: "#5c6577",
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
        display: ["var(--font-display)", "Bricolage Grotesque", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        label: "0.2em",
        display: "-0.045em",
      },
      maxWidth: {
        content: "1240px",
        prose: "62ch",
      },
      boxShadow: {
        raised: "inset 0 1px rgba(255,255,255,0.07), 0 18px 50px rgba(0,0,0,0.45)",
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
