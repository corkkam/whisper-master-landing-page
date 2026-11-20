-- Bring the dictation-cleanup evaluation history onto this project's database.
--
-- The eval dashboard used to be its own SvelteKit app on a separate Vercel
-- account, storing runs in MongoDB Atlas through Prisma. Migration 0005 moved
-- the macOS app's per-user sync (usage, notes, reminders) here and deliberately
-- left the eval tables behind; this finishes that job so the whole web surface
-- reads one database and `/eval` can be served by the marketing site.
--
-- `id` is text rather than uuid on purpose: the nine runs imported from Mongo
-- keep their 24-hex ObjectId, so every link that was ever shared at
-- `/runs/<id>` still resolves at `/eval/<id>`. New runs get a uuid, cast to
-- text by the default below.
--
-- Reads are served by the service-role client in `lib/eval/queries.ts`, so no
-- anon or authenticated grant is issued here. RLS is on with no policy, which
-- means a leaked anon key still reads nothing. Idempotent. Apply to `public`
-- (and `dev`).

-- ── eval_runs: one ingested results.json plus its computed aggregate ──────
create table if not exists public.eval_runs (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  label        text,
  git_commit   text,
  branch       text,
  -- Set when the run was cut by Scripts/release.sh, so the history reads as
  -- "how did 1.1.0-beta.9 score" and not just "how did some commit score".
  -- Null for a run pushed by hand, and for the nine imported from Mongo, which
  -- predate the release hook.
  version      text,
  channel      text,               -- stable | beta | dev
  total_runs   integer not null,   -- case x target rows
  total_cases  integer not null,
  audio_cases  integer not null,
  -- { byTarget: {light:{pass,total,latency}}, werBySource, attribution }
  aggregate    jsonb not null default '{}'::jsonb
);
create index if not exists eval_runs_created_idx on public.eval_runs (created_at desc);
-- "every run for version X, newest first" is the per-version view's only query.
create index if not exists eval_runs_version_idx
  on public.eval_runs (version, created_at desc) where version is not null;

-- ── eval_results: one scored case x target row within a run ──────────────
create table if not exists public.eval_results (
  id              bigint generated always as identity primary key,
  run_id          text not null references public.eval_runs (id) on delete cascade,
  case_id         text not null,
  category        text,
  source          text not null,    -- Text | TTS | LibriSpeech | Bluetooth | Noise
  target          text not null,    -- light | polish | slack | email | code
  input_kind      text not null,    -- text | audio
  deterministic   text not null default '',
  llm_output      text not null default '',
  guard_accepted  boolean not null default true,
  wer             double precision,
  latency_ms      jsonb not null default '{}'::jsonb,
  asr_text        text,
  asr_reference   text,
  mechanical_pass boolean not null default false,
  attribution     text,             -- asr | cleanup | null
  reasons         text[] not null default '{}'::text[]
);
-- The detail page reads one run's rows in (case, target) order; the index
-- carries that sort so a 260-row run needs no sort step.
create index if not exists eval_results_run_idx
  on public.eval_results (run_id, case_id, target);

-- ── access: server-side service role only ────────────────────────────────
grant all privileges on public.eval_runs    to service_role;
grant all privileges on public.eval_results to service_role;

alter table public.eval_runs    enable row level security;
alter table public.eval_results enable row level security;
