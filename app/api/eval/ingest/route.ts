import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseCases, prepareRun } from "@/lib/eval/ingest";
import { createRun } from "@/lib/eval/queries";
import type { ResultRow } from "@/lib/eval/scoring";

/**
 * Store one evaluation run.
 *
 * This is the write half of `/eval`. The reader is public; this is not. An
 * open ingest endpoint on a page whose whole purpose is to be believable is a
 * "publish any numbers you like about this product" button, so it fails CLOSED:
 * with `EVAL_INGEST_TOKEN` unset the route refuses every upload rather than
 * accepting them unauthenticated.
 *
 * The caller is `eval/text-cleanup/run-eval.sh` in the whisper-master repo,
 * which posts the `results.json` the Mac app's in-process EvalRunner wrote,
 * plus the `cases.jsonl` that holds the keyword rules. Scoring happens here
 * rather than in the client so the stored aggregate always comes from one
 * implementation.
 *
 * Node runtime, not edge: `timingSafeEqual` comes from `node:crypto`.
 */
export const runtime = "nodejs";

/**
 * Constant-time comparison. Length is checked first because `timingSafeEqual`
 * throws on buffers of different lengths; the length of a shared secret is not
 * itself the secret, so returning early on it leaks nothing worth having.
 */
function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const token = process.env.EVAL_INGEST_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "ingest is not configured: set EVAL_INGEST_TOKEN to accept run uploads" },
      { status: 503 }
    );
  }
  if (!tokensMatch(request.headers.get("x-ingest-token") ?? "", token)) {
    return NextResponse.json(
      { error: "unauthorized: missing or invalid x-ingest-token" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const results = body.results;
  if (!Array.isArray(results)) {
    return NextResponse.json(
      { error: "body.results must be an array (the contents of results.json)" },
      { status: 400 }
    );
  }

  const rules = parseCases(typeof body.cases === "string" ? body.cases : null);

  /**
   * How many cases the rules file does not cover.
   *
   * A case with no rule can only fail on word error, so pushing a run with the
   * wrong `cases.jsonl` does not error — it silently scores higher. That has
   * happened: the audio suite's ids are prefixed (`tts-`, `hfp-`, `noisy-`,
   * `ls-`) and only exist in the generated `.eval-scratch/audio_cases.jsonl`,
   * so pushing an audio run with the baseline file inflates the pass count by
   * every keyword failure in it. The count goes back in the response and the
   * pusher prints it, rather than being enforced here: a rule-less case is
   * legitimate, it just should never be a surprise.
   */
  const unmatchedCases = new Set(
    (results as ResultRow[]).filter((r) => !rules.has(r.id)).map((r) => r.id)
  ).size;

  const prepared = prepareRun(results as ResultRow[], rules, {
    label: typeof body.label === "string" ? body.label : null,
    gitCommit: typeof body.gitCommit === "string" ? body.gitCommit : null,
    branch: typeof body.branch === "string" ? body.branch : null,
  });

  try {
    const id = await createRun(prepared);
    return NextResponse.json({
      id,
      totalRuns: prepared.totalRuns,
      totalCases: prepared.totalCases,
      unmatchedCases,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "database error";
    console.error(`[eval/ingest] could not store the run: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
