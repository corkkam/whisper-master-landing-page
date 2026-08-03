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
// bucket via the corkkam custom domain `dl.corkkam.com` — the same host the app's
// Sparkle feeds and model mirror use. Keep this host in lock-step with
// CH_SU_FEED_URL in the app repo's Scripts/channel.sh; a link pointing at a bucket
// the release scripts don't upload to serves a stale build indefinitely, which is
// what it did before.
//
// The host moved r2.dev → dl.corkkam.com on 2026-08-04. Same bucket, so `models/`
// and every artifact came along unchanged — it is a DNS/alias change, not a data
// migration. The custom domain also gets edge caching and escapes r2.dev's
// public-bucket rate limits.
//
// - `stable` is public and unauthenticated: anyone can download it, signed in or
//   not, and /download renders this link for signed-out visitors. The *app* still
//   requires Clerk sign-in on first launch — that gate is deliberate and stays
//   (see the vault's decisions note), so don't let download copy imply otherwise.
// - `beta` is gated: only users with Clerk `publicMetadata.betaAccess === true`
//   see the real link (see app/download/page.tsx). The beta DMG is produced by
//   the beta release channel (CHANNEL=beta) — see the app repo's CLAUDE.md.
export const downloads = {
  stable: "https://dl.corkkam.com/WhisperMaster.dmg",
  beta: "https://dl.corkkam.com/WhisperMaster-beta.dmg",
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
