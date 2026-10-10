import { resolveUserId } from "@/lib/sync/auth";
import { SYNC_LIMITS, readJsonBody } from "@/lib/sync/limits";
import { authErrorResponse, existingUpdatedAt, isIso, optIso, syncClient } from "@/lib/sync/store";

/**
 * `POST /api/notes` and `GET /api/notes` — notes and reminders sync.
 *
 * Moved here from the retired eval dashboard, wire format unchanged, because
 * shipped Mac builds are already speaking it.
 *
 * Unlike usage, the GET is authenticated and returns only the caller's own
 * items. Notes are personal, so there is no public per-user route and no id in
 * the path to be tempted by.
 *
 * Writes are last-writer-wins by `updatedAt`: a push older than what is stored
 * is dropped rather than applied. Two Macs editing the same note is the case
 * that matters, and "arrived second" is not the same as "is newer".
 */
export const runtime = "nodejs";

interface NotePayload {
  id: string;
  title?: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface ReminderPayload extends NotePayload {
  dueDate: string;
  alertStyle?: string;
  soundName?: string;
  repeatRule?: string;
  isCompleted?: boolean;
  firedAt?: string | null;
}

/** Absent, or a string no longer than `max`. */
const optString = (value: unknown, max: number) =>
  value === undefined || value === null || (typeof value === "string" && value.length <= max);

function isNote(value: unknown): value is NotePayload {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    n.id.length > 0 &&
    n.id.length <= SYNC_LIMITS.maxIdChars &&
    optString(n.title, SYNC_LIMITS.maxTitleChars) &&
    optString(n.body, SYNC_LIMITS.maxNoteBodyChars) &&
    isIso(n.createdAt) &&
    isIso(n.updatedAt)
  );
}

function isReminder(value: unknown): value is ReminderPayload {
  if (!isNote(value)) return false;
  const r = value as unknown as Record<string, unknown>;
  return (
    isIso(r.dueDate) &&
    optString(r.alertStyle, SYNC_LIMITS.maxShortFieldChars) &&
    optString(r.soundName, SYNC_LIMITS.maxShortFieldChars) &&
    optString(r.repeatRule, SYNC_LIMITS.maxShortFieldChars) &&
    (r.isCompleted === undefined || typeof r.isCompleted === "boolean")
  );
}

/** Log the database detail; the caller only learns that it failed. */
function dbError(context: string, detail: string): Response {
  console.error(`[api/notes] ${context} failed: ${detail}`);
  return Response.json({ error: "database error" }, { status: 500 });
}

async function caller(request: Request, fallback: string | undefined) {
  return resolveUserId(request, fallback);
}

export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const body = read.body;

  let userId: string;
  try {
    userId = await caller(request, body.userId as string | undefined);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const notes = Array.isArray(body.notes) ? body.notes : [];
  const reminders = Array.isArray(body.reminders) ? body.reminders : [];
  if (
    notes.length > SYNC_LIMITS.maxItemsPerArray ||
    reminders.length > SYNC_LIMITS.maxItemsPerArray
  ) {
    return Response.json({ error: "too many items in one request" }, { status: 413 });
  }
  if (!notes.every(isNote)) {
    return Response.json(
      { error: "each note needs { id, createdAt, updatedAt } within the size limits" },
      { status: 400 }
    );
  }
  if (!reminders.every(isReminder)) {
    return Response.json(
      { error: "each reminder needs { id, dueDate, createdAt, updatedAt } within the size limits" },
      { status: 400 }
    );
  }

  const supabase = syncClient();

  try {
    const noteList = notes as NotePayload[];
    const noteSeen = await existingUpdatedAt("notes", userId, noteList.map((n) => n.id));
    const noteRows = noteList
      .filter((n) => {
        const previous = noteSeen.get(n.id);
        return previous === undefined || previous < Date.parse(n.updatedAt);
      })
      .map((n) => ({
        user_id: userId,
        item_id: n.id,
        title: n.title ?? "",
        body: n.body ?? "",
        created_at: new Date(n.createdAt).toISOString(),
        updated_at: new Date(n.updatedAt).toISOString(),
        deleted_at: optIso(n.deletedAt),
      }));

    const reminderList = reminders as ReminderPayload[];
    const reminderSeen = await existingUpdatedAt(
      "reminders",
      userId,
      reminderList.map((r) => r.id)
    );
    const reminderRows = reminderList
      .filter((r) => {
        const previous = reminderSeen.get(r.id);
        return previous === undefined || previous < Date.parse(r.updatedAt);
      })
      .map((r) => ({
        user_id: userId,
        item_id: r.id,
        title: r.title ?? "",
        body: r.body ?? "",
        due_date: new Date(r.dueDate).toISOString(),
        alert_style: r.alertStyle ?? "notification",
        sound_name: r.soundName ?? "Glass",
        repeat_rule: r.repeatRule ?? "none",
        is_completed: r.isCompleted ?? false,
        fired_at: optIso(r.firedAt),
        created_at: new Date(r.createdAt).toISOString(),
        updated_at: new Date(r.updatedAt).toISOString(),
        deleted_at: optIso(r.deletedAt),
      }));

    if (noteRows.length) {
      const { error } = await supabase
        .from("notes")
        .upsert(noteRows, { onConflict: "user_id,item_id" });
      if (error) return dbError("notes upsert", error.message);
    }
    if (reminderRows.length) {
      const { error } = await supabase
        .from("reminders")
        .upsert(reminderRows, { onConflict: "user_id,item_id" });
      if (error) return dbError("reminders upsert", error.message);
    }
  } catch (error) {
    return dbError("notes push", error instanceof Error ? error.message : String(error));
  }

  return Response.json({ ok: true, notes: notes.length, reminders: reminders.length });
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  let userId: string;
  try {
    userId = await caller(request, url.searchParams.get("userId") ?? undefined);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const supabase = syncClient();
  const [noteResult, reminderResult] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId),
    supabase.from("reminders").select("*").eq("user_id", userId),
  ]);
  if (noteResult.error) return dbError("notes read", noteResult.error.message);
  if (reminderResult.error) return dbError("reminders read", reminderResult.error.message);

  // `deletedAt` is omitted rather than null when absent, so the Swift optional
  // decodes cleanly.
  const orUndefined = (value: string | null) => value ?? undefined;

  return Response.json({
    notes: (noteResult.data ?? []).map((n) => ({
      id: n.item_id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.created_at).toISOString(),
      updatedAt: new Date(n.updated_at).toISOString(),
      deletedAt: orUndefined(n.deleted_at),
    })),
    reminders: (reminderResult.data ?? []).map((r) => ({
      id: r.item_id,
      title: r.title,
      body: r.body,
      dueDate: new Date(r.due_date).toISOString(),
      alertStyle: r.alert_style,
      soundName: r.sound_name,
      repeatRule: r.repeat_rule,
      isCompleted: r.is_completed,
      firedAt: orUndefined(r.fired_at),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      deletedAt: orUndefined(r.deleted_at),
    })),
  });
}
