/**
 * The canonical origin, in one place.
 *
 * Order matters here and is defensive on purpose. `NEXT_PUBLIC_SITE_URL` is
 * `http://localhost:3000` in `.env.local` and `.env.local.example`, so if that
 * same value ever reaches a Vercel environment — a copied env file, a careless
 * `vercel env add` — a naive read would publish a sitemap and robots.txt full
 * of `http://localhost:3000` URLs. That is silent, survives review, and tells
 * Google the site does not exist. So a localhost value is only trusted when we
 * are actually running locally.
 */
const PRODUCTION_ORIGIN = "https://whispermaster.app";

function isLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(url);
}

export function siteUrl(): string {
  const strip = (u: string) => u.replace(/\/+$/, "");

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && (!isLocal(explicit) || process.env.NODE_ENV !== "production")) {
    return strip(explicit);
  }

  // Preview deployments describe themselves, so preview share cards and
  // sitemaps point at the build being reviewed rather than production.
  const vercel = (process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL)?.trim();
  if (vercel) return strip(`https://${vercel.replace(/^https?:\/\//, "")}`);

  return PRODUCTION_ORIGIN;
}
