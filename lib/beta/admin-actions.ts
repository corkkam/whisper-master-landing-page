"use server";

// Founder-side beta-gate mutations.
//
// SECURITY: like every `"use server"` module, each export here is a public HTTP
// endpoint that anyone can POST to with arbitrary arguments. These two flip the
// only remaining access gate in the product, so an unguarded export here is
// literally a "give me the beta build" button for the whole internet.
// `requireAdmin()` throws rather than returning a boolean, so a forgotten check
// is a crash instead of a silent authorisation bypass.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { approveBeta, revokeBeta } from "./queue";

/**
 * Clerk user ids are `user_` followed by base62. Validated before the id
 * reaches the Clerk API so a malformed argument fails here with a clean result
 * rather than as an unhandled 4xx from the SDK.
 */
const CLERK_USER_ID = /^user_[A-Za-z0-9]{10,64}$/;

export type BetaActionResult = { ok: boolean; mirrored?: boolean; error?: string };

export async function approveBetaUser(userId: string): Promise<BetaActionResult> {
  await requireAdmin();
  if (!CLERK_USER_ID.test(userId)) return { ok: false, error: "Bad user id" };

  try {
    const res = await approveBeta(userId);
    revalidateAdmin();
    return res;
  } catch (e) {
    console.error("[beta] approve failed:", e);
    return { ok: false, error: "Clerk rejected the change" };
  }
}

export async function revokeBetaUser(userId: string): Promise<BetaActionResult> {
  await requireAdmin();
  if (!CLERK_USER_ID.test(userId)) return { ok: false, error: "Bad user id" };

  try {
    const res = await revokeBeta(userId);
    revalidateAdmin();
    return res;
  } catch (e) {
    console.error("[beta] revoke failed:", e);
    return { ok: false, error: "Clerk rejected the change" };
  }
}

/** Both admin pages count approvals, so both go stale on every write. */
function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/beta");
}
