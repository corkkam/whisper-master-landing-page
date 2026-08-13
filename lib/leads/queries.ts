// Server-only lead reads/writes. NOT client-callable.
//
// Same rule as lib/waitlist/queries.ts, for the same reason: every export from a
// `"use server"` module becomes a public HTTP endpoint with a stable id that
// ships in the client bundle. The functions here read the whole pipeline, move
// deals between stages and expose prospect emails — if any of them lived in
// `actions.ts` an unauthenticated visitor could page through the founder's
// entire sales pipeline, or mark deals won.
//
// `server-only` makes that structural rather than conventional.
import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { LeadInput } from "./schema";
import type { LeadBand } from "./scoring";
import { LEAD_STAGES, type LeadRow, type LeadStage } from "./stages";

// Re-exported so server-side callers have one import site, while the client
// pipeline UI imports the same symbols from ./stages without pulling this
// service-role module into the browser bundle.
export { LEAD_STAGES };
export type { LeadRow, LeadStage };

/**
 * Salted hash of the visitor IP, for rate limiting only.
 *
 * The salt matters. A bare sha256 of an IPv4 address is reversible by brute
 * force in seconds — there are only ~4 billion of them — so an unsalted "hash"
 * is a plaintext IP with extra steps. Falls back to the service-role key as
 * salt material if no dedicated secret is set, which is not ideal but is at
 * least high-entropy and already secret.
 *
 * We store this at all only because the lead form is unauthenticated by design
 * (a managing partner will not create an account to ask a question), so it
 * needs *some* abuse control that is not a second CAPTCHA.
 */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.LEAD_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Rate limit by IP hash. Deliberately generous and deliberately fail-open.
 *
 * Fail-open is the right call *here*, unlike Turnstile in lib/turnstile.ts. If
 * this query errors, the choice is between dropping a possibly-real enquiry
 * from a law firm and accepting a possibly-duplicate one. Turnstile is the
 * primary bot gate; this is only a backstop against someone who has already
 * beaten it, so the cost of a false negative is far lower than the cost of a
 * false positive.
 */
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 5;

async function isRateLimited(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
    // Count lead_events, not leads: a resubmission to a known email updates
    // the existing leads row instead of inserting one, so counting leads
    // rows makes repeat submissions to one email invisible to this cap
    // (see the NOTE in migration 0008, fixed by 0009's lead_events.ip_hash).
    const { count, error } = await supabase
      .from("lead_events")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .in("kind", ["created", "resubmitted"])
      .gte("created_at", since);
    if (error) return false;
    return (count ?? 0) >= RATE_LIMIT_MAX_PER_WINDOW;
  } catch {
    return false;
  }
}

export type RecordLeadResult =
  | { ok: true; leadId: number; isNew: boolean }
  | { ok: false; error: string };

/**
 * Write a qualified enquiry. Callers MUST have verified Turnstile and the
 * honeypot first — this function trusts everything it is given except the
 * score, which it takes as a parameter precisely so the caller cannot forget
 * that the browser never supplies it.
 */
export async function recordLead(args: {
  input: LeadInput;
  score: number;
  band: LeadBand;
  nextAction: string;
  clerkUserId: string | null;
  ip: string | null;
  country: string | null;
  utm: Record<string, string> | null;
}): Promise<RecordLeadResult> {
  const ipHash = hashIp(args.ip);
  if (await isRateLimited(ipHash)) {
    return { ok: false, error: "Too many enquiries from this network. Please email us directly." };
  }

  try {
    const supabase = createAdminClient();
    const { input } = args;

    const { data, error } = await supabase.rpc("upsert_lead", {
      p_email: input.email,
      p_full_name: input.fullName,
      p_organisation: input.organisation ?? "",
      p_role: input.role ?? "",
      p_phone: input.phone ?? "",
      p_vertical: input.vertical,
      p_seats: input.seats,
      p_compliance_driver: input.complianceDriver ?? "",
      p_current_tool: input.currentTool ?? "",
      p_timeline: input.timeline,
      p_notes: input.notes ?? "",
      p_source: input.source || "unknown",
      p_utm: args.utm,
      p_country: args.country,
      p_ip_hash: ipHash,
      p_score: args.score,
      p_band: args.band,
      p_clerk_user_id: args.clerkUserId,
    });

    if (error) {
      console.error("[leads] upsert_lead failed:", error.message);
      return { ok: false, error: "Something went wrong saving your enquiry." };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const leadId = row?.lead_id as number | undefined;
    const isNew = Boolean(row?.is_new);
    if (!leadId) return { ok: false, error: "Something went wrong saving your enquiry." };

    // Only stamp a next action on genuinely new leads. Overwriting it on a
    // resubmission would wipe whatever the founder had planned for a deal
    // already in flight.
    if (isNew) {
      await supabase.from("leads").update({ next_action: args.nextAction }).eq("id", leadId);
    }

    return { ok: true, leadId, isNew };
  } catch (e) {
    console.error("[leads] recordLead threw:", e);
    return { ok: false, error: "Something went wrong saving your enquiry." };
  }
}

/** Has this email already signed up as a product user? Feeds the score. */
export async function isExistingProductUser(email: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("email", email.toLowerCase());
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// ── Pipeline reads (founder-facing) ───────────────────────────────────────

export async function listLeads(opts: {
  stage?: LeadStage | "all";
  limit?: number;
} = {}): Promise<LeadRow[]> {
  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("leads")
      .select("*")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 200);

    if (opts.stage && opts.stage !== "all") q = q.eq("stage", opts.stage);

    const { data, error } = await q;
    if (error) {
      console.error("[leads] listLeads failed:", error.message);
      return [];
    }
    return (data ?? []) as LeadRow[];
  } catch (e) {
    console.error("[leads] listLeads threw:", e);
    return [];
  }
}

