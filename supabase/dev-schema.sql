-- ─────────────────────────────────────────────────────────────────────────
-- CLOUD "dev" SCHEMA — Preview-environment mirror of the production `public`
-- schema, on the SAME Supabase instance (free plan: one project).
--
--   public  → Production data
--   dev     → Preview data   (this file)
--   local   → `supabase start` uses `public` on your machine
--
-- The app picks the schema at runtime via SUPABASE_DB_SCHEMA
-- (see lib/supabase/server.ts). This file is a maintained mirror of
-- 0001_init.sql + 0002_payment_clicks.sql — if you change those, mirror the
-- change here (same rule the code already follows for points.ts).
--
-- Idempotent + additive only (no drops of `public`). Run it against the cloud
-- instance, then EXPOSE the schema:
--   Dashboard → Settings → API → "Exposed schemas" → add `dev`.
-- ─────────────────────────────────────────────────────────────────────────

create schema if not exists dev;

-- ── waitlist_entries: one row per person ─────────────────────────────────
create table if not exists dev.waitlist_entries (
  id               bigint generated always as identity primary key,
  user_id          text not null unique,
  email            text not null unique,
  full_name        text,
  company          text,
  role             text,
  use_case         text,
  platform         text,
  referral_source  text,
  referral_code    text unique,
  referred_by      text,
  status           text not null default 'pending'
                     check (status in ('pending', 'invited', 'accepted')),
  points           integer not null default 0,
  joined_position  bigint,
  position         bigint,
  moved_up         bigint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists waitlist_entries_referred_by_idx on dev.waitlist_entries (referred_by);
create index if not exists waitlist_entries_points_idx      on dev.waitlist_entries (points desc, created_at asc);

-- ── social share claims ──────────────────────────────────────────────────
create table if not exists dev.social_claims (
  id          bigint generated always as identity primary key,
  user_id     text not null references dev.waitlist_entries (user_id) on delete cascade,
  network     text not null check (network in ('x', 'linkedin')),
  created_at  timestamptz not null default now(),
  unique (user_id, network)
);

-- ── referrals ────────────────────────────────────────────────────────────
create table if not exists dev.referrals (
  id                bigint generated always as identity primary key,
  referrer_user_id  text not null,
  referred_user_id  text not null unique,
  created_at        timestamptz not null default now()
);

-- ── keep updated_at fresh ────────────────────────────────────────────────
create or replace function dev.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists waitlist_set_updated_at on dev.waitlist_entries;
create trigger waitlist_set_updated_at
  before update on dev.waitlist_entries
  for each row execute function dev.set_updated_at();

-- ── rank recompute ───────────────────────────────────────────────────────
create or replace function dev.recompute_positions()
returns void language sql security definer set search_path = dev as $$
  with ranked as (
    select id, row_number() over (order by points desc, created_at asc) as rnk
    from dev.waitlist_entries
  )
  update dev.waitlist_entries e
  set position = r.rnk,
      moved_up = greatest(coalesce(e.joined_position, r.rnk) - r.rnk, 0)
  from ranked r
  where r.id = e.id
    and (e.position is distinct from r.rnk
         or e.moved_up is distinct from greatest(coalesce(e.joined_position, r.rnk) - r.rnk, 0));
$$;

create or replace function dev.tg_recompute_positions()
returns trigger language plpgsql security definer set search_path = dev as $$
begin
  perform dev.recompute_positions();
  return null;
end; $$;

drop trigger if exists waitlist_recompute_on_insert on dev.waitlist_entries;
create trigger waitlist_recompute_on_insert
  after insert on dev.waitlist_entries
  for each statement execute function dev.tg_recompute_positions();

drop trigger if exists waitlist_recompute_on_points on dev.waitlist_entries;
create trigger waitlist_recompute_on_points
  after update of points on dev.waitlist_entries
  for each statement execute function dev.tg_recompute_positions();

-- ── BEFORE INSERT: referral code + join-position snapshot ────────────────
create or replace function dev.on_entry_before_insert()
returns trigger language plpgsql security definer set search_path = dev as $$
begin
  if new.referral_code is null then
    loop
      new.referral_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      exit when not exists (
        select 1 from dev.waitlist_entries where referral_code = new.referral_code
      );
    end loop;
  end if;
  new.joined_position := (select count(*) from dev.waitlist_entries) + 1;
  new.position := new.joined_position;
  return new;
end; $$;

drop trigger if exists waitlist_before_insert on dev.waitlist_entries;
create trigger waitlist_before_insert
  before insert on dev.waitlist_entries
  for each row execute function dev.on_entry_before_insert();

-- ── AFTER INSERT: base points + referral attribution ─────────────────────
create or replace function dev.on_entry_after_insert()
returns trigger language plpgsql security definer set search_path = dev as $$
declare v_referrer text;
begin
  update dev.waitlist_entries set points = points + 150 where id = new.id;

  if new.referred_by is not null then
    select user_id into v_referrer
      from dev.waitlist_entries
      where referral_code = new.referred_by and user_id <> new.user_id
      limit 1;

    if v_referrer is not null then
      insert into dev.referrals (referrer_user_id, referred_user_id)
      values (v_referrer, new.user_id)
      on conflict (referred_user_id) do nothing;

      if found then
        update dev.waitlist_entries
        set points = points + 200
        where user_id = v_referrer;
      end if;
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists waitlist_after_insert on dev.waitlist_entries;
create trigger waitlist_after_insert
  after insert on dev.waitlist_entries
  for each row execute function dev.on_entry_after_insert();

-- ── social-share claim ───────────────────────────────────────────────────
create or replace function dev.claim_social(p_network text, p_user_id text)
returns void language plpgsql security definer set search_path = dev as $$
begin
  insert into dev.social_claims (user_id, network)
  values (p_user_id, p_network)
  on conflict (user_id, network) do nothing;

  if found then
    update dev.waitlist_entries
    set points = points + 25
    where user_id = p_user_id;
  end if;
end; $$;

-- ── public top-N leaderboard ─────────────────────────────────────────────
create or replace function dev.top_leaderboard(p_limit int default 20)
returns table (rank bigint, display_name text, total_points int, referrals_count int)
language sql security definer set search_path = dev as $$
  select row_number() over (order by e.points desc, e.created_at asc),
         coalesce(nullif(split_part(coalesce(e.full_name, ''), ' ', 1), ''), 'Someone'),
         e.points,
         (select count(*) from dev.waitlist_entries w
           where w.referred_by = e.referral_code)::int
  from dev.waitlist_entries e
  order by e.points desc, e.created_at asc
  limit greatest(p_limit, 1);
$$;

-- ── payment_clicks (mirror of 0002) ──────────────────────────────────────
create table if not exists dev.payment_clicks (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  tier        text not null check (tier in ('supporter', 'champion', 'founder')),
  created_at  timestamptz not null default now()
);

create index if not exists payment_clicks_user_id_idx on dev.payment_clicks (user_id);
create index if not exists payment_clicks_tier_idx    on dev.payment_clicks (tier);

-- ── lock everything down: server-only access ─────────────────────────────
alter table dev.waitlist_entries enable row level security;
alter table dev.social_claims    enable row level security;
alter table dev.referrals        enable row level security;
alter table dev.payment_clicks   enable row level security;

-- service_role only (mirrors 0003_service_role_grants.sql for the dev schema;
-- non-public schemas get NO automatic grants). RLS on + no policies keeps
-- anon/authenticated denied.
grant usage on schema dev to service_role;
grant all privileges on all tables    in schema dev to service_role;
grant all privileges on all sequences in schema dev to service_role;
grant all privileges on all functions in schema dev to service_role;
alter default privileges in schema dev grant all on tables    to service_role;
alter default privileges in schema dev grant all on sequences to service_role;
alter default privileges in schema dev grant all on functions to service_role;

revoke execute on function dev.claim_social(text, text)      from public, anon, authenticated;
revoke execute on function dev.recompute_positions()         from public, anon, authenticated;
revoke execute on function dev.top_leaderboard(int)          from public, anon, authenticated;
