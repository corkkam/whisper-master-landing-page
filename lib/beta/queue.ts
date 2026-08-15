// Server-only reads and writes behind the beta queue. NOT client-callable.
//
// Same rule as `lib/waitlist/queries.ts`: every export from a `"use server"`
// module becomes a public HTTP endpoint with a stable id that ships in the
// client bundle. The functions here list every account with its email address
// and flip the beta gate — if any of them lived in an actions file, an
// unauthenticated visitor could page through the whole userbase, or grant
// themselves the beta build. `server-only` makes that structural rather than
// conventional; the browser-callable wrappers live in `./admin-actions.ts` and
// each one calls `requireAdmin()` first.
import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { approveUser, setBetaAccess } from "@/lib/clerk/beta";
import { createAdminClient } from "@/lib/supabase/server";
import type { BetaUserRow } from "./rows";

export type { BetaUserRow };

/**
 * Clerk's page size ceiling, and the number of accounts this surface will walk.
 *
 * The cap is deliberate and deliberately visible. Listing every account on
 * every request is fine at beta scale and becomes a slow page at ten thousand
 * users, so the read stops at `MAX_ACCOUNTS` and the page *says* it stopped
 * (`truncated`). A dashboard that silently shows the first 2000 of 9000 users
 * is worse than one that admits its limit, because every number on it is then
 * quietly wrong. When this trips, the queue needs a server-side filter and a
 * paged fetch, not a bigger constant.
 */
const CLERK_PAGE = 500;
const MAX_ACCOUNTS = 2000;

export type BetaQueue = {
  rows: BetaUserRow[];
  /** Clerk's own total, which is authoritative even when `rows` is capped. */
  totalAccounts: number;
  truncated: boolean;
  counts: { approved: number; waiting: number; noRequest: number };
  /** Set when a source failed, so the page can say so instead of showing zeros. */
  clerkError: string | null;
  waitlistError: string | null;
};

const EMPTY_QUEUE: BetaQueue = {
  rows: [],
  totalAccounts: 0,
  truncated: false,
  counts: { approved: 0, waiting: 0, noRequest: 0 },
  clerkError: null,
  waitlistError: null,
};

type WaitlistEntry = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  role: string | null;
  use_case: string | null;
  platform: string | null;
  referral_source: string | null;
  referral_code: string | null;
  referred_by: string | null;
  status: string | null;
  points: number | null;
  position: number | null;
  created_at: string | null;
};

const WAITLIST_COLUMNS =
  "user_id, email, full_name, company, role, use_case, platform, referral_source, referral_code, referred_by, status, points, position, created_at";

function iso(ms: number | null | undefined): string | null {
  return typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;
}

/**
 * Join one Clerk account to its waitlist submission.
 *
 * Clerk wins on identity and on the gate; the Supabase entry only fills gaps
 * (a name typed into the form when the Clerk profile has none) and supplies
 * what the person told us. Shared by the list read and the single-user read so
 * the two can never disagree about what a row means.
 */
function toRow(
  u: ClerkUser,
  entry: WaitlistEntry | null,
  referrals: number
): BetaUserRow {
  const primary =
    u.emailAddresses.find((a) => a.id === u.primaryEmailAddressId)?.emailAddress ??
    u.emailAddresses[0]?.emailAddress ??
    entry?.email ??
    "";
  const name =
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || entry?.full_name || null;
  const meta = u.publicMetadata as Record<string, unknown> | null;

  return {
    userId: u.id,
    email: primary,
    name,
    createdAt: new Date(u.createdAt).toISOString(),
    lastActiveAt: iso(u.lastActiveAt),
    lastSignInAt: iso(u.lastSignInAt),
    approved: meta?.betaAccess === true,
    betaJoinedAt: typeof meta?.betaJoinedAt === "string" ? meta.betaJoinedAt : null,
    requested: entry != null,
    requestedAt: entry?.created_at ?? null,
    company: entry?.company ?? null,
    role: entry?.role ?? null,
    platform: entry?.platform ?? null,
    useCase: entry?.use_case ?? null,
    referralSource: entry?.referral_source ?? null,
    points: entry?.points ?? null,
    position: entry?.position ?? null,
    referrals,
    mirroredStatus: entry?.status ?? null,
  };
}

/**
 * Every account, joined to whatever it told us when it asked for early access.
 *
 * Driven from Clerk rather than from `waitlist_entries` on purpose. Sign-up is
 * public now, so the two sets have diverged: there are accounts with no
 * waitlist row (stable users who never asked) and there can be approved users
 * whose Supabase mirror still reads `pending`. Clerk holds the accounts and
 * holds the gate, so it is the spine; Supabase supplies the detail.
 */
