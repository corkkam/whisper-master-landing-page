/** @type {import('next').NextConfig} */

// Security headers applied to every response.
//
// The CSP is deliberately explicit about third parties rather than using a
// wildcard: Clerk (auth), Cloudflare (Turnstile), Google (Analytics) and Vercel
// (analytics/speed-insights) are the only origins allowed to run script or
// receive beacons. Adding a vendor means adding it here.
//
// `'unsafe-inline'`/`'unsafe-eval'` in script-src are required by Next.js's
// bootstrap and React refresh; tightening those needs the nonce-based CSP
// (`experimental.strictNextHead` + middleware nonce), which is a larger change
// than this pass — the value here is still a meaningful reduction from none.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.whisper.corkkam.com https://challenges.cloudflare.com https://www.googletagmanager.com https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.whisper.corkkam.com https://*.supabase.co https://challenges.cloudflare.com https://www.google-analytics.com https://region1.google-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
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
