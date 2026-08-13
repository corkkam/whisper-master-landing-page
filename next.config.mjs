/** @type {import('next').NextConfig} */

// Security headers applied to every response.
//
// The CSP is deliberately explicit about third parties rather than using a
// wildcard: Clerk (auth), Cloudflare (Turnstile), Google (Analytics) and Vercel
// (analytics/speed-insights) are the only origins allowed to run script or
// receive beacons. Adding a vendor means adding it here.
//
// `'unsafe-inline'` in script-src is still required by Next.js's bootstrap;
// removing it needs the nonce-based CSP (`experimental.strictNextHead` +
// middleware nonce), which is a larger change than this pass. `'unsafe-eval'`,
// on the other hand, is only needed by React Refresh in `next dev` — a
// production build never evals — so it is added below only when NODE_ENV is not
// production. The value here is a meaningful reduction from none; the eval gap
// no longer exists in prod.
const isDev = process.env.NODE_ENV !== "production";

// `connect-src` used to allow `https://*.supabase.co` — every Supabase project on
// the planet, so a script foothold could beacon data to an attacker's own
// project. Nothing in this app talks to Supabase from the browser (all access is
// the service-role client in lib/supabase/server.ts, behind `server-only`), so we
// pin the one project host derived from the env var and drop the wildcard. If the
// var is unset at build time, the entry is simply omitted.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "https://*.clerk.accounts.dev https://clerk.whisper.corkkam.com https://challenges.cloudflare.com https://www.googletagmanager.com https://va.vercel-scripts.com",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  scriptSrc,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self' data:",
  [
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.whisper.corkkam.com",
    supabaseOrigin,
    "https://challenges.cloudflare.com https://www.google-analytics.com https://region1.google-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.whisper.corkkam.com",
  "media-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for two years, including subdomains. Safe here: the site is
  // Vercel-hosted and HTTPS-only already.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with `frame-ancestors` above, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  // The dev server only serves /_next/* to origins it has been told about.
  // Without this, opening the dev site through the Tailscale hostname returns
  // the HTML but 404s every asset, so the page renders unstyled and blank.
  // Dev-only setting; it has no effect on a production build.
  allowedDevOrigins: ["linux-1.tail75ba2a.ts.net", "linux-1", "100.90.239.81"],
  // three ships modern ESM; transpiling keeps older bundlers happy. (R3F and
  // drei used to be listed here, but nothing imports them any more.)
  transpilePackages: ["three"],
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
