import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0b0c0b",
          900: "#0b0c0b",
          800: "#101210",
          700: "#141714",
        },
        accent: {
          DEFAULT: "#d7ff65",
          300: "#e3ff92",
          400: "#d7ff65",
          500: "#d7ff65",
          600: "#b9e849",
          dark: "#12140d",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "DM Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      maxWidth: {
        content: "1180px",
      },
      boxShadow: {
        glass: "inset 0 1px rgba(255,255,255,0.06), 0 14px 40px rgba(0,0,0,0.2)",
        "glass-sm": "inset 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.3)",
        glow: "0 0 80px -10px rgba(215,255,101,0.4)",
      },
      keyframes: {
        waveform: {
          "0%, 100%": { transform: "scaleY(0.35)", opacity: "0.35" },
          "50%": { transform: "scaleY(1)", opacity: "0.9" },
        },
        "pulse-ring": {
          "0%": { opacity: "0.6", transform: "scale(0.9)" },
          "100%": { opacity: "0", transform: "scale(1.8)" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-24px,0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        blink: "blink 1.1s step-end infinite",
        "float-slow": "float-slow 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
