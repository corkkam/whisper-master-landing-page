-- Whispr waitlist — viral layer (v1): referral codes, append-only points
-- ledger, idempotent awards, referrals, and secure rank/leaderboard RPCs.
-- Run AFTER 0001_init.sql.

-- ── referral + signup metadata on entries ────────────────────────────────
alter table public.waitlist_entries
  add column if not exists referral_code   text unique,
  add column if not exists referred_by     text,     -- referrer's referral_code
  add column if not exists signup_ip       text,
  add column if not exists joined_position bigint;    -- ordinal at join (for "moved up +N")

-- short, shareable code e.g. yourapp.com/r/AB12CD34
-- core functions only (md5/random) — avoids the pgcrypto/search_path issue
-- where gen_random_bytes lives in the `extensions` schema on Supabase.
create or replace function public.new_referral_code()
returns text language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- ── append-only points ledger (totalPoints = SUM; never a mutable counter) ─
create table if not exists public.points_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,        -- join | email_verify | referral | social_x | social_linkedin | donation
  points      integer not null,
  dedupe_key  text not null unique, -- every award is idempotent
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists points_events_user_idx on public.points_events(user_id);

-- idempotent award helper (server-only via SECURITY DEFINER; never client-callable)
create or replace function public.award_points(
  p_user uuid, p_type text, p_points int, p_dedupe text, p_meta jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_events(user_id, type, points, dedupe_key, meta)
  values (p_user, p_type, p_points, p_dedupe, coalesce(p_meta, '{}'::jsonb))
  on conflict (dedupe_key) do nothing;
end; $$;

-- ── referrals (a person can be referred only once) ───────────────────────
create table if not exists public.referrals (
  id           bigint generated always as identity primary key,
  referrer_id  uuid not null references public.profiles(id) on delete cascade,
  referred_id  uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'verified' check (status in ('pending','verified','rejected')),
  created_at   timestamptz not null default now(),
  unique (referred_id)
);

-- ── reward claims (milestones; granting logic lands with rewards UI) ──────
create table if not exists public.reward_claims (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  milestone   text not null,         -- e.g. 'beta' | 'priority' | 'pro_1mo' | 'founder' | 'lifetime'
  claimed_at  timestamptz not null default now(),
  unique (user_id, milestone)
);

-- ── BEFORE INSERT: assign a unique code + snapshot join position ─────────
create or replace function public.on_entry_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.referral_code is null then
    loop
      new.referral_code := public.new_referral_code();
      exit when not exists (
        select 1 from public.waitlist_entries where referral_code = new.referral_code
      );
    end loop;
  end if;
  new.joined_position := (select count(*) from public.waitlist_entries) + 1;
  return new;
end; $$;

drop trigger if exists waitlist_before_insert on public.waitlist_entries;
create trigger waitlist_before_insert
  before insert on public.waitlist_entries
  for each row execute function public.on_entry_before_insert();

-- ── AFTER INSERT: award base points + attribute the referral (once) ──────
-- Point values live here (source of truth for awards); lib/waitlist/points.ts
-- mirrors them for display.
create or replace function public.on_entry_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_referrer uuid;
begin
  -- email is already verified (OTP/Google) before an entry can exist
  perform public.award_points(new.user_id, 'join',         100, 'join:'   || new.user_id::text);
  perform public.award_points(new.user_id, 'email_verify',  50, 'verify:' || new.user_id::text);

  if new.referred_by is not null then
    select user_id into v_referrer
      from public.waitlist_entries
      where referral_code = new.referred_by and user_id <> new.user_id
      limit 1;

    if v_referrer is not null then
      insert into public.referrals(referrer_id, referred_id, status)
      values (v_referrer, new.user_id, 'verified')
      on conflict (referred_id) do nothing;

      perform public.award_points(
        v_referrer, 'referral', 200, 'ref:' || new.user_id::text,
        jsonb_build_object('referred_email', new.email)
      );
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists waitlist_after_insert on public.waitlist_entries;
create trigger waitlist_after_insert
  after insert on public.waitlist_entries
  for each row execute function public.on_entry_after_insert();

-- ── secure read RPCs ──────────────────────────────────────────────────────
-- Caller's own status only (rank computed across everyone, but only their row
-- is returned). SECURITY DEFINER so it can rank globally without leaking rows.
create or replace function public.my_status()
returns table (
  rank bigint, total_points int, referrals_count int, moved_up bigint, joined_position bigint
) language sql security definer set search_path = public as $$
  with totals as (
    select e.user_id, e.created_at, e.joined_position, e.referral_code,
      coalesce((select sum(points) from public.points_events pe where pe.user_id = e.user_id), 0) as tp
    from public.waitlist_entries e
  ),
  ranked as (
    select *, row_number() over (order by tp desc, created_at asc) as rnk from totals
  )
  select r.rnk,
         r.tp::int,
         (select count(*) from public.waitlist_entries w where w.referred_by = r.referral_code)::int,
         greatest(r.joined_position - r.rnk, 0),
         r.joined_position
  from ranked r
  where r.user_id = auth.uid();
$$;

-- Public top-N leaderboard — first name + points only (no emails).
create or replace function public.top_leaderboard(p_limit int default 20)
returns table (rank bigint, display_name text, total_points int, referrals_count int)
language sql security definer set search_path = public as $$
  with totals as (
    select e.user_id, e.created_at, e.referral_code, e.full_name,
      coalesce((select sum(points) from public.points_events pe where pe.user_id = e.user_id), 0) as tp
    from public.waitlist_entries e
  )
  select row_number() over (order by tp desc, created_at asc),
         coalesce(nullif(split_part(coalesce(full_name,''), ' ', 1), ''), 'Someone'),
         tp::int,
         (select count(*) from public.waitlist_entries w where w.referred_by = totals.referral_code)::int
  from totals
  order by tp desc, created_at asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.my_status()        to authenticated;
grant execute on function public.top_leaderboard(int) to anon, authenticated;

-- points_events / referrals / reward_claims are written only via SECURITY
-- DEFINER functions and the service role, so we keep RLS on with no public
-- write policies (deny by default).
alter table public.points_events enable row level security;
alter table public.referrals     enable row level security;
alter table public.reward_claims enable row level security;

drop policy if exists "points_select_own" on public.points_events;
create policy "points_select_own" on public.points_events
  for select using (auth.uid() = user_id);

drop policy if exists "reward_claims_select_own" on public.reward_claims;
create policy "reward_claims_select_own" on public.reward_claims
  for select using (auth.uid() = user_id);

-- ── lock down award_points: clients must NEVER call it directly ──────────
-- (SECURITY DEFINER callers like triggers / claim_social still can, as owner.)
revoke execute on function public.award_points(uuid, text, integer, text, jsonb)
  from public, anon, authenticated;

-- ── social-share claim: awards 25 pts to the caller, once per network ────
create or replace function public.claim_social(p_network text)
returns void language plpgsql security definer set search_path = public as $$
declare v_type text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_network = 'x' then v_type := 'social_x';
  elsif p_network = 'linkedin' then v_type := 'social_linkedin';
  else raise exception 'unknown network';
  end if;
  -- only for users who already have an entry
  if not exists (select 1 from public.waitlist_entries where user_id = auth.uid()) then
    raise exception 'no waitlist entry';
  end if;
  perform public.award_points(auth.uid(), v_type, 25, v_type || ':' || auth.uid()::text);
end; $$;

grant execute on function public.claim_social(text) to authenticated;
