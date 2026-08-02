-- Whisper Master — B2B lead pipeline.
--
-- WHY THIS EXISTS
-- The waitlist in 0001_init.sql captures *individuals* who want the app. It is
-- a consumer funnel: Clerk-authenticated, points, referrals, leaderboard. It is
-- the wrong instrument for the revenue that actually pays for this company.
--
-- The high-value buyer is a *firm* — a law practice, a clinic, a therapy group —
-- that cannot use cloud dictation for regulatory reasons and will pay per seat.
-- That buyer behaves nothing like a waitlist signup:
--
--   • They will NOT create an account to make an enquiry. Requiring Clerk here
--     would silently delete most of this funnel. So `leads` is written by an
--     unauthenticated, Turnstile-gated action, and `clerk_user_id` is captured
--     only opportunistically when the enquirer happens to be signed in.
--   • They arrive once and are then worked by a human over weeks. So the row is
--     a *pipeline record* with a stage, an owner note and a next action — not an
--     immutable signup event.
--   • They need to be triaged, because a solo founder cannot chase everyone. So
--     the row carries a server-computed score and band (see lib/leads/scoring.ts).
--
-- Same access model as the rest of this schema: RLS on, zero policies, reached
-- only through the service-role key from server-only modules.

-- ── leads: one row per enquiring organisation ────────────────────────────
create table if not exists public.leads (
  id                bigint generated always as identity primary key,

  -- Identity. `email` is the natural key: a firm that enquires twice should
  -- update one pipeline record, not fork into two the founder has to reconcile.
  email             text not null unique,
  full_name         text not null,
  organisation      text,
  role              text,
  phone             text,

  -- Qualification. These are the answers the score is computed from; keep them
  -- as free-ish text rather than enums so the form can evolve without a
  -- migration, and validate shape in lib/leads/schema.ts instead.
  vertical          text not null,
  seats             text not null,
  compliance_driver text,   -- the rule that makes cloud dictation unusable for them
  current_tool      text,   -- what they use today; naming a paid incumbent means budget exists
  timeline          text,
  notes             text,

  -- Attribution. Which page and campaign produced this, so spend and effort can
  -- be pointed at whatever actually works.
  source            text,
  utm               jsonb,
  country           text,

  -- Abuse control. A salted hash, never the address itself — this is a
  -- privacy-first product and storing raw visitor IPs to protect a lead form
  -- would contradict the thing we sell. Enough to rate-limit, useless if leaked.
  ip_hash           text,

  -- Triage. Server-computed on write; never accepted from the client.
  score             integer not null default 0,
  band              text    not null default 'cold' check (band in ('hot', 'warm', 'cold')),

  -- Pipeline. Owned by the founder, never touched by the public form — see the
  -- upsert function below, which deliberately refuses to overwrite these.
  stage             text    not null default 'new'
                      check (stage in ('new', 'qualified', 'demo', 'pilot', 'proposal', 'won', 'lost')),
  owner_note        text,
  next_action       text,
  next_action_at    date,
  lost_reason       text,
  deal_value_usd    integer,

  -- Opportunistic linkage to the consumer funnel: if a lead is already a
  -- product user, that is the strongest possible qualification signal.
  clerk_user_id     text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists leads_stage_idx      on public.leads (stage, score desc);
create index if not exists leads_score_idx      on public.leads (score desc, created_at desc);
create index if not exists leads_vertical_idx   on public.leads (vertical);
create index if not exists leads_created_idx    on public.leads (created_at desc);
create index if not exists leads_next_action_idx on public.leads (next_action_at asc nulls last);
create index if not exists leads_ip_hash_idx    on public.leads (ip_hash, created_at desc);

-- ── lead_events: the activity log ────────────────────────────────────────
-- Every stage change, note and re-enquiry lands here. Without this the pipeline
-- is a set of current states with no history, and "why did this deal stall" has
-- no answer.
create table if not exists public.lead_events (
  id          bigint generated always as identity primary key,
  lead_id     bigint not null references public.leads (id) on delete cascade,
  kind        text not null check (kind in ('created', 'resubmitted', 'stage_change', 'note', 'email', 'call', 'demo', 'trial_started')),
  detail      text,
  from_stage  text,
  to_stage    text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── upsert_lead: the only write path the public form has ─────────────────
-- Split out as a function rather than done in TypeScript for one reason: the
-- conflict branch must be *incapable* of touching pipeline columns. Expressed
-- as a Supabase `.upsert()` in application code, "don't clobber stage" is a
-- convention that a future edit quietly breaks. Here it is structural — the
-- update list simply does not contain `stage`, `owner_note`, `next_action` or
-- `lost_reason`, so a resubmission can never reset a deal the founder has
-- already advanced, and an unauthenticated caller can never write to them.
--
-- Score and band are parameters rather than computed here because the scoring
-- model belongs in lib/leads/scoring.ts where it is testable and reviewable;
-- the point is only that they arrive from the server, never from the browser.
create or replace function public.upsert_lead(
  p_email             text,
  p_full_name         text,
  p_organisation      text,
  p_role              text,
  p_phone             text,
  p_vertical          text,
  p_seats             text,
  p_compliance_driver text,
  p_current_tool      text,
  p_timeline          text,
  p_notes             text,
  p_source            text,
  p_utm               jsonb,
  p_country           text,
  p_ip_hash           text,
  p_score             integer,
  p_band              text,
  p_clerk_user_id     text
)
returns table (lead_id bigint, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_id      bigint;
  v_existed boolean;
begin
  select id into v_id from public.leads where email = lower(trim(p_email));
  v_existed := v_id is not null;

  if v_existed then
    update public.leads set
      full_name         = coalesce(nullif(trim(p_full_name), ''), full_name),
      organisation      = coalesce(nullif(trim(p_organisation), ''), organisation),
      role              = coalesce(nullif(trim(p_role), ''), role),
      phone             = coalesce(nullif(trim(p_phone), ''), phone),
      vertical          = p_vertical,
      seats             = p_seats,
      compliance_driver = coalesce(nullif(trim(p_compliance_driver), ''), compliance_driver),
      current_tool      = coalesce(nullif(trim(p_current_tool), ''), current_tool),
      timeline          = p_timeline,
      -- Append rather than replace: the second enquiry usually adds context
      -- ("we now have budget"), and overwriting would destroy the first.
      notes             = concat_ws(E'\n\n---\n\n', nullif(notes, ''), nullif(trim(p_notes), '')),
      -- Re-score, but never downgrade a lead the founder has already worked up.
      score             = greatest(coalesce(score, 0), p_score),
      band              = case when p_score > coalesce(score, 0) then p_band else band end,
      clerk_user_id     = coalesce(p_clerk_user_id, clerk_user_id),
      ip_hash           = p_ip_hash
      -- NOT updated, deliberately: stage, owner_note, next_action,
      -- next_action_at, lost_reason, deal_value_usd, source, utm, created_at.
    where id = v_id;

    insert into public.lead_events (lead_id, kind, detail)
    values (v_id, 'resubmitted', concat('Re-enquiry from ', coalesce(p_source, 'unknown source')));
  else
    insert into public.leads (
      email, full_name, organisation, role, phone,
      vertical, seats, compliance_driver, current_tool, timeline, notes,
      source, utm, country, ip_hash, score, band, clerk_user_id
    ) values (
      lower(trim(p_email)), trim(p_full_name), nullif(trim(p_organisation), ''),
      nullif(trim(p_role), ''), nullif(trim(p_phone), ''),
      p_vertical, p_seats, nullif(trim(p_compliance_driver), ''),
      nullif(trim(p_current_tool), ''), p_timeline, nullif(trim(p_notes), ''),
      p_source, p_utm, p_country, p_ip_hash, p_score, p_band, p_clerk_user_id
    )
    returning id into v_id;

    insert into public.lead_events (lead_id, kind, detail)
    values (v_id, 'created', concat('Enquiry from ', coalesce(p_source, 'unknown source')));
  end if;

  return query select v_id, not v_existed;
end; $$;

-- ── set_lead_stage: founder-side pipeline move, with history ─────────────
create or replace function public.set_lead_stage(
  p_lead_id     bigint,
  p_stage       text,
  p_detail      text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_from text;
begin
  select stage into v_from from public.leads where id = p_lead_id;
  if v_from is null then return; end if;
  if v_from = p_stage then return; end if;

  update public.leads set stage = p_stage where id = p_lead_id;

  insert into public.lead_events (lead_id, kind, detail, from_stage, to_stage)
  values (p_lead_id, 'stage_change', p_detail, v_from, p_stage);
end; $$;

-- ── pipeline_summary: the founder's one-glance number ────────────────────
create or replace function public.pipeline_summary()
returns table (stage text, count bigint, pipeline_usd bigint)
language sql security definer set search_path = public as $$
  select l.stage, count(*)::bigint, coalesce(sum(l.deal_value_usd), 0)::bigint
  from public.leads l
  group by l.stage;
$$;

-- ── lock down: server-only, same as every other table here ───────────────
alter table public.leads       enable row level security;
alter table public.lead_events enable row level security;

revoke execute on function public.upsert_lead(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.set_lead_stage(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.pipeline_summary()                 from public, anon, authenticated;
