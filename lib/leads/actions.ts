"use server";

// SECURITY — everything exported here is a PUBLIC HTTP ENDPOINT.
//
// See the header of lib/waitlist/actions.ts for the full explanation. The short
// version: Next.js compiles each export into a server action with a stable id
// that ships in the client bundle, and anyone can POST to it with arbitrary
// arguments.
//
// This file is a harder case than the waitlist, because the waitlist can lean on
// `auth()` — you must be a signed-in Clerk user to join it. A team enquiry
// deliberately CANNOT require sign-in: the buyer is a managing partner or a
// practice manager evaluating vendors, and demanding an account before they can
// ask a question would remove most of this funnel. Requiring sign-in would be
// the single most expensive "security" decision available.
//
// So this endpoint is unauthenticated on purpose, and the defences are layered
// instead:
//   1. Honeypot          — silent, costs real users nothing
//   2. Turnstile         — the primary bot gate, fails closed in production
//   3. Zod               — shape and length, so nothing unbounded reaches the DB
//   4. Server-side score — the browser posts answers, never a score or a stage
//   5. IP-hash rate cap  — backstop, in queries.ts, fails open
//
// The one thing that must never be reachable from here is the pipeline itself.
// Reads, stage moves and founder notes live in queries.ts behind `server-only`.

import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { verifyTurnstile } from "@/lib/turnstile";
import { leadSchema, type LeadInput } from "./schema";
import { scoreLead, suggestedNextAction } from "./scoring";
import { isExistingProductUser, notifyFounder, recordLead } from "./queries";

export type LeadSubmitResult =
  | { ok: true; band: "hot" | "warm" | "cold" }
  | { ok: false; error: string };

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for`; the leftmost entry is
 * the original client. Only ever used to derive a salted hash for rate
 * limiting — the raw value is never stored.
 */
async function clientIp(): Promise<{ ip: string | null; country: string | null }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const country = h.get("x-vercel-ip-country");
    return { ip, country };
  } catch {
    return { ip: null, country: null };
  }
}

export async function submitLead(
  input: LeadInput,
  turnstileToken: string | null,
  honeypot: string
): Promise<LeadSubmitResult> {
  // 1. Honeypot. Report success rather than an error: telling a bot which
  //    check it failed is how it learns to pass next time.
  if (honeypot.trim() !== "") {
    return { ok: true, band: "cold" };
  }

  // 2. Shape.
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }
  const data = parsed.data;

  // 3. Bot gate.
  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false, error: "Couldn't verify you're human — please retry." };
  }

  // 4. Opportunistic identity. Not required, and never used for authorisation —
  //    only to link an enquiry to an existing product user, which is the single
  //    strongest qualification signal there is (bottom-up adoption already
  //    happened; this is the firm catching up to its own staff).
  let clerkUserId: string | null = null;
  let signedInEmail: string | null = null;
  try {
    const { userId } = await auth();
    clerkUserId = userId ?? null;
    if (userId) {
      const u = await currentUser();
      signedInEmail = u?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;
    }
  } catch {
    // Unauthenticated is the expected path here, not an error.
  }

  const isExistingUser =
    signedInEmail === data.email || (await isExistingProductUser(data.email));

  // 5. Score server-side. The client never sends this.
  const { score, band, reasons } = scoreLead(data, { isExistingUser });
  const nextAction = suggestedNextAction(band, data.seats);

  const { ip, country } = await clientIp();

  const result = await recordLead({
    input: data,
    score,
    band,
    nextAction,
    clerkUserId,
    ip,
    country,
    utm: null,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Notification failure must never fail the submission — the lead is already
  // durably stored at this point.
  await notifyFounder({
    leadId: result.leadId,
    input: data,
    score,
    band,
    reasons,
    isNew: result.isNew,
  });

  return { ok: true, band };
}
