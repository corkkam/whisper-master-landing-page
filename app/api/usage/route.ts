import { resolveUserId } from "@/lib/sync/auth";
import {
  SYNC_LIMITS,
  USAGE_CLAMPS,
  clampInt,
  clampNumber,
  jsonBytes,
  readJsonBody,
} from "@/lib/sync/limits";
import { authErrorResponse, syncClient } from "@/lib/sync/store";

/**
 * `POST /api/usage` — the macOS app's daily usage rollups.
 *
 * This used to live on the eval dashboard's separate deploy. It is here now so
 * that deploy can be deleted; the wire format is byte-identical, because
 * shipped builds are already sending it.
 *
 * A full daily rollup is idempotent, so a plain upsert on (user_id, day) is
 * correct. No last-writer-wins guard is needed, unlike notes.
 */
export const runtime = "nodejs";

interface DayEntry {
  day: string;
  words: number;
  dictations: number;
  durationSeconds: number;
  fixesWordsCorrected?: number;
  fixesDictionary?: number;
  perApp?: unknown;
}

function isValidDay(value: unknown): value is DayEntry {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.day) &&
    typeof d.words === "number" &&
    typeof d.dictations === "number" &&
    typeof d.durationSeconds === "number" &&
    (d.perApp === undefined ||
      d.perApp === null ||
      (typeof d.perApp === "object" &&
        !Array.isArray(d.perApp) &&
        jsonBytes(d.perApp) <= SYNC_LIMITS.maxPerAppBytes))
  );
}

export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const body = read.body;

  let userId: string;
  try {
    userId = await resolveUserId(request, body.userId as string | undefined);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const days = body.days;
  if (Array.isArray(days) && days.length > SYNC_LIMITS.maxItemsPerArray) {
    return Response.json({ error: "too many days in one request" }, { status: 413 });
  }
  if (!Array.isArray(days) || !days.every(isValidDay)) {
    return Response.json(
      {
        error:
          'body.days must be an array of { day: "yyyy-MM-dd", words, dictations, durationSeconds }',
      },
      { status: 400 }
    );
  }

  const rows = (days as DayEntry[]).map((d) => ({
    user_id: userId,
    day: d.day,
    words: clampInt(d.words, USAGE_CLAMPS.words),
    dictations: clampInt(d.dictations, USAGE_CLAMPS.dictations),
    duration_seconds: clampNumber(d.durationSeconds, USAGE_CLAMPS.durationSeconds),
    fixes_words_corrected: clampInt(d.fixesWordsCorrected, USAGE_CLAMPS.fixes),
    fixes_dictionary: clampInt(d.fixesDictionary, USAGE_CLAMPS.fixes),
    per_app: d.perApp ?? {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await syncClient()
    .from("usage_daily")
    .upsert(rows, { onConflict: "user_id,day" });
  if (error) {
    console.error(`[api/usage] upsert failed: ${error.message}`);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  return Response.json({ ok: true, upserted: rows.length });
}
