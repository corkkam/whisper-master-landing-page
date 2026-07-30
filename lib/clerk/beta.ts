// Approval flag, stored on Clerk `publicMetadata`.
//
// This single flag is the waitlist gate: `betaAccess === true` means "approved
// off the waitlist" and unlocks the beta download on /download. Joining the
// waitlist deliberately does *not* set it — approval is a manual decision you
// make per user in the Clerk dashboard (Users → Metadata), or programmatically
// with `approveUser()`. See SETUP-WAITLIST.md → "Approving a waitlist member".
//
// One Clerk *production* instance serves both channels — beta and stable users
// share the same account; the only difference is this flag. The *development*
// instance (test keys, local + preview) is a separate userbase for dev work.
//
// The Mac app reads `publicMetadata.betaAccess` after login to decide which
// Sparkle appcast to point at. When the beta ends you flip the flag with
// `setBetaAccess(userId, false)` and the same account rolls onto stable — no
// re-signup.
//
// Server-only: importing `@clerk/nextjs/server` (and using the secret key)
// keeps this module out of any client bundle.
import { clerkClient } from "@clerk/nextjs/server";

/** Date-only stamp (YYYY-MM-DD) for `betaJoinedAt`. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read the flag off an already-loaded Clerk user's public metadata — i.e. "has
 * this user been approved off the waitlist?".
 */
export function isBetaUser(
  publicMetadata: UserPublicMetadata | null | undefined
): boolean {
  return publicMetadata?.betaAccess === true;
}

/**
 * Approve a user off the waitlist (grants the beta download + beta appcast).
 * Idempotent and merge-safe: `updateUserMetadata` deep-merges, so other public
 * metadata is preserved, and `betaJoinedAt` is only stamped the first time.
 *
 * Not called on join — approval is manual. This exists for scripted/bulk
 * approvals; the everyday path is the Clerk dashboard.
 *
 * Pass `current` (e.g. from an already-loaded `currentUser()`) to skip a fetch.
 */
export async function approveUser(
  userId: string,
  current?: UserPublicMetadata | null
): Promise<void> {
  const client = await clerkClient();

  // Resolve existing metadata so we don't clobber an earlier join date.
  let existing = current;
  if (existing === undefined) {
    const user = await client.users.getUser(userId);
    existing = user.publicMetadata;
  }

  const alreadyBeta = existing?.betaAccess === true;
  const joinedAt =
    typeof existing?.betaJoinedAt === "string" ? existing.betaJoinedAt : undefined;

  // Nothing to change — avoid a redundant API write.
  if (alreadyBeta && joinedAt) return;

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      betaAccess: true,
      betaJoinedAt: joinedAt ?? today(),
    },
  });
}

/**
 * Flip beta access on or off for a single user. Use `false` to move a user from
 * beta → stable (e.g. when the beta program ends) without deleting their
 * account. `betaJoinedAt` is left intact as a record of when they joined.
 */
export async function setBetaAccess(
  userId: string,
  enabled: boolean
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { betaAccess: enabled },
  });
}
