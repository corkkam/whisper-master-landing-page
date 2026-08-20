// The eval history's data layer: Supabase Postgres, service-role, server only.
//
// These tables (`eval_runs`, `eval_results`, migration 0010) used to live in a
// MongoDB Atlas cluster behind a separate SvelteKit deploy. Nothing about the
// shapes changed in the move, so `lib/eval/scoring.ts` still produces the
// aggregate that goes into `eval_runs.aggregate` verbatim.
//
// Reads are public in the sense that `/eval` renders them for anyone, but they
// go out through the service-role client on the server. The tables carry RLS
// with no policy, so the anon key reads nothing even if it leaks.
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Aggregate } from "./scoring";
import type { PreparedRun } from "./ingest";
import {
  groupByCase,
  type CasesPage,
  type ResultDTO,
  type RunSummary,
  type RunsPage,
} from "./types";

/**
 * Supabase caps a single response at `max_rows` (1000 by default), so one run's
 * result rows are read in pages rather than in one shot. A run is ~260 rows
 * today; the cap below is the point at which this stops being a sane way to
 * read them and the grouping belongs in SQL.
 */
const ROW_PAGE = 1000;
const ROW_CAP = 10_000;

/**
 * The eval history is pinned to the `public` schema in every environment.
 *
 * Everything else in this app follows `SUPABASE_DB_SCHEMA`, which is `dev` on
 * preview deployments, because that data is per-user and a preview must not
 * touch production rows. Eval runs are the opposite: they are one public
 * record of how the shipped Mac app scores, and there is no such thing as
 * "the preview's eval history". Splitting them per environment would mean
 * mirroring the tables into `dev` and then looking at an empty page during
 * every review.
 *
 * This is a read pin. Writes go through /api/eval/ingest, which needs
 * `EVAL_INGEST_TOKEN`; leave that unset on preview so a preview deployment
 * cannot publish a run.
 */
const EVAL_SCHEMA = "public";

function createEvalClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Cast: no generated DB types here, so `schema` is typed as "public".
      db: { schema: EVAL_SCHEMA as "public" },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

const RUN_COLUMNS =
  "id, created_at, label, git_commit, branch, version, channel, total_runs, total_cases, audio_cases, aggregate";

type RunRow = {
  id: string;
  created_at: string;
  label: string | null;
  git_commit: string | null;
  branch: string | null;
  version: string | null;
  channel: string | null;
  total_runs: number;
  total_cases: number;
  audio_cases: number;
  aggregate: unknown;
};

type ResultRow = {
  case_id: string;
  category: string | null;
  source: string;
  target: string;
  input_kind: string;
  deterministic: string;
  llm_output: string;
  guard_accepted: boolean;
  wer: number | null;
  latency_ms: unknown;
  asr_text: string | null;
  asr_reference: string | null;
  mechanical_pass: boolean;
  attribution: string | null;
  reasons: string[] | null;
};

function toRunSummary(r: RunRow): RunSummary {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    label: r.label,
    gitCommit: r.git_commit,
    branch: r.branch,
    version: r.version,
    channel: r.channel,
    totalRuns: r.total_runs,
    totalCases: r.total_cases,
    audioCases: r.audio_cases,
    aggregate: (r.aggregate ?? {}) as Aggregate,
  };
}

function toResultDTO(r: ResultRow): ResultDTO {
  return {
    caseId: r.case_id,
    category: r.category,
    source: r.source,
    target: r.target,
    inputKind: r.input_kind,
    deterministic: r.deterministic,
    llmOutput: r.llm_output,
    guardAccepted: r.guard_accepted,
    wer: r.wer,
    latencyMs: (r.latency_ms as Record<string, number>) ?? {},
    asrText: r.asr_text,
    asrReference: r.asr_reference,
    mechanicalPass: r.mechanical_pass,
    attribution: r.attribution,
    reasons: r.reasons ?? [],
  };
}

