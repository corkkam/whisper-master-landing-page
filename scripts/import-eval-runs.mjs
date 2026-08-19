/**
 * One-time import: pull the evaluation history out of the retired dashboard
 * and into this project's Supabase database.
 *
 * The eval dashboard was a separate SvelteKit app on a separate Vercel account,
 * storing runs in MongoDB Atlas. Its read API is public, which is what makes
 * this possible without the Atlas connection string: every run, and every case
 * row inside it, can be read over HTTP and written straight into the
 * `eval_runs` / `eval_results` tables from migration 0010.
 *
 * Runs keep their original 24-hex Mongo id, so this is idempotent — a run that
 * is already present is skipped, and any URL that was shared as
 * `/runs/<id>` resolves at `/eval/<id>` here.
 *
 *   node scripts/import-eval-runs.mjs           # import what is missing
 *   node scripts/import-eval-runs.mjs --dry-run # list what it would do
 *   SOURCE=https://… node scripts/import-eval-runs.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * SUPABASE_DB_SCHEMA from the environment, falling back to .env.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SOURCE = process.env.SOURCE ?? "https://whisper-eval-dashboard.vercel.app";
const DRY_RUN = process.argv.includes("--dry-run");

// Node does not load .env.local, and this script is run by hand.
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const match = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(
      new RegExp(`^${name}\\s*=\\s*"?([^"\\n]+)"?`, "m")
    );
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(2);
}
const supabase = createClient(url, key, {
  db: { schema: env("SUPABASE_DB_SCHEMA") ?? "public" },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function get(path) {
  const response = await fetch(SOURCE + path);
  if (!response.ok) throw new Error(`GET ${path} → ${response.status}`);
  return response.json();
}

/** Every run summary the source holds, newest first. */
async function allRuns() {
  const runs = [];
  for (let page = 1; ; page++) {
    const batch = await get(`/api/runs?page=${page}&pageSize=50`);
    runs.push(...batch.runs);
    if (runs.length >= batch.total || batch.runs.length === 0) return runs;
  }
}

/**
 * Every case row of one run, flattened back out of the grouped shape the read
 * API returns. One group carries one entry per target, and each entry is the
 * stored row, so nothing is reconstructed or inferred here.
 */
async function allResults(runId) {
  const rows = [];
  for (let page = 1; ; page++) {
    const batch = await get(
      `/api/runs/${runId}/cases?page=${page}&pageSize=50&outcome=all&source=all&q=`
    );
    for (const group of batch.cases) {
      for (const result of Object.values(group.targets)) {
        rows.push({
          run_id: runId,
          case_id: result.caseId,
          category: result.category,
          source: result.source,
          target: result.target,
          input_kind: result.inputKind,
          deterministic: result.deterministic ?? "",
          llm_output: result.llmOutput ?? "",
          guard_accepted: result.guardAccepted ?? true,
          wer: result.wer,
          latency_ms: result.latencyMs ?? {},
          asr_text: result.asrText,
          asr_reference: result.asrReference,
          mechanical_pass: result.mechanicalPass ?? false,
          attribution: result.attribution,
          reasons: result.reasons ?? [],
        });
      }
    }
    if (page * 50 >= batch.total || batch.cases.length === 0) return rows;
  }
}

const runs = await allRuns();
console.log(`${SOURCE} holds ${runs.length} run(s).`);

const { data: existing, error: existingError } = await supabase.from("eval_runs").select("id");
if (existingError) {
  console.error(`Could not read eval_runs: ${existingError.message}`);
  console.error("Has migration 0010_eval_runs.sql been applied to this project?");
  process.exit(1);
}
const have = new Set((existing ?? []).map((r) => r.id));

let imported = 0;
for (const run of [...runs].reverse()) {
  const name = `${run.id}  ${run.label ?? "run"}`;
  if (have.has(run.id)) {
    console.log(`  skip    ${name} (already here)`);
    continue;
  }

  const rows = await allResults(run.id);
  if (DRY_RUN) {
    console.log(`  would   ${name} — ${rows.length} rows`);
    continue;
  }

  const { error: runError } = await supabase.from("eval_runs").insert({
    id: run.id,
    created_at: run.createdAt,
    label: run.label,
    git_commit: run.gitCommit,
    branch: run.branch,
    total_runs: run.totalRuns,
    total_cases: run.totalCases,
    audio_cases: run.audioCases,
    aggregate: run.aggregate,
  });
  if (runError) {
    console.error(`  FAILED  ${name}: ${runError.message}`);
    process.exit(1);
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error: rowError } = await supabase.from("eval_results").insert(rows.slice(i, i + 500));
    if (rowError) {
      // Leave nothing half-written: a run with missing cases reads as a
      // regression rather than as a failed import.
      await supabase.from("eval_runs").delete().eq("id", run.id);
      console.error(`  FAILED  ${name}: ${rowError.message}`);
      process.exit(1);
    }
  }

  imported++;
  console.log(`  import  ${name} — ${rows.length} rows`);
}

console.log(DRY_RUN ? "Dry run, nothing written." : `Imported ${imported} run(s).`);