export type PipelineSummaryRow = { stage: LeadStage; count: number; pipeline_usd: number };

export async function pipelineSummary(): Promise<PipelineSummaryRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("pipeline_summary");
    if (error) return [];
    return (data ?? []) as PipelineSummaryRow[];
  } catch {
    return [];
  }
}

export async function setLeadStage(leadId: number, stage: LeadStage, detail?: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("set_lead_stage", {
    p_lead_id: leadId,
    p_stage: stage,
    p_detail: detail ?? null,
  });
  return { ok: !error };
}

export async function updateLeadFields(
  leadId: number,
  fields: Partial<Pick<LeadRow, "owner_note" | "next_action" | "next_action_at" | "deal_value_usd" | "lost_reason">>
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").update(fields).eq("id", leadId);
  return { ok: !error };
}

export type LeadEvent = {
  id: number;
  lead_id: number;
  kind: string;
  detail: string | null;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
};

export async function leadEvents(leadId: number): Promise<LeadEvent[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []) as LeadEvent[];
  } catch {
    return [];
  }
}

/** Telegram rejects messages over 4096 characters outright. */
const TELEGRAM_MAX = 4096;

/**
 * Notify the founder of a new lead.
 *
 * Push, not email, and that is the whole point. B2B enquiry conversion falls
 * off a cliff with response time — a hot lead that sits unread in an inbox for
 * two days is a lost lead. This has to reach a phone.
 *
 * Two transports, either or both:
 *
 *   • Telegram, via the Bot API. Needs a bot token and a chat id rather than a
 *     single URL, because Telegram has no concept of an "incoming webhook" the
 *     way Slack and Discord do — you call `sendMessage` on the bot and tell it
 *     who to send to. So it cannot be expressed as `LEAD_NOTIFY_WEBHOOK_URL`
 *     and needs its own pair of variables.
 *   • A generic JSON webhook, which covers Slack (`text`), Discord (`content`)
 *     and most automation tools with the same payload.
 *
 * Never throws, and failures are logged rather than propagated: the lead is
 * already durably stored by the time this runs, and a notification outage must
 * not turn into a failed submission for the person filling in the form.
 */
export async function notifyFounder(args: {
  leadId: number;
  input: LeadInput;
  score: number;
  band: LeadBand;
  reasons: string[];
  isNew: boolean;
}): Promise<void> {
  const emoji = args.band === "hot" ? "🔥" : args.band === "warm" ? "🌤" : "🧊";
  const text = [
    `${emoji} ${args.isNew ? "New" : "Returning"} ${args.band.toUpperCase()} lead — ${args.score}/100`,
    `${args.input.fullName}${args.input.role ? ` (${args.input.role})` : ""} — ${args.input.organisation}`,
    `${args.input.vertical} · ${args.input.seats} seats · ${args.input.timeline}`,
    `${args.input.email}${args.input.phone ? ` · ${args.input.phone}` : ""}`,
    args.input.complianceDriver ? `\nWhy on-device: ${args.input.complianceDriver}` : "",
    args.input.currentTool ? `Currently: ${args.input.currentTool}` : "",
    `\nScore: ${args.reasons.join(" · ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.allSettled([notifyTelegram(text), notifyGenericWebhook(text)]);
}

async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.LEAD_NOTIFY_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.LEAD_NOTIFY_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        // Plain text, no `parse_mode`, deliberately. The message interpolates
        // user-supplied strings — a firm called "Smith_Jones & Co" or a note
        // containing an asterisk would break Markdown parsing and Telegram
        // would reject the whole message with a 400. Losing the alert for a
        // hot lead to gain bold text is a bad trade.
        text: text.slice(0, TELEGRAM_MAX),
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      // Telegram returns a descriptive JSON body on failure ("chat not found",
      // "bot was blocked"), and it is the only way to debug a silent alert.
      console.error(`[leads] Telegram notify failed (${res.status}):`, await res.text());
    }
  } catch (e) {
    console.error("[leads] Telegram notify threw (lead was still saved):", e);
  }
}

async function notifyGenericWebhook(text: string): Promise<void> {
  const url = process.env.LEAD_NOTIFY_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }), // `text` = Slack, `content` = Discord
      cache: "no-store",
    });
  } catch (e) {
    console.error("[leads] webhook notify threw (lead was still saved):", e);
  }
}
