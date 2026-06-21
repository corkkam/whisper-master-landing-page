"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  waitlistSchema,
  emailSchema,
  otpSchema,
  type WaitlistInput,
} from "./schema";
import { REFERRAL_COOKIE } from "./constants";

// ── auth: passwordless email magic link (Turnstile-gated) ───────────────
// Uses the magic-link email (the default Supabase template, no SMTP needed).
// Clicking the link lands on /auth/callback, which signs the user in and
// redirects to the details step.
export async function sendEmailLink(
  emailRaw: string,
  turnstileToken: string | null,
  redirectTo: string
) {
  const email = emailSchema.safeParse(emailRaw);
  if (!email.success) return { ok: false as const, error: "Enter a valid email." };

  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false as const, error: "Bot check failed — please retry." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo || undefined },
  });
  if (error) {
    // Log the real reason server-side; surface it to the client for now (dev).
    console.error("[waitlist] signInWithOtp failed:", error.status, error.message);
    return {
      ok: false as const,
      error: error.message || "Couldn't send the email. Try again.",
    };
  }
  return { ok: true as const };
}

export async function verifyEmailOtp(emailRaw: string, tokenRaw: string) {
  const email = emailSchema.safeParse(emailRaw);
  const token = otpSchema.safeParse(tokenRaw);
  if (!email.success || !token.success) {
    return { ok: false as const, error: "Check the email and the 6-digit code." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });
  if (error) return { ok: false as const, error: "Invalid or expired code." };
  return { ok: true as const };
}

export async function getCurrentUserEmail() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

// ── waitlist write (auth-checked, RLS-enforced, referral-aware) ─────────
export type SubmitResult =
  | { ok: true; position: number; status: string }
  | { ok: false; error: string };

export async function submitWaitlist(input: WaitlistInput): Promise<SubmitResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Please verify your email or sign in first." };
  }

  // Self-heal: guarantee this user has a profile row before we reference it.
  // The signup trigger covers fresh users, but an auth user can exist without
  // a profile (created via an OTP attempt before the trigger, account-linking,
  // etc.) — this makes the FK insert never fail for that reason.
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: meta.full_name ?? meta.name ?? null,
      avatar_url: meta.avatar_url ?? null,
    },
    { onConflict: "id" }
  );

  // Referral only attaches on first join (not on re-submit).
  const cookieStore = cookies();
  const { data: existing } = await supabase
    .from("waitlist_entries")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const referredBy = existing ? null : cookieStore.get(REFERRAL_COOKIE)?.value ?? null;

  const d = parsed.data;
  const payload: Record<string, unknown> = {
    user_id: user.id,
    email: user.email,
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
    console.error("[waitlist] submitWaitlist failed:", error?.code, error?.message, error?.details);
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

// ── social share points (capped once per network, server-enforced) ─────
export async function claimSocial(network: "x" | "linkedin") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };
  const { error } = await supabase.rpc("claim_social", { p_network: network });
  return { ok: !error };
}

// ── reads ────────────────────────────────────────────────────────────────
export type Dashboard = {
  rank: number | null;
  totalPoints: number;
  referralsCount: number;
  movedUp: number;
  referralCode: string | null;
  fullName: string | null;
};

export async function getDashboard(): Promise<Dashboard | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: statusRows } = await supabase.rpc("my_status");
  const s = Array.isArray(statusRows) ? statusRows[0] : statusRows;

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("referral_code, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!entry) return null;
  return {
    rank: s?.rank ?? null,
    totalPoints: s?.total_points ?? 0,
    referralsCount: s?.referrals_count ?? 0,
    movedUp: s?.moved_up ?? 0,
    referralCode: entry.referral_code ?? null,
    fullName: entry.full_name ?? null,
  };
}

export type LeaderRow = {
  rank: number;
  display_name: string;
  total_points: number;
  referrals_count: number;
};

export async function getLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("top_leaderboard", { p_limit: limit });
  return (data as LeaderRow[] | null) ?? [];
}
