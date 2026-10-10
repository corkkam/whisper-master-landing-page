import "server-only";

/**
 * Size caps for the macOS app's sync writes (`POST /api/usage`, `POST /api/notes`).
 *
 * Both routes write through the service-role client, so without a cap any
 * signed-in account could store arbitrary amounts of data. The caps are set
 * well above what the shipped app sends, on purpose: the app pushes every
 * dirty item in ONE request and never splits a batch, and it retries a
 * rejected batch forever. A cap a real user can hit is a sync that is stuck
 * for good. Sources checked against: `UsageSyncClient.swift` and
 * `NotesSyncClient.swift` in the whisper-master repo.
 *
 * - Note and reminder ids are `UUID`s (36 chars). Day keys are `yyyy-MM-dd`.
 * - Titles and bodies are user-typed or dictated, with no limit in the app, so
 *   these caps are loose. A dictated reminder title is the whole utterance.
 * - The body cap sits just under Vercel's 4.5 MB request limit.
 */
export const SYNC_LIMITS = {
  maxBodyBytes: 4 * 1024 * 1024,
  maxItemsPerArray: 5000,
  maxIdChars: 200,
  maxTitleChars: 2000,
  maxNoteBodyChars: 100 * 1024,
  maxShortFieldChars: 100,
  maxPerAppBytes: 64 * 1024,
} as const;

/** Upper bounds for one day of usage. Values above are clamped, not rejected. */
export const USAGE_CLAMPS = {
  words: 1_000_000,
  dictations: 100_000,
  durationSeconds: 86_400,
  fixes: 1_000_000,
} as const;

/** Finite, at least 0, at most `max`. Non-numbers and NaN become 0. */
export function clampNumber(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), max);
}

/** `clampNumber`, rounded, for the integer columns (Postgres rejects 1.5). */
export function clampInt(value: unknown, max: number): number {
  return Math.round(clampNumber(value, max));
}

type JsonBody = { ok: true; body: Record<string, unknown> } | { ok: false; response: Response };

/**
 * Read and parse a JSON object body, refusing anything over `maxBytes`.
 *
 * `Content-Length` is checked first so an honest oversize request is refused
 * before it is read. The stream is still counted while reading, because a
 * chunked request has no `Content-Length` and a header can lie.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = SYNC_LIMITS.maxBodyBytes
): Promise<JsonBody> {
  const tooLarge = () => ({
    ok: false as const,
    response: Response.json({ error: "request body too large" }, { status: 413 }),
  });
  const invalid = () => ({
    ok: false as const,
    response: Response.json({ error: "invalid JSON body" }, { status: 400 }),
  });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();
  if (!request.body) return invalid();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return tooLarge();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return invalid();
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return invalid();
  return { ok: true, body: parsed as Record<string, unknown> };
}

/** Size in bytes of a value once serialised as JSON, as Postgres jsonb receives it. */
export function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}
