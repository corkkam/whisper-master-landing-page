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
  // No `waitlistCount` here on purpose. It used to hold a hardcoded "2,400+"
  // that the hero fell back to whenever Supabase was unreachable at build time
  // — which shipped a number ~1000× the real one to production. The count now
  // comes from the database or is omitted; there is no stand-in to drift.
} as const;

// ─────────────────────────────────────────────────────────────────────────
// DOWNLOADS
// Direct-download artifacts on Cloudflare R2 (served via model.scoopscore.in).
// - `stable` is public: anyone can download it, signed in or not.
// - `beta` is gated: only users with Clerk `publicMetadata.betaAccess === true`
//   see the real link (see app/download/page.tsx). The beta DMG is produced by
//   the beta release channel (CHANNEL=beta) — see the app repo's CLAUDE.md.
export const downloads = {
  stable: "https://model.scoopscore.in/WhisperMaster.dmg",
  beta: "https://model.scoopscore.in/WhisperMaster-beta.dmg",
  // Shown as helper copy under the buttons.
  requirements: "macOS 14 (Sonoma) or later · Apple Silicon",
} as const;
// ─────────────────────────────────────────────────────────────────────────

// Sample lines the hero demo "dictates", cycled on a loop.
export const demoLines: string[] = [
  "Hey team — shipping the on-device model Friday. No cloud, no latency.",
  "Can you review the PR before standup? Left two comments on the parser.",
  "Reschedule the investor call to Thursday at 2 and loop in Priya.",
];
