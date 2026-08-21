import { resolveUserId } from "@/lib/sync/auth";
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
    typeof d.durationSeconds === "number"
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let userId: string;
  try {
    userId = await resolveUserId(request, body.userId as string | undefined);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const days = body.days;
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
    words: d.words,
    dictations: d.dictations,
    duration_seconds: d.durationSeconds,
    fixes_words_corrected: d.fixesWordsCorrected ?? 0,
    fixes_dictionary: d.fixesDictionary ?? 0,
    per_app: d.perApp ?? {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await syncClient()
    .from("usage_daily")
    .upsert(rows, { onConflict: "user_id,day" });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, upserted: rows.length });
}
