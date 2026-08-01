"use server";

// SECURITY — everything exported from this file is a PUBLIC HTTP ENDPOINT.
//
// Next.js compiles each exported async function in a `"use server"` module into
// a server action with a stable id that ships in the client bundle. Anyone can
// POST to the app with that id and call the function with arbitrary arguments —
// there is no implicit "only my own UI can call this".
//
// So every function here must:
//   1. establish identity itself via `auth()` / `currentUser()`, and
//   2. derive all security-relevant values (user id, email) from that session,
//      never from its parameters.
//
// Helpers that are NOT meant to be browser-callable — webhook handlers, build
// -time reads, internal mutations — belong in `./queries.ts`, which is guarded
// by `server-only` and compiles to no endpoint at all.

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { isBetaUser } from "@/lib/clerk/beta";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { waitlistSchema, type WaitlistInput } from "./schema";
import { REFERRAL_COOKIE } from "./constants";
import type { DonationTierKey } from "./points";

// ── waitlist write (Clerk-verified, referral-aware) ───────────────────────────

export type SubmitResult =
  | { ok: true; position: number; status: string }
  | { ok: false; error: string };

export async function submitWaitlist(
  input: WaitlistInput,
  turnstileToken: string | null
): Promise<SubmitResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  // Bot check. Clerk already proves a human owns the email, but this endpoint is
  // the one that mints waitlist positions and referral credit, so it gets its own
  // gate — scripted multi-account farming is the abuse this actually stops.
  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false, error: "Couldn't verify you're human — please retry." };
  }

  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!userEmail) return { ok: false, error: "No email address found on your account." };

  const supabase = createAdminClient();

  // Referral only attaches on first join (not on re-submit).
  const cookieStore = await cookies();
  const { data: existing } = await supabase
    .from("waitlist_entries")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const referredBy = existing ? null : cookieStore.get(REFERRAL_COOKIE)?.value ?? null;

  const d = parsed.data;
  const payload: Record<string, unknown> = {
    user_id: userId,
    email: userEmail,
    full_name: d.fullName,
    company: d.company || null,
    role: d.role,
    use_case: d.useCase || null,
    platform: d.platform,
    referral_source: d.referralSource ?? null,
  };
  if (referredBy) payload.referred_by = referredBy;

  // Conflict on `user_id`, not `email`: the Clerk session is the identity here,
  // and `email` is only a mirrored attribute. Keying on email meant a second
  // Clerk account that verified the same address would silently take over the
  // first account's row (and its position, points and referral code).
  const { data, error } = await supabase
    .from("waitlist_entries")
    .upsert(payload, { onConflict: "user_id" })
    .select("position, status")
    .single();

  if (error || !data) {
    // Log the detail server-side; return a generic message. Postgres errors name
    // tables, columns and constraints — free schema recon for an attacker.
    console.error("[waitlist] submitWaitlist failed:", error?.code, error?.message);
    return { ok: false, error: "Couldn't save your spot — please try again." };
  }

  if (referredBy) {
    cookieStore.set(REFERRAL_COOKIE, "", { maxAge: 0, path: "/" });
  }

  // NOTE: joining does *not* grant beta access. The entry lands as `pending`
  // and stays there until someone is approved from the Clerk dashboard
  // (publicMetadata.betaAccess = true) — see SETUP-WAITLIST.md → "Approving a
  // waitlist member". `getDashboard` reconciles the Supabase status afterwards.
  return { ok: true, position: data.position, status: data.status };
}

// ── social share points ───────────────────────────────────────────────────────

export async function claimSocial(network: "x" | "linkedin") {
  const { userId } = await auth();
  if (!userId) return { ok: false as const };

  // Whitelist the parameter: it reaches a SECURITY DEFINER function and the
  // caller controls it. (The column also has a CHECK constraint — this is the
  // belt to its braces, and it fails cleanly rather than as a DB error.)
  if (network !== "x" && network !== "linkedin") return { ok: false as const };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("claim_social", {
    p_network: network,
    p_user_id: userId,
  });
  return { ok: !error };
}

// ── donation / payment support (placeholder — wire payment webhook here) ──────

export type DonationResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Initiates a donation/support checkout session.
 * TODO: Replace the stub below with your payment provider (Stripe, Polar, etc.).
 *
 * On payment success the provider's webhook route — after verifying the webhook
 * signature — should call `awardDonationPoints` from `./queries.ts`. Do NOT
 * re-export that helper from this file: it would become a public endpoint that
 * lets anyone grant arbitrary points to any account.
 */
export async function startDonationCheckout(
  tier: DonationTierKey
): Promise<DonationResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  // Whitelist the tier before it reaches the database.
  const VALID_TIERS: readonly string[] = ["supporter", "champion", "founder"];
  if (!VALID_TIERS.includes(tier)) {
    return { ok: false, error: "Unknown support tier." };
  }

  // Record payment interest — even before the provider is wired up, every
  // tier click tells us how many users would pay. Best-effort: never blocks
  // the checkout path.
  const supabase = createAdminClient();
  const { error: trackErr } = await supabase
    .from("payment_clicks")
    .insert({ user_id: userId, tier });
  if (trackErr) {
    console.error("[waitlist] payment_clicks insert failed:", trackErr.message);
  }

  // STUB — swap with real Stripe / Polar checkout URL
  return {
    ok: false,
    error: "Payment integration coming soon — stay tuned!",
  };
}

// ── reads ────────────────────────────────────────────────────────────────────

export type WaitlistStatus = "pending" | "invited" | "accepted";

export type Dashboard = {
  rank: number | null;
  totalPoints: number;
  referralsCount: number;
  movedUp: number;
  referralCode: string | null;
  fullName: string | null;
  status: WaitlistStatus;
  /** Approved off the waitlist — the beta download is unlocked. */
  approved: boolean;
};

export async function getDashboard(): Promise<Dashboard | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createAdminClient();

  const [clerkUser, { data: entry }] = await Promise.all([
    currentUser(),
    supabase
      .from("waitlist_entries")
      .select("position, referral_code, full_name, points, moved_up, status")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!entry) return null;

  // Clerk metadata is the approval gate; Supabase mirrors it so the `status`
  // column stays usable for exports and the Mac app's access check. Approvals
  // happen out-of-band (dashboard), so reconcile lazily on read — best-effort,
  // a failed mirror must not hide the unlocked download.
  const approved = isBetaUser(clerkUser?.publicMetadata);
  let status = ((entry as Record<string, unknown>).status as WaitlistStatus) ?? "pending";
  if (approved && status !== "accepted") {
    const { error: syncErr } = await supabase
      .from("waitlist_entries")
      .update({ status: "accepted" })
      .eq("user_id", userId);
    if (syncErr) {
      console.error("[waitlist] status sync to accepted failed:", syncErr.message);
    } else {
      status = "accepted";
    }
  }

  // Count referrals made through this user's referral code.
  const referralCode = (entry as Record<string, unknown>).referral_code as string | null;
  const { count: referralsCount } = referralCode
    ? await supabase
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", referralCode)
    : { count: 0 };

  return {
    rank: (entry as Record<string, unknown>).position as number | null,
    totalPoints: ((entry as Record<string, unknown>).points as number) ?? 0,
    referralsCount: referralsCount ?? 0,
    movedUp: ((entry as Record<string, unknown>).moved_up as number) ?? 0,
    referralCode,
    fullName: (entry as Record<string, unknown>).full_name as string | null,
    status,
    approved,
  };
}
