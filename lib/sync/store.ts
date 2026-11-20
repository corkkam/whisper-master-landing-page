import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { SyncAuthError } from "./auth";

/**
 * Storage for the macOS app's per-user sync: usage rollups, notes and
 * reminders. The tables are migration 0005's, unchanged — this code moved here
 * from the retired eval dashboard, which was the only reason that deploy still
 * had to exist.
 *
 * Unlike the eval tables, this data IS per-environment: it follows
 * `SUPABASE_DB_SCHEMA`, so a preview deployment writes to `dev` and cannot
 * touch a real person's rows.
 */
export const syncClient = createAdminClient;

/** Turn a thrown auth error into its response; rethrow anything else. */
export function authErrorResponse(error: unknown): Response | null {
  if (!(error instanceof SyncAuthError)) return null;
  return Response.json({ error: error.message }, { status: error.status });
}

export const isIso = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));

/** ISO string, or null when the value is not a date. Used for soft-delete stamps. */
export const optIso = (v: unknown): string | null =>
  isIso(v) ? new Date(v).toISOString() : null;

/**
 * Stored `updated_at` per item, so a stale push can be dropped.
 *
 * Last-writer-wins is enforced here rather than by a database trigger, so the
 * semantics match what the dashboard did exactly. Two Macs syncing the same
 * note is the case that matters: the older edit must not overwrite the newer
 * one just because it arrived second.
 */
export async function existingUpdatedAt(
  table: "notes" | "reminders",
  userId: string,
  ids: string[]
): Promise<Map<string, number>> {
  const seen = new Map<string, number>();
  if (ids.length === 0) return seen;
  const { data, error } = await syncClient()
    .from(table)
    .select("item_id, updated_at")
    .eq("user_id", userId)
    .in("item_id", ids);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    seen.set(row.item_id as string, Date.parse(row.updated_at as string));
  }
  return seen;
}
