/**
 * Google Analytics 4 + cookie consent — one place for the whole story.
 *
 * The product promise is "nothing leaves your device", so the tag is held back
 * until the visitor says yes. Concretely: gtag.js is never even requested until
 * `wm_consent=granted` exists, and when it does load, Consent Mode v2 defaults
 * are pushed into the dataLayer ahead of it. A visitor who declines or ignores
 * the banner gets no Google cookie and no request to google-analytics.com.
 *
 * Clerk's session cookies are strictly necessary (you can't sign in without
 * them) and are deliberately outside this gate.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

/** No measurement ID (local dev, previews) → no banner, no tag, no cookies. */
export const GA_ENABLED = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID);

export type Consent = "granted" | "denied";

export const CONSENT_COOKIE = "wm_consent";
/** Re-ask after a year, which is the ceiling most DPAs are comfortable with. */
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

/** Fired on the window when the visitor decides, so the tag can react live. */
export const CONSENT_EVENT = "wm:consent";
/** Fired to re-open the banner (footer → "Cookie settings"). */
export const CONSENT_MANAGE_EVENT = "wm:consent-manage";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// ── Consent cookie ────────────────────────────────────────────────────────

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(granted|denied)`)
  );
  return (match?.[1] as Consent) ?? null;
}

export function writeConsent(value: Consent) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}` +
    `; SameSite=Lax${secure}`;

  // Withdrawal has to take effect now, not on next page load: tell a
  // already-running tag to stop and sweep up what it wrote.
  if (value === "denied") {
    gtag("consent", "update", { analytics_storage: "denied" });
    disableGa();
    clearGaCookies();
  }

  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

// ── gtag ──────────────────────────────────────────────────────────────────

/**
 * Define the dataLayer queue and push our Consent Mode defaults. Safe to call
 * repeatedly and safe to call before gtag.js has loaded — that's the point of
 * the queue, and it's why the calls below don't need to be inline <script>s.
 */
let configured = false;

export function initGtag() {
  if (typeof window === "undefined" || configured) return;
  configured = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtagShim() {
    // Must forward `arguments` verbatim — GA reads it as an array-like.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  // Deny everything first, then grant only what the banner actually asked
  // about. Ads storage stays denied: we don't run ads and never ask for them.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("consent", "update", { analytics_storage: "granted" });

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    // App Router navigations don't reload the document, so page views are sent
    // by hand from GoogleAnalytics.tsx — including the first one.
    send_page_view: false,
    anonymize_ip: true,
  });
}

/** Queue a gtag call. No-ops on the server or before consent lands. */
export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.gtag?.(...args);
}

/** GA's documented opt-out flag — stops an already-loaded tag from sending. */
function disableGa() {
  if (!GA_MEASUREMENT_ID) return;
  (window as unknown as Record<string, boolean>)[
    `ga-disable-${GA_MEASUREMENT_ID}`
  ] = true;
}

/**
 * Expire `_ga` / `_gid`. GA sets them on the highest resolvable domain, which
 * we can't read back from `document.cookie`, so expire each name against every
 * plausible domain scope and let the misses fall on the floor.
 */
function clearGaCookies() {
  const parts = window.location.hostname.split(".");
  const domains = [""]; // host-only cookie
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push(`; Domain=.${parts.slice(i).join(".")}`);
  }

  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name || !/^_ga|^_gid$/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
    }
  }
}

// ── Events ────────────────────────────────────────────────────────────────

/**
 * Track a custom GA4 event. Silently does nothing without consent, so callers
 * never have to check first:
 *
 *   track("waitlist_joined", { method: "google" });
 */
export function track(name: string, params?: Record<string, unknown>) {
  gtag("event", name, params);
}
