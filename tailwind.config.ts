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
        // Near-black base — never pure #000.
        base: {
          DEFAULT: "#0A0A0F",
          900: "#0A0A0F",
          800: "#0D0D12",
          700: "#101018",
        },
        accent: {
          DEFAULT: "#6366F1", // electric indigo
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
        },
        violet: {
          glow: "#8B5CF6",
        },
        cyan: {
          glow: "#22D3EE",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
      maxWidth: {
        content: "1180px",
      },
      boxShadow: {
        glass: "inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 60px -24px rgba(0,0,0,0.7)",
        "glass-sm": "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px -16px rgba(0,0,0,0.6)",
        glow: "0 0 80px -10px rgba(99,102,241,0.45)",
      },
      keyframes: {
        "waveform": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        "pulse-ring": {
          "0%": { opacity: "0.6", transform: "scale(0.9)" },
          "100%": { opacity: "0", transform: "scale(1.8)" },
        },
        "blink": {
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
        "blink": "blink 1.1s step-end infinite",
        "float-slow": "float-slow 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
