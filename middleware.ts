import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";

const withClerk = clerkMiddleware();

/**
 * Clerk, plus a guard against session cookies it cannot verify.
 *
 * `clerkMiddleware()` on its own *throws* when the browser presents a session
 * or handshake token signed by a Clerk instance whose signing key is not in the
 * JWKS the current secret key resolves to. On Vercel an unhandled throw here is
 * `MIDDLEWARE_INVOCATION_FAILED` — a 500 on every route in the matcher, which
 * is all of them.
 *
 * That is not hypothetical. This site runs three Clerk instances (production,
 * preview, local), and after the preview instance was rotated, browsers kept
 * sending a `__session` from the retired one:
 *
 *     Handshake token verification failed: Unable to find a signing key in JWKS
 *     that matches the kid='ins_3GfF…'. The following kid is available:
 *     'ins_3FrB…' (reason=jwk-kid-mismatch)
 *
 *     count=10  routes=/middleware  2026-08-05 → 2026-08-13
 *
 * The keys on that deployment were *correct* and consistent — the only broken
 * thing was a cookie — yet the whole site 500'd for anyone carrying one, with
 * no way back other than clearing cookies by hand. For a public marketing page
 * whose job is to hand out a download, that is the worst available outcome: it
 * fails closed, on the funnel, for returning visitors specifically.
 *
 * So an unverifiable token is treated as what it actually is — no session:
 * strip Clerk's cookies from the request, run the same middleware again so the
 * visitor is authenticated as anonymous, and expire the offending cookies on
 * the way out so the browser stops sending them. A signed-out marketing page is
 * correct and recoverable; a 500 is neither.
 *
 * Two things it deliberately does not do:
 *
 *   - **Retry a mutation.** Only GET and HEAD are replayed. Rebuilding a
 *     request with a body to strip a cookie is a good way to silently mangle a
 *     POST, and a write submitted with an unverifiable session *should* fail
 *     loudly rather than quietly execute as anonymous.
 *   - **Swallow the diagnosis.** It still logs, because a token from an
 *     unknown instance can also mean the publishable and secret keys have
 *     drifted apart, and that needs fixing in the dashboard rather than being
 *     absorbed here forever.
 */

/** Cookie name prefixes Clerk owns. Matched as prefixes because Clerk suffixes
 *  them per-instance (`__session_a1b2c3`) when several share a domain. */
const CLERK_COOKIE_PREFIXES = ["__session", "__client_uat", "__clerk", "__refresh"];

const isClerkCookie = (name: string) =>
  CLERK_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix));

/**
 * Is this the failure above, rather than a bug worth surfacing? Matched on the
 * message because Clerk raises it as a plain `Error` with the reason inline —
 * there is no typed error to catch. Anything else is re-thrown untouched.
 */
function isUnverifiableToken(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("jwk-kid-mismatch") ||
    message.includes("Unable to find a signing key in JWKS") ||
    message.includes("Handshake token verification failed") ||
    // The local-development face of the same problem: Clerk gives up after
    // bouncing through the handshake too many times.
    message.includes("infinite redirect loop")
  );
}

/**
 * Every scope the cookie might have been set at. A cookie written against
 * `.corkkam.com` is invisible to a host-scoped `Set-Cookie` deletion, so the
 * host and each of its parents with at least two labels all get one. This runs
 * only on the failure path, so the handful of extra headers costs nothing.
 */
function expireClerkCookies(response: NextResponse, names: string[], host: string) {
  const labels = host.split(".");
  const domains: (string | undefined)[] = [undefined];
  for (let i = 1; i <= labels.length - 2; i++) domains.push(`.${labels.slice(i).join(".")}`);

  for (const name of names) {
    for (const domain of domains) {
      response.cookies.set({
        name,
        value: "",
        maxAge: 0,
        path: "/",
        domain,
        sameSite: "lax",
        secure: true,
      });
    }
  }
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    return await withClerk(request, event);
  } catch (error) {
    if (!isUnverifiableToken(error)) throw error;
    if (request.method !== "GET" && request.method !== "HEAD") throw error;

    const stale = request.cookies.getAll().map((c) => c.name).filter(isClerkCookie);

    console.error(
      `[middleware] Discarding ${stale.length} unverifiable Clerk cookie(s) ` +
        `(${stale.join(", ") || "none named"}) on ${request.nextUrl.pathname} ` +
        `and continuing as signed out. If this is not a rotated instance, check ` +
        `that NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are from ` +
        `the same Clerk instance. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`
    );

    // Replay the request as an anonymous visitor. `NextRequest` is rebuilt
    // rather than mutated because its cookies are read-only on the way in.
    const headers = new Headers(request.headers);
    const kept = request.cookies
      .getAll()
      .filter((c) => !isClerkCookie(c.name))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (kept) headers.set("cookie", kept);
    else headers.delete("cookie");

    const anonymous = new NextRequest(request.url, { headers, method: request.method });
    const result = await withClerk(anonymous, event);

    const response =
      result instanceof NextResponse
        ? result
        : result
          ? new NextResponse(result.body, result)
          : NextResponse.next();

    expireClerkCookies(response, stale, request.nextUrl.hostname);
    return response;
  }
}

/**
 * Everything except the machine endpoints.
 *
 * `/api/usage`, `/api/notes` and `/api/eval/*` are called by the Mac app and by
 * `push-run.mjs`, not by a browser with a session. They authenticate
 * themselves — `verifyToken` on the Bearer token, or a shared ingest token —
 * so Clerk's request-level auth buys them nothing, and running it over them is
 * actively harmful: `clerkMiddleware()` **throws** while parsing a malformed
 * `Authorization: Bearer` value, and on Vercel a throw here is a 500 on the
 * route before the handler ever runs.
 *
 * That is not hypothetical. A truncated token produced
 *
 *     Error [SyntaxError]: Unexpected end of data
 *         at async middleware (middleware.ts:101)
 *
 * and a 500 where the route would have answered `401 unauthorized: missing
 * Bearer token`. The retired-cookie guard below does not catch it, because it
 * matches on the JWKS and handshake messages and this is a parse failure. For
 * sync that would be the worst shape of failure available: the app retries,
 * every retry 500s, and the server looks broken rather than the token looking
 * wrong.
 *
 * Excluded in both patterns on purpose. The first one is broad enough to match
 * `/api/...` on its own, so listing them only in the second would not exclude
 * them at all.
 */
/**
 * Written out in full rather than composed from a constant: Next statically
 * analyses these at build time and silently ignores a pattern it cannot read,
 * which means a template literal here produces no error and no exclusion. That
 * cost an hour once.
 */
export const config = {
  matcher: [
    "/((?!api/usage|api/notes|api/eval|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/usage|/notes|/eval)|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
