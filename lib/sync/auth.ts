import "server-only";

import { timingSafeEqual } from "node:crypto";
// Re-exported by the Next SDK, so the verifier is guaranteed to be the same
// version as the middleware rather than a second copy of @clerk/backend
// resolved independently.
import { verifyToken } from "@clerk/nextjs/server";

/**
 * Who is this sync request for?
 *
 * Ported unchanged in behaviour from the retired eval dashboard, which is where
 * the macOS app's usage and notes sync used to land. Two modes, chosen at
 * runtime so a missing optional variable never 500s:
 *
 *   1. **Clerk (what production runs).** The app sends its Clerk session token
 *      as `Authorization: Bearer <jwt>`. When `CLERK_SECRET_KEY` (or
 *      `CLERK_JWT_KEY`) is set the JWT is verified and the user id comes from
 *      its `sub` claim, **ignoring any id in the request**. Once configured
 *      this is the only accepted path: an unverifiable or absent token is
 *      rejected, and the shared-token fallback is disabled, so a caller cannot
 *      downgrade themselves into the spoofable mode by dropping the header.
 *   2. **Shared token.** Only when Clerk is not configured. Requires
 *      `x-ingest-token` to match `EVAL_INGEST_TOKEN`, then trusts the
 *      caller-supplied id. Spoofable, and fine only for a private deploy.
 *
 * With neither configured it throws rather than trusting the caller, because
 * the alternative is an endpoint that writes any user's rows on request.
 */
export class SyncAuthError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function resolveUserId(
  request: Request,
  fallbackUserId: string | undefined
): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim() || undefined;
  const jwtKey = process.env.CLERK_JWT_KEY?.trim() || undefined;

  if (secretKey || jwtKey) {
    const header = request.headers.get("authorization") ?? "";
    const jwt = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    if (!jwt) throw new SyncAuthError(401, "unauthorized: missing Bearer token");

    const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let payload: { sub?: string };
    try {
      payload = await verifyToken(jwt, {
        secretKey,
        jwtKey,
        ...(authorizedParties.length ? { authorizedParties } : {}),
      });
    } catch (error) {
      const why = error instanceof Error ? error.message : "token verification failed";
      throw new SyncAuthError(401, `unauthorized: ${why}`);
    }

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) throw new SyncAuthError(401, "unauthorized: verified token has no subject");
    return sub;
  }

  const token = process.env.EVAL_INGEST_TOKEN?.trim() || undefined;
  if (!token) {
    throw new SyncAuthError(
      500,
      "sync auth is not configured: set CLERK_SECRET_KEY, or EVAL_INGEST_TOKEN for the shared-token mode"
    );
  }
  if (!tokensMatch(request.headers.get("x-ingest-token") ?? "", token)) {
    throw new SyncAuthError(401, "unauthorized: missing or invalid x-ingest-token");
  }
  if (!fallbackUserId) {
    throw new SyncAuthError(400, "a userId is required in shared-token mode");
  }
  return fallbackUserId;
}
