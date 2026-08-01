// Server-only waitlist reads/writes that are NOT client-callable.
//
// SECURITY — why this file exists, separate from `actions.ts`:
// Every exported async function in a `"use server"` module is compiled into a
// publicly reachable HTTP endpoint. Next.js assigns each one a stable action id
// and ships that id in the client bundle; anyone can then POST to the app with
// a `Next-Action: <id>` header and invoke it with arbitrary arguments. A comment
// saying "call this from the webhook only" enforces nothing.
//
// `awardDonationPoints` used to live in `actions.ts`. It takes the target user
// id and the point total as parameters and performs no auth check, so as a
// server action it let any unauthenticated visitor grant themselves (or anyone)
// unlimited waitlist points. It is now here, in a plain module that `server-only`
// keeps out of client bundles, and is reachable only from other server code.
//
// Rule of thumb: `"use server"` is for functions a browser is *meant* to call.
// Everything else — webhook helpers, build-time reads, internal mutations —
// belongs in a module like this one.
import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Awards donation points after a confirmed payment webhook.
 *
 * Callers MUST have verified the payment provider's webhook signature before
 * calling this — it trusts `userId` and `points` completely.
 */
export async function awardDonationPoints(userId: string, points: number) {
  if (!Number.isSafeInteger(points) || points <= 0) return { ok: false };

  const supabase = createAdminClient();
  const { data, error: fetchErr } = await supabase
    .from("waitlist_entries")
    .select("points")
    .eq("user_id", userId)
    .single();

  if (fetchErr || !data) return { ok: false };

  const { error } = await supabase
    .from("waitlist_entries")
    .update({
      points: ((data as Record<string, unknown>).points as number ?? 0) + points,
    })
    .eq("user_id", userId);
  return { ok: !error };
}

/** Total signups — drives the live social-proof number on the landing page. */
export async function getWaitlistCount(): Promise<number | null> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("[waitlist] getWaitlistCount failed:", error.message);
      return null;
    }
    return count;
  } catch (e) {
    // e.g. missing env at build time — fall back to omitting the number.
    console.error("[waitlist] getWaitlistCount failed:", e);
    return null;
  }
}

export type LeaderRow = {
  rank: number;
  display_name: string;
  total_points: number;
  referrals_count: number;
};

/**
 * Public top-N leaderboard (first names + points only — `top_leaderboard`
 * deliberately returns no emails). Render it from a server component; do not
 * re-export this through `actions.ts`, which would make it a public endpoint
 * that anyone could page through.
 */
export async function getLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const supabase = createAdminClient();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 100);
  const { data } = await supabase.rpc("top_leaderboard", { p_limit: safeLimit });
  return (data as LeaderRow[] | null) ?? [];
}
