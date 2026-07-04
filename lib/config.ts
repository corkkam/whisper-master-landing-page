/**
 * Whisper Master — single source of truth for product copy + feature flags.
 * Edit this file to rebrand or retune without touching components.
 */

// ─────────────────────────────────────────────────────────────────────────
// 3D HERO KILL SWITCH
// Flip to `false` to instantly disable the WebGL shader-aurora hero and fall
// back to the pure-CSS aurora everywhere. Use this if a laptop chokes mid-pitch.
export const FEATURE_3D_HERO = true;

// Clerk handles email OTP natively — no custom SMTP required.
// Set to false to make the waitlist Google-only.
export const EMAIL_AUTH_ENABLED = true;
// ─────────────────────────────────────────────────────────────────────────

export const product = {
  name: "Whisper Master",
  tagline: "Voice-to-text that never leaves your device.",
  contactEmail: "corkkam.info@gmail.com",
  // Keep this honest — you want to be able to defend it in the pitch.
  waitlistCount: "2,400+",
} as const;

// Sample lines the hero demo "dictates", cycled on a loop.
export const demoLines: string[] = [
  "Hey team — shipping the on-device model Friday. No cloud, no latency.",
  "Can you review the PR before standup? Left two comments on the parser.",
  "Reschedule the investor call to Thursday at 2 and loop in Priya.",
];