/** Paginated run history, newest first. Throws if the read fails. */
export async function listRunsPaged(page: number, pageSize: number): Promise<RunsPage> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await createEvalClient()
    .from("eval_runs")
    .select(RUN_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);
  return {
    runs: ((data ?? []) as RunRow[]).map(toRunSummary),
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** One run's metadata and aggregate, without the result rows. */
export async function getRunSummary(id: string): Promise<RunSummary | null> {
  const { data, error } = await createEvalClient()
    .from("eval_runs")
    .select(RUN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toRunSummary(data as RunRow) : null;
}

async function readAllResults(runId: string): Promise<ResultDTO[]> {
  const client = createEvalClient();
  const rows: ResultDTO[] = [];
  for (let from = 0; from < ROW_CAP; from += ROW_PAGE) {
    const { data, error } = await client
      .from("eval_results")
      .select(
        "case_id, category, source, target, input_kind, deterministic, llm_output, guard_accepted, wer, latency_ms, asr_text, asr_reference, mechanical_pass, attribution, reasons"
      )
      .eq("run_id", runId)
      .order("case_id", { ascending: true })
      .order("target", { ascending: true })
      .range(from, from + ROW_PAGE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ResultRow[];
    rows.push(...batch.map(toResultDTO));
    if (batch.length < ROW_PAGE) break;
  }
  return rows;
}

export interface CaseFilters {
  page: number;
  pageSize: number;
  outcome: "all" | "pass" | "fail";
  /** "all", or one of Text / TTS / LibriSpeech / Bluetooth / Noise. */
  source: string;
  q: string;
}

/**
 * Cases for a run, grouped light+polish per case, filtered and paginated.
 *
 * A run holds a few hundred rows, so they are read once and grouped, filtered
 * and sliced in memory. That keeps the filter semantics identical to the
 * offline scorer, and the page only ever ships one slice to the browser.
 * Returns `null` when the run does not exist.
 */
export async function getRunCases(id: string, f: CaseFilters): Promise<CasesPage | null> {
  const summary = await getRunSummary(id);
  if (!summary) return null;

  let groups = groupByCase(await readAllResults(id));

  if (f.source !== "all") groups = groups.filter((g) => g.source === f.source);
  if (f.outcome === "pass") groups = groups.filter((g) => !g.anyFail);
  else if (f.outcome === "fail") groups = groups.filter((g) => g.anyFail);
  if (f.q) {
    const needle = f.q.toLowerCase();
    groups = groups.filter(
      (g) =>
        g.caseId.toLowerCase().includes(needle) ||
        g.deterministic.toLowerCase().includes(needle) ||
        Object.values(g.targets).some((t) => t.llmOutput.toLowerCase().includes(needle))
    );
  }

  const total = groups.length;
  const start = (f.page - 1) * f.pageSize;
  return {
    cases: groups.slice(start, start + f.pageSize),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}

/**
 * Store a scored run and return its id.
 *
 * The run row goes in first so the results can reference it; if the result
 * insert then fails the run row is deleted, because a run with no cases renders
 * as a zero and reads like a catastrophic regression rather than a failed
 * upload. There is no transaction available through PostgREST, so this is the
 * honest approximation.
 */
export async function createRun(run: PreparedRun, id?: string): Promise<string> {
  const client = createEvalClient();

  const { data, error } = await client
    .from("eval_runs")
    .insert({
      ...(id ? { id } : {}),
      label: run.label,
      git_commit: run.gitCommit,
      branch: run.branch,
      version: run.version,
      channel: run.channel,
      total_runs: run.totalRuns,
      total_cases: run.totalCases,
      audio_cases: run.audioCases,
      aggregate: run.aggregate,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "could not create the run row");
  const runId = (data as { id: string }).id;

  const rows = run.results.map((r) => ({
    run_id: runId,
    case_id: r.caseId,
    category: r.category,
    source: r.source,
    target: r.target,
    input_kind: r.inputKind,
    deterministic: r.deterministic,
    llm_output: r.llmOutput,
    guard_accepted: r.guardAccepted,
    wer: r.wer,
    latency_ms: r.latencyMs,
    asr_text: r.asrText,
    asr_reference: r.asrReference,
    mechanical_pass: r.mechanicalPass,
    attribution: r.attribution,
    reasons: r.reasons,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error: rowError } = await client.from("eval_results").insert(rows.slice(i, i + 500));
    if (rowError) {
      await client.from("eval_runs").delete().eq("id", runId);
      throw new Error(rowError.message);
    }
  }

  return runId;
}

/**
 * The newest run for each version that has one, newest version first.
 *
 * Backs the per-version view: a release cuts one run, but a re-run against the
 * same version is allowed (a flaky suite, a re-push), and the last one is the
 * one that counts. Grouping happens here rather than in SQL because PostgREST
 * has no DISTINCT ON, and the row count is the number of releases, not the
 * number of cases.
 */
export async function listRunsByVersion(limit = 40): Promise<RunSummary[]> {
  const { data, error } = await createEvalClient()
    .from("eval_runs")
    .select(RUN_COLUMNS)
    .not("version", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const newestPerVersion = new Map<string, RunSummary>();
  for (const row of (data ?? []) as RunRow[]) {
    const run = toRunSummary(row);
    const key = `${run.version}\u0000${run.channel ?? ""}`;
    if (!newestPerVersion.has(key)) newestPerVersion.set(key, run);
  }
  return [...newestPerVersion.values()].slice(0, limit);
}

/** Delete a run and, by cascade, its result rows. */
export async function deleteRun(id: string): Promise<void> {
  const { error } = await createEvalClient().from("eval_runs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
