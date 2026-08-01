import "server-only";

/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Fail-open vs fail-closed. The old version returned `true` whenever
 * `TURNSTILE_SECRET_KEY` was unset, which meant a missing env var in production
 * silently removed bot protection — the kind of failure nobody notices. But
 * flipping straight to fail-closed would take the waitlist offline the moment
 * this deploys, since Turnstile isn't configured yet.
 *
 * So "no bot check" is now a *deliberate, auditable* choice rather than an
 * accident:
 *   • secret set                    → verify for real (the goal).
 *   • not production                → skip, so local dev works unconfigured.
 *   • production, TURNSTILE_DISABLED=true → skip, with a loud warning. Use this
 *     only as a temporary state while you set Turnstile up.
 *   • production, secret missing, no explicit opt-out → FAIL CLOSED. A
 *     half-configured or accidentally-unset deployment refuses rather than
 *     quietly waving bots through.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";
  const explicitlyDisabled = process.env.TURNSTILE_DISABLED === "true";

  if (!secret) {
    if (!isProduction) return true; // local dev: not configured → skip
    if (explicitlyDisabled) {
      console.warn(
        "[turnstile] TURNSTILE_DISABLED=true — bot check skipped in production. " +
          "Set TURNSTILE_SECRET_KEY and remove this flag."
      );
      return true;
    }
    console.error(
      "[turnstile] TURNSTILE_SECRET_KEY is not set in production — failing closed. " +
        "Set it, or set TURNSTILE_DISABLED=true to opt out deliberately."
    );
    return false;
  }

  if (!token) return false;

  // The client sends this sentinel when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset
  // (the widget renders nothing). It must never satisfy a *configured* server,
  // or anyone could post "dev-skip" and walk straight past the check.
  if (token === "dev-skip") return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        cache: "no-store",
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
