// Server-only product-usage aggregation for the admin overview.
//
// Reads `usage_daily` (migration 0005), which the Mac app syncs through the
// dashboard's `/api/usage` route: one row per user per local day, carrying the
// day's word and dictation counts, the seconds spent dictating, the cleanup
// pass's corrections, and a per-application breakdown.
//
// Not client-callable, for the obvious reason — the service-role key reads
// every user's row.
import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * The reporting window, and the row ceiling that protects the page from it.
 *
 * The aggregation runs in TypeScript rather than as a Postgres view because a
 * view is a migration, and this repo cannot tell from the tree whether a given
 * migration has been applied to the live project. A page that renders nothing
 * until someone remembers to run SQL is a page that gets reported as broken.
 * The cost is that the whole window is pulled into memory: 30 days times the
 * userbase, which is a few thousand small rows at beta scale.
 *
 * `ROW_CAP` is the honest limit on that. When it trips, `truncated` is set and
 * the page says the numbers are partial rather than quietly under-reporting —
 * at which point this belongs in SQL and the migration is worth writing.
 */
const WINDOW_DAYS = 30;
const ROW_CAP = 20_000;

export type UsageDay = { day: string; words: number; dictations: number; users: number };

export type AppUsage = { bundleId: string; name: string; words: number; dictations: number };

export type UsageStats = {
  /** False when the read failed outright — the page says so instead of "0". */
  available: boolean;
  truncated: boolean;
  windowDays: number;
  /** Oldest first, one entry per day in the window, gaps filled with zeros. */
  days: UsageDay[];
  totals: {
    words: number;
    dictations: number;
    seconds: number;
    wordsCorrected: number;
    dictionaryFixes: number;
  };
  activeUsers: { d1: number; d7: number; d30: number };
  topApps: AppUsage[];
};

type UsageRow = {
  user_id: string;
  day: string;
  words: number | null;
  dictations: number | null;
  duration_seconds: number | null;
  fixes_words_corrected: number | null;
  fixes_dictionary: number | null;
  per_app: Record<string, { name?: string; words?: number; count?: number }> | null;
};

/** The last `n` day keys as `yyyy-MM-dd`, oldest first. */
function dayKeys(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

function emptyStats(available: boolean): UsageStats {
  return {
    available,
    truncated: false,
    windowDays: WINDOW_DAYS,
    days: dayKeys(WINDOW_DAYS).map((day) => ({ day, words: 0, dictations: 0, users: 0 })),
    totals: { words: 0, dictations: 0, seconds: 0, wordsCorrected: 0, dictionaryFixes: 0 },
    activeUsers: { d1: 0, d7: 0, d30: 0 },
    topApps: [],
  };
}

export async function getUsageStats(): Promise<UsageStats> {
  const keys = dayKeys(WINDOW_DAYS);
  const since = keys[0];

  let rows: UsageRow[];
  try {
    const supabase = createAdminClient();
    // `day` is TEXT holding `yyyy-MM-dd`, so a string comparison is a date
    // comparison. It is the user's *local* day, which means the window edges
    // are approximate by up to a day either side. That is the right trade:
    // the alternative is discarding the timezone the user actually dictates in.
    const { data, error } = await supabase
      .from("usage_daily")
      .select(
        "user_id, day, words, dictations, duration_seconds, fixes_words_corrected, fixes_dictionary, per_app"
      )
      .gte("day", since)
      .order("day", { ascending: false })
      .limit(ROW_CAP);

    if (error) {
      console.error("[stats] usage_daily read failed:", error.message);
      return emptyStats(false);
    }
    rows = (data ?? []) as UsageRow[];
  } catch (e) {
    console.error("[stats] usage_daily read threw:", e);
    return emptyStats(false);
  }

  const stats = emptyStats(true);
  stats.truncated = rows.length >= ROW_CAP;

  const byDay = new Map<string, UsageDay>();
  for (const day of stats.days) byDay.set(day.day, day);
  const usersByDay = new Map<string, Set<string>>();

  const active1 = new Set<string>();
  const active7 = new Set<string>();
  const active30 = new Set<string>();
  const cut1 = keys[keys.length - 1];
  const cut7 = keys[Math.max(keys.length - 7, 0)];

  const apps = new Map<string, AppUsage>();

  for (const r of rows) {
    const words = r.words ?? 0;
    const dictations = r.dictations ?? 0;

    stats.totals.words += words;
    stats.totals.dictations += dictations;
    stats.totals.seconds += r.duration_seconds ?? 0;
    stats.totals.wordsCorrected += r.fixes_words_corrected ?? 0;
    stats.totals.dictionaryFixes += r.fixes_dictionary ?? 0;

    // A row exists for a day only once the user dictated on it, so presence is
    // the activity signal — no separate "was this user active" column needed.
    if (dictations > 0 || words > 0) {
      active30.add(r.user_id);
      if (r.day >= cut7) active7.add(r.user_id);
      if (r.day >= cut1) active1.add(r.user_id);
    }

    const bucket = byDay.get(r.day);
    if (bucket) {
      bucket.words += words;
      bucket.dictations += dictations;
      let seen = usersByDay.get(r.day);
      if (!seen) usersByDay.set(r.day, (seen = new Set()));
      seen.add(r.user_id);
    }

    // `per_app` is keyed by macOS bundle id with the human name inside, so the
    // key is what deduplicates and the name is only for display.
    for (const [bundleId, usage] of Object.entries(r.per_app ?? {})) {
      const existing = apps.get(bundleId) ?? {
        bundleId,
        name: usage?.name || bundleId,
        words: 0,
        dictations: 0,
      };
      existing.words += usage?.words ?? 0;
      existing.dictations += usage?.count ?? 0;
      if (!existing.name && usage?.name) existing.name = usage.name;
      apps.set(bundleId, existing);
    }
  }

  for (const [day, seen] of usersByDay) {
    const bucket = byDay.get(day);
    if (bucket) bucket.users = seen.size;
  }

  stats.activeUsers = { d1: active1.size, d7: active7.size, d30: active30.size };
  stats.topApps = [...apps.values()].sort((a, b) => b.words - a.words).slice(0, 8);

  return stats;
}