export async function listBetaQueue(): Promise<BetaQueue> {
  const [clerk, waitlist] = await Promise.all([fetchAccounts(), fetchWaitlist()]);

  // Referral credit is counted across the rows we have rather than queried per
  // user: one pass over the entries beats N count queries, and the entries are
  // already in memory.
  const referralsByCode = new Map<string, number>();
  for (const e of waitlist.entries) {
    if (!e.referred_by) continue;
    referralsByCode.set(e.referred_by, (referralsByCode.get(e.referred_by) ?? 0) + 1);
  }

  const byUserId = new Map<string, WaitlistEntry>();
  for (const e of waitlist.entries) byUserId.set(e.user_id, e);

  const rows: BetaUserRow[] = clerk.users.map((u) => {
    const entry = byUserId.get(u.id) ?? null;
    const referrals = entry?.referral_code
      ? referralsByCode.get(entry.referral_code) ?? 0
      : 0;
    return toRow(u, entry, referrals);
  });

  // Longest wait first. The queue's whole job is "who has been waiting", and a
  // newest-first list buries exactly the people the ordering should surface.
  rows.sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? 1 : -1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return {
    rows,
    totalAccounts: clerk.totalCount || rows.length,
    truncated: clerk.truncated || waitlist.truncated,
    counts: {
      approved: rows.filter((r) => r.approved).length,
      waiting: rows.filter((r) => !r.approved && r.requested).length,
      noRequest: rows.filter((r) => !r.approved && !r.requested).length,
    },
    clerkError: clerk.error,
    waitlistError: waitlist.error,
  };
}

/**
 * One account, for the detail page.
 *
 * Two point reads instead of walking the whole userbase and filtering. The
 * list pages already pay for the full walk; a page about one person should not.
 * Returns null when Clerk has no such user, which the page turns into a 404 —
 * a detail page for an id that does not exist is a 404, not an empty shell.
 */
export async function getBetaUser(userId: string): Promise<BetaUserRow | null> {
  let user: ClerkUser;
  try {
    const client = await clerkClient();
    user = await client.users.getUser(userId);
  } catch (e) {
    console.error("[beta] getBetaUser failed:", e instanceof Error ? e.message : e);
    return null;
  }

  let entry: WaitlistEntry | null = null;
  let referrals = 0;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("waitlist_entries")
      .select(WAITLIST_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    entry = (data as WaitlistEntry | null) ?? null;

    if (entry?.referral_code) {
      const { count } = await supabase
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", entry.referral_code);
      referrals = count ?? 0;
    }
  } catch (e) {
    // The account and its beta state come from Clerk, so a Supabase outage
    // costs the submitted detail and nothing that matters for access.
    console.error("[beta] getBetaUser detail read threw:", e);
  }

  return toRow(user, entry, referrals);
}

type ClerkUser = Awaited<
  ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUserList"]>
>["data"][number];

async function fetchAccounts(): Promise<{
  users: ClerkUser[];
  totalCount: number;
  truncated: boolean;
  error: string | null;
}> {
  try {
    const client = await clerkClient();
    const users: ClerkUser[] = [];
    let totalCount = 0;

    for (let offset = 0; offset < MAX_ACCOUNTS; offset += CLERK_PAGE) {
      const page = await client.users.getUserList({
        limit: CLERK_PAGE,
        offset,
        orderBy: "-created_at",
      });
      totalCount = page.totalCount;
      users.push(...page.data);
      if (page.data.length < CLERK_PAGE || users.length >= totalCount) break;
    }

    return { users, totalCount, truncated: users.length < totalCount, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[beta] Clerk account list failed:", message);
    return { users: [], totalCount: 0, truncated: false, error: message };
  }
}

async function fetchWaitlist(): Promise<{
  entries: WaitlistEntry[];
  truncated: boolean;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select(WAITLIST_COLUMNS)
      .order("created_at", { ascending: true })
      .limit(MAX_ACCOUNTS);

    if (error) {
      console.error("[beta] waitlist read failed:", error.message);
      return { entries: [], truncated: false, error: error.message };
    }
    const entries = (data ?? []) as WaitlistEntry[];
    return { entries, truncated: entries.length >= MAX_ACCOUNTS, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[beta] waitlist read threw:", message);
    return { entries: [], truncated: false, error: message };
  }
}

/**
 * Grant beta access, then bring Supabase's mirror into line.
 *
 * Clerk is written first and its failure is fatal, because Clerk *is* the gate
 * — the Mac app and `/download` both read `publicMetadata.betaAccess`, and a
 * Supabase row saying `accepted` grants nothing. The mirror is best-effort: it
 * exists so exports and the app's status check stay usable, and `getDashboard`
 * re-reconciles it lazily on the user's next visit anyway. A failed mirror must
 * not report the approval as failed and invite a second click.
 */
export async function approveBeta(userId: string): Promise<{ ok: boolean; mirrored: boolean }> {
  await approveUser(userId);
  return { ok: true, mirrored: await mirrorStatus(userId, "accepted") };
}

/** Move a user back to stable. `betaJoinedAt` is left as the historical record. */
export async function revokeBeta(userId: string): Promise<{ ok: boolean; mirrored: boolean }> {
  await setBetaAccess(userId, false);
  return { ok: true, mirrored: await mirrorStatus(userId, "pending") };
}

async function mirrorStatus(userId: string, status: "accepted" | "pending"): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status })
      .eq("user_id", userId);
    if (error) {
      console.error(`[beta] status mirror to ${status} failed:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[beta] status mirror to ${status} threw:`, e);
    return false;
  }
}

export { EMPTY_QUEUE };
