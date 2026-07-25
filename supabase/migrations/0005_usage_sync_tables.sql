-- Phase 5: move the macOS app's per-user sync data (usage rollups, notes,
-- reminders) off MongoDB and into Supabase Postgres. These tables mirror the
-- old Prisma models (eval/dashboard Run/Result stay in Mongo — dashboard-only).
--
-- Write path: the eval/dashboard SvelteKit routes verify the Clerk Bearer token
-- and upsert here with the **service-role** client (bypasses RLS), keyed on the
-- trusted `sub`. The macOS app's sync transport is unchanged — it still POSTs to
-- the dashboard; only the dashboard's storage moved.
--
-- Direct-client RLS is also provided (own-row select/insert/update for
-- `authenticated`) so the app *could* read/write these directly via Option A
-- later without a schema change. Idempotent. Apply to `public` (and `dev`).

-- ── usage_daily: one row per user per local day ──────────────────────────
create table if not exists public.usage_daily (
  id                     bigint generated always as identity primary key,
  user_id                text not null,               -- Clerk user id
  day                    text not null,               -- local yyyy-MM-dd
  words                  integer not null default 0,
  dictations             integer not null default 0,
  duration_seconds       double precision not null default 0,
  fixes_words_corrected  integer not null default 0,
  fixes_dictionary       integer not null default 0,
  per_app                jsonb not null default '{}'::jsonb,
  updated_at             timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists usage_daily_user_idx on public.usage_daily (user_id);

-- ── notes: freeform notes, LWW by updated_at, soft-deleted ───────────────
create table if not exists public.notes (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  item_id     text not null,                          -- app-side stable UUID
  title       text not null default '',
  body        text not null default '',
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  unique (user_id, item_id)
);
create index if not exists notes_user_idx on public.notes (user_id);

-- ── reminders: time-based reminders, LWW by updated_at, soft-deleted ─────
create table if not exists public.reminders (
  id           bigint generated always as identity primary key,
  user_id      text not null,
  item_id      text not null,
  title        text not null default '',
  body         text not null default '',
  due_date     timestamptz not null,
  alert_style  text not null default 'notification',  -- notification | alarm
  sound_name   text not null default 'Glass',
  repeat_rule  text not null default 'none',          -- none | daily | weekly
  is_completed boolean not null default false,
  fired_at     timestamptz,
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  deleted_at   timestamptz,
  unique (user_id, item_id)
);
create index if not exists reminders_user_idx on public.reminders (user_id);

-- keep updated_at fresh on direct updates (reuses the waitlist helper)
drop trigger if exists usage_daily_set_updated_at on public.usage_daily;
create trigger usage_daily_set_updated_at
  before update on public.usage_daily
  for each row execute function public.set_updated_at();

-- ── service-role access (dashboard writer) ───────────────────────────────
grant all privileges on public.usage_daily to service_role;
grant all privileges on public.notes       to service_role;
grant all privileges on public.reminders   to service_role;

-- ── direct-client access (Option A): own-row only ────────────────────────
alter table public.usage_daily enable row level security;
alter table public.notes       enable row level security;
alter table public.reminders   enable row level security;

grant select, insert, update on public.usage_daily to authenticated;
grant select, insert, update on public.notes       to authenticated;
grant select, insert, update on public.reminders   to authenticated;

do $$
declare t text;
begin
  foreach t in array array['usage_daily', 'notes', 'reminders'] loop
    execute format('drop policy if exists %I on public.%I', 'own row: select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.jwt() ->> ''sub'')',
      'own row: select', t);

    execute format('drop policy if exists %I on public.%I', 'own row: insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.jwt() ->> ''sub'')',
      'own row: insert', t);

    execute format('drop policy if exists %I on public.%I', 'own row: update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.jwt() ->> ''sub'') with check (user_id = auth.jwt() ->> ''sub'')',
      'own row: update', t);
  end loop;
end $$;
