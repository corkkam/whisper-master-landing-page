import "server-only";

import { auth } from "@clerk/nextjs/server";

/**
 * Who is allowed to see the sales pipeline.
 *
 * The allow-list is an environment variable rather than a Clerk metadata flag,
 * which is the opposite of how `betaAccess` works elsewhere in this codebase.
 * That inconsistency is deliberate.
 *
 * `betaAccess` grants a *download*. If it were set wrongly the cost is that
 * someone gets a beta build early. The pipeline contains every prospect's name,
 * email, firm, and the reason their organisation cannot use a cloud vendor —
 * commercially sensitive on our side and, for a law firm or a clinic, sensitive
 * on theirs. A metadata flag is writable from the Clerk dashboard, by any
 * integration holding the secret key, and by any future code path that calls
 * `updateUserMetadata` with a spread. An env var is writable only by whoever
 * controls the deployment.
 *
 * Fails closed: unset means nobody, including in development. An admin surface
 * that is wide open whenever it is misconfigured is worse than one that is
 * occasionally locked out of.
 */
function adminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function isAdmin(): Promise<boolean> {
  const ids = adminIds();
  if (ids.size === 0) {
    console.warn(
      "[admin] ADMIN_USER_IDS is not set — the pipeline is locked for everyone. " +
        "Set it to your Clerk user id (Clerk dashboard → Users → copy user id)."
    );
    return false;
  }
  const { userId } = await auth();
  return Boolean(userId && ids.has(userId));
}

/**
 * Guard for server actions. Throws rather than returning false so that a caller
 * that forgets to check the result still fails safe — an admin action that
 * silently no-ops on an unauthorised call looks identical to one that worked.
 */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId || !adminIds().has(userId)) {
    throw new Error("Not authorised");
  }
  return userId;
}
