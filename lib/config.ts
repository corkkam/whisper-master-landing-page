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
// Direct-download artifacts on Cloudflare R2, served from the `whisper-master-macos`
// bucket's public r2.dev host — the same host the app's Sparkle feeds and model
// mirror use. Keep this host in lock-step with CH_SU_FEED_URL in the app repo's
// Scripts/channel.sh; a link pointing at a bucket the release scripts don't
// upload to serves a stale build indefinitely, which is what it did before.
//
// Note `stable` here is 1.2.8, whose baked SUFeedURL is still the retired
// model.scoopscore.in host — that is the deliberate hard cutover, so a fresh
// stable install will not auto-update until a stable release is cut on this
// bucket. Betas are unaffected: they already poll appcast-beta.xml here.
//
// - `stable` is public: anyone can download it, signed in or not.
// - `beta` is gated: only users with Clerk `publicMetadata.betaAccess === true`
//   see the real link (see app/download/page.tsx). The beta DMG is produced by
//   the beta release channel (CHANNEL=beta) — see the app repo's CLAUDE.md.
export const downloads = {
  stable: "https://pub-98e94ebcf8904c07b38b85605ad49284.r2.dev/WhisperMaster.dmg",
  beta: "https://pub-98e94ebcf8904c07b38b85605ad49284.r2.dev/WhisperMaster-beta.dmg",
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
