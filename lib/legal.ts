/**
 * Whisper Master — legal + trust source of truth.
 *
 * Every factual claim on /privacy, /terms and /trust is derived from this file,
 * so the three pages can never drift apart. The data-flow table below was
 * written by reading the Mac app's source, NOT the internal docs — docs 02 and
 * 04 describe analytics as "opt-in", but `AppState.swift:360,370` default both
 * `analyticsEnabled` and `usageSyncEnabled` to `true`. Opt-OUT is the truth and
 * the truth is what ships here.
 *
 * ⚠️ ENTITY DETAILS BELOW ARE PLACEHOLDERS — confirm before publishing.
 * A privacy policy naming the wrong legal entity is worse than none: it is a
 * misrepresentation to the very buyers this page is meant to win.
 */

// ─── Entity ────────────────────────────────────────────────────────────────
// TODO(founder): confirm each of these. `legalEntity` should be the name that
// would appear on an invoice — a sole proprietorship trading name, or the
// registered private-limited name if one exists.
export const entity = {
  /** Trading name shown to users. */
  tradingName: "Whisper Master",
  /** Legal entity that contracts with the user and receives payment. */
  legalEntity: "Corkkam",
  /** Registered place of business. Determines governing law + tax treatment. */
  jurisdiction: "India",
  /** Courts named in the ToS. Use the city of the registered address. */
  courts: "the courts of Bengaluru, Karnataka, India",
  contactEmail: "corkkam.info@gmail.com",
  /** Postal address is legally required on a privacy policy in most of the EU. */
  postalAddress: "TODO — add registered postal address before launch",
} as const;

/** Last substantive revision. Bump when the meaning changes, not on typos. */
export const LEGAL_UPDATED = "2 August 2026";

// ─── What leaves your Mac ──────────────────────────────────────────────────

export type Flow = {
  /** What the network call is. */
  what: string;
  /** Where it goes — named vendor, because "third parties" is not an answer. */
  where: string;
  /** Exactly what is in the payload. Specific fields, not categories. */
  payload: string;
  /** Whether the user can switch it off, and where. */
  control: string;
  /** true when it is on unless the user turns it off. Drives the UI accent. */
  onByDefault: boolean;
  /** true when the app cannot function without it. */
  required: boolean;
};

/**
 * The five — and only five — things that touch the network. Audio is not on
 * this list and never will be; that absence is the product.
 */
export const flows: Flow[] = [
  {
    what: "Sign-in",
    where: "Clerk (authentication provider, United States)",
    payload:
      "Your email address, your name if you provide one, and a session token. Nothing about your dictation.",
    control: "Required to use the app. Delete your account to remove it.",
    onByDefault: true,
    required: true,
  },
  {
    what: "Model download",
    where: "Cloudflare R2 (our file storage)",
    payload:
      "A standard file request. No account data is attached. Your IP address is visible to Cloudflare, as it is to any website you load. Happens once, at roughly 1.5 GB.",
    control: "Required once. Afterwards the app works fully offline.",
    onByDefault: true,
    required: true,
  },
  {
    what: "Update checks",
    where: "Cloudflare R2 (our file storage)",
    payload:
      "Your app version and macOS version, so we can offer the right update. Your IP address is visible to Cloudflare.",
    control: "Disable automatic updates in Settings.",
    onByDefault: true,
    required: false,
  },
  {
    what: "Anonymous product analytics",
    where: "PostHog and Google Analytics",
    payload:
      "Six content-free events: app launched, onboarding finished, dictation completed, permission state, update installed, cleanup model downloaded. Word counts and durations are sent as ranges (“10–24 words”, “15–30s”), never exact figures, and never the words themselves.",
    control: "Settings → General → “Share anonymous usage”. On until you turn it off.",
    onByDefault: true,
    required: false,
  },
  {
    what: "Stats backup",
    where: "Our own dashboard (MongoDB Atlas)",
    payload:
      "A daily summary tied to your account: date, words dictated, number of dictations, total duration, corrections made, and the names of the applications you dictated into. This one is not anonymous — it is how your stats survive a reinstall.",
    control: "Settings → General → “Back up my stats”. On until you turn it off.",
    onByDefault: true,
    required: false,
  },
];

/**
 * The things that never leave, stated as flatly as possible. This list is the
 * marketing asset — resist the urge to hedge it. If any line here ever stops
 * being true, the line comes out of the file before the feature ships.
 */
export const neverLeaves: string[] = [
  "Your audio. It is processed in memory on your Mac and discarded. It is never written to disk, never uploaded, and we could not produce a recording of you if we were asked to.",
  "Your transcribed text. What you dictate goes to your cursor and nowhere else.",
  "Your clipboard, your screen contents, or the contents of any window you dictate into.",
  "Your custom vocabulary and replacement rules. They stay in your local settings.",
];
