"use server";

import { createClient } from "@/lib/supabase/server";
import { waitlistSchema, type WaitlistInput } from "./schema";

export type SubmitResult =
  | { ok: true; position: number; status: string }
  | { ok: false; error: string };

/**
 * Save (or update) the signed-in user's waitlist entry. The user must already
 * be authenticated (Google or verified email OTP) — RLS also enforces that the
 * row's user_id matches the caller, so this can't be spoofed from the client.
 */
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

  const d = parsed.data;
  const { data, error } = await supabase
    .from("waitlist_entries")
    .upsert(
      {
        user_id: user.id,
        email: user.email,
        full_name: d.fullName,
        company: d.company || null,
        role: d.role,
        use_case: d.useCase || null,
        platform: d.platform,
        referral_source: d.referralSource ?? null,
      },
      { onConflict: "email" }
    )
    .select("position, status")
    .single();

  if (error || !data) {
    return { ok: false, error: "Couldn't save your spot — please try again." };
  }

  return { ok: true, position: data.position, status: data.status };
}

/** The signed-in user's existing entry, if any (for return visits). */
export async function getMyEntry() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("waitlist_entries")
    .select("position, status, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return data;
}
