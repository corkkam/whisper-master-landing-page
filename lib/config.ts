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
// - The beta link is NOT here on purpose. It lives in `lib/config.server.ts`
//   behind `server-only`, because everything exported here is fair game for a
//   client component to import, and bundlers do not tree-shake a single property
//   off an exported object — Hero/Unit import `downloads` for `.requirements`, so
//   anything in this object ships in the public homepage JS. A gated URL that
//   ships to every visitor is not gated. See app/download/page.tsx.
// ⚠️ `stable` points at the VERSIONED key, not the WhisperMaster.dmg alias, and
// must be bumped on every stable release. The alias is unsafe to link:
// publish-dmg.sh overwrites it in place, and Cloudflare serves a **stale cached
// body** for that URL afterwards while HEAD on the same URL reports the new
// object. On 2026-08-04 that meant dl.corkkam.com/WhisperMaster.dmg kept serving
// 1.2.8 — carrying the retired model.scoopscore.in feed and the *exposed*
// SUPublicEDKey — for an unbounded time after 1.2.9 shipped. `cf-cache-status:
// DYNAMIC` on the HEAD response does not mean the GET path is uncached; do not
// trust it. A versioned key is written once and never overwritten, so it cannot
// go stale.
//
// Confirmed again on the 1.2.10 release: minutes after publish-dmg.sh uploaded
// both keys, a plain GET on the alias still returned the 1.2.9 body while the
// versioned key returned 1.2.10 (different sha256, verified by mounting each).
// So this is the normal behaviour of that alias, not a one-off.
//
// To go back to the alias, add a Cloudflare cache purge for that exact URL as the
// last step of publish-dmg.sh; until that exists, keep linking the versioned key.
// Versioning was reset to 1.0.0 for the launch, so this number is *lower* than
// the 1.2.x builds referenced above. That is deliberate, not a typo: 1.0.0 is the
// newest build (its CFBundleVersion still increases, which is what Sparkle reads).
export const downloads = {
  stable: "https://dl.corkkam.com/WhisperMaster-1.0.0.dmg",
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
