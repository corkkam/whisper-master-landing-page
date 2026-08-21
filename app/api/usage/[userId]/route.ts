import { resolveUserId } from "@/lib/sync/auth";
import { authErrorResponse, syncClient } from "@/lib/sync/store";

/**
 * `GET /api/usage/<userId>` — that user's daily rows, oldest first.
 *
 * The id in the path is NOT trusted. In Clerk mode `resolveUserId` returns the
 * verified token subject and the path parameter is ignored entirely, so a
 * caller can only ever read their own usage. That is what closes the IDOR: the
 * service-role client bypasses RLS, so the query has to filter on the resolved
 * id and never on the raw path.
 */
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: requested } = await params;

  let userId: string;
  try {
    userId = await resolveUserId(request, requested);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const { data, error } = await syncClient()
    .from("usage_daily")
    .select(
      "day, words, dictations, duration_seconds, fixes_words_corrected, fixes_dictionary, per_app, updated_at"
    )
    .eq("user_id", userId)
    .order("day", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    userId,
    days: (data ?? []).map((r) => ({
      userId,
      day: r.day,
      words: r.words,
      dictations: r.dictations,
      durationSeconds: r.duration_seconds,
      fixesWordsCorrected: r.fixes_words_corrected,
      fixesDictionary: r.fixes_dictionary,
      perApp: r.per_app,
      updatedAt: r.updated_at,
    })),
  });
}
