"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { waitlistSchema, type WaitlistInput } from "./schema";
import { REFERRAL_COOKIE } from "./constants";
import type { DonationTierKey } from "./points";

// ── identity ─────────────────────────────────────────────────────────────────

export async function getCurrentUserEmail() {
  const user = await currentUser();
  return user?.emailAddresses[0]?.emailAddress ?? null;
}

// ── waitlist write (Clerk-verified, referral-aware) ───────────────────────────

export type SubmitResult =
  | { ok: true; position: number; status: string }
  | { ok: false; error: string };

export async function submitWaitlist(input: WaitlistInput): Promise<SubmitResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!userEmail) return { ok: false, error: "No email address found on your account." };

  const supabase = createAdminClient();

  // Referral only attaches on first join (not on re-submit).
  const cookieStore = cookies();
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

  const { data, error } = await supabase
    .from("waitlist_entries")
    .upsert(payload, { onConflict: "email" })
    .select("position, status")
    .single();

  if (error || !data) {
    console.error("[waitlist] submitWaitlist failed:", error?.code, error?.message);
    return {
      ok: false,
      error: error?.message || "Couldn't save your spot — please try again.",
    };
  }

  if (referredBy) {
    cookieStore.set(REFERRAL_COOKIE, "", { maxAge: 0, path: "/" });
  }
  return { ok: true, position: data.position, status: data.status };
}

// ── social share points ───────────────────────────────────────────────────────

export async function claimSocial(network: "x" | "linkedin") {
  const { userId } = await auth();
  if (!userId) return { ok: false as const };

  const supabase = createAdminClient();
  // NOTE: The claim_social RPC uses auth.uid() and won't fire with service role.
  // Run this migration in Supabase SQL editor to fix it:
  //
  //   CREATE OR REPLACE FUNCTION claim_social(p_network TEXT, p_user_id TEXT)
  //   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  //   BEGIN
  //     INSERT INTO social_claims (user_id, network)
  //     VALUES (p_user_id, p_network)
  //     ON CONFLICT (user_id, network) DO NOTHING;
  //     -- Award points only on first claim
  //     IF FOUND THEN
  //       UPDATE waitlist_entries
  //       SET points = points + 25
  //       WHERE user_id = p_user_id;
  //     END IF;
  //   END;
  //   $$;
  //
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
 * On payment success, the webhook should call `awardDonationPoints(userId, tier)`.
 */
export async function startDonationCheckout(
  tier: DonationTierKey
): Promise<DonationResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  // STUB — swap with real Stripe / Polar checkout URL
  console.log(`[waitlist] donation checkout initiated: ${tier} for ${userId}`);
  return {
    ok: false,
    error: "Payment integration coming soon — stay tuned!",
  };
}

/**
 * Awards donation points after a confirmed payment webhook.
 * Call this from your /api/webhooks/payment route handler, not from the client.
 */
export async function awardDonationPoints(userId: string, points: number) {
  const supabase = createAdminClient();
  const { data, error: fetchErr } = await supabase
    .from("waitlist_entries")
    .select("points")
    .eq("user_id", userId)
    .single();

  if (fetchErr || !data) return { ok: false };

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ points: ((data as Record<string, unknown>).points as number ?? 0) + points })
    .eq("user_id", userId);
  return { ok: !error };
}

// ── reads ────────────────────────────────────────────────────────────────────

export type Dashboard = {
  rank: number | null;
  totalPoints: number;
  referralsCount: number;
  movedUp: number;
  referralCode: string | null;
  fullName: string | null;
};

export async function getDashboard(): Promise<Dashboard | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("position, referral_code, full_name, points, moved_up")
    .eq("user_id", userId)
    .maybeSingle();

  if (!entry) return null;

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
  };
}

export type LeaderRow = {
  rank: number;
  display_name: string;
  total_points: number;
  referrals_count: number;
};

export async function getLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("top_leaderboard", { p_limit: limit });
  return (data as LeaderRow[] | null) ?? [];
}
