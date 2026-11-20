// Pure derivations over the account rows the beta queue already fetched.
//
// No imports of Clerk or Supabase, on purpose: the overview page reads the
// whole account list once and both the queue and every chart on the page are
// computed from that one read. Adding a second round trip per statistic is how
// an internal dashboard ends up taking four seconds to render.

import type { BetaUserRow } from "@/lib/beta/rows";

const DAY = 86_400_000;

/** Accounts created in the last `days` days. */
export function createdSince(rows: BetaUserRow[], days: number): number {
  const cut = Date.now() - days * DAY;
  return rows.filter((r) => Date.parse(r.createdAt) >= cut).length;
}

/**
 * Accounts Clerk has seen in the last `days` days.
 *
 * This is *session* activity, not dictation: it counts opening the app or the
 * site, and it exists to be read next to the usage numbers, not instead of
 * them. Someone who signs in daily and never dictates is a different problem
 * from someone who does neither.
 */
export function activeSince(rows: BetaUserRow[], days: number): number {
  const cut = Date.now() - days * DAY;
  return rows.filter((r) => {
    const seen = r.lastActiveAt ?? r.lastSignInAt;
    return seen != null && Date.parse(seen) >= cut;
  }).length;
}

export type WeekBucket = { start: string; label: string; count: number };

/**
 * Signups per week for the last `weeks` weeks, oldest first.
 *
 * Buckets run backwards from today rather than from a calendar Monday, so the
 * rightmost bar is always "the last seven days" and never a part-week stub that
 * reads as a collapse in growth.
 */
export function signupsByWeek(rows: BetaUserRow[], weeks = 8): WeekBucket[] {
  const now = Date.now();
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY;
    buckets.push({
      start: new Date(start).toISOString().slice(0, 10),
      label: i === 0 ? "This week" : `${i + 1}w ago`,
      count: 0,
    });
  }
  for (const r of rows) {
    const created = Date.parse(r.createdAt);
    const weeksAgo = Math.floor((now - created) / (7 * DAY));
    if (weeksAgo < 0 || weeksAgo >= weeks) continue;
    buckets[weeks - 1 - weeksAgo].count += 1;
  }
  return buckets;
}

export type Breakdown = { label: string; count: number };

/**
 * Count rows by one nullable field, biggest first.
 *
 * Nulls are counted into their own bucket rather than dropped. "How many people
 * did not answer" is a real answer about the form, and hiding it makes every
 * percentage on the page a percentage of an unstated denominator.
 */
export function breakdown(
  rows: BetaUserRow[],
  pick: (row: BetaUserRow) => string | null,
  unknownLabel = "Not stated"
): Breakdown[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = pick(r)?.trim() || unknownLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Accounts that brought in at least one other, best first. */
export function topReferrers(rows: BetaUserRow[], limit = 5): BetaUserRow[] {
  return rows
    .filter((r) => r.referrals > 0)
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, limit);
}

// ── formatting ────────────────────────────────────────────────────────────

export function compact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** Seconds as the largest sensible unit. Dictation time is read in hours. */
export function duration(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

/** "3 days" style age, for how long someone has been waiting. */
export function daysAgo(isoDate: string | null): string {
  if (!isoDate) return "unknown";
  const days = Math.floor((Date.now() - Date.parse(isoDate)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  return `${Math.round(days / 30)} months`;
}
