-- Whisper Master waitlist — Clerk-era schema.
-- Auth lives in Clerk (user ids are Clerk TEXT ids like "user_2abc…");
-- Supabase is a plain database reached ONLY through the service-role key
-- from server actions. There is no client-side Supabase access, so RLS is
-- enabled with no policies (deny by default; service role bypasses).
--
-- Point values mirror lib/waitlist/points.ts — change them in both places.
--
-- Run this in Supabase → SQL Editor on a fresh project.

-- ── waitlist_entries: one row per person ─────────────────────────────────
create table if not exists public.waitlist_entries (
  id               bigint generated always as identity primary key,
  user_id          text not null unique,          -- Clerk user id
  email            text not null unique,
  full_name        text,
  company          text,
  role             text,
  use_case         text,
  platform         text,
  referral_source  text,
  referral_code    text unique,                   -- assigned on insert (yourapp.com/r/CODE)
  referred_by      text,                          -- referrer's referral_code
  status           text not null default 'pending'
                     check (status in ('pending', 'invited', 'accepted')),
  points           integer not null default 0,
  joined_position  bigint,                        -- ordinal at join (for "moved up +N")
  position         bigint,                        -- current rank; recomputed on points changes
  moved_up         bigint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists waitlist_entries_referred_by_idx on public.waitlist_entries (referred_by);
create index if not exists waitlist_entries_points_idx      on public.waitlist_entries (points desc, created_at asc);

-- ── social share claims: one award per network per user ──────────────────
create table if not exists public.social_claims (
  id          bigint generated always as identity primary key,
  user_id     text not null references public.waitlist_entries (user_id) on delete cascade,
  network     text not null check (network in ('x', 'linkedin')),
  created_at  timestamptz not null default now(),
  unique (user_id, network)
);

-- ── referrals: a person can be referred only once ────────────────────────
create table if not exists public.referrals (
  id                bigint generated always as identity primary key,
  referrer_user_id  text not null,
  referred_user_id  text not null unique,
  created_at        timestamptz not null default now()
);

-- ── keep updated_at fresh ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists waitlist_set_updated_at on public.waitlist_entries;
create trigger waitlist_set_updated_at
  before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

-- ── rank recompute: position = points desc, joined earlier wins ties ─────
-- Cheap at waitlist scale; runs once per statement that inserts or changes
-- points. Only touches position/moved_up, so it never re-triggers itself.
create or replace function public.recompute_positions()
returns void language sql security definer set search_path = public as $$
  with ranked as (
    select id, row_number() over (order by points desc, created_at asc) as rnk
    from public.waitlist_entries
  )
  update public.waitlist_entries e
  set position = r.rnk,
      moved_up = greatest(coalesce(e.joined_position, r.rnk) - r.rnk, 0)
  from ranked r
  where r.id = e.id
    and (e.position is distinct from r.rnk
         or e.moved_up is distinct from greatest(coalesce(e.joined_position, r.rnk) - r.rnk, 0));
$$;

create or replace function public.tg_recompute_positions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_positions();
  return null;
end; $$;

drop trigger if exists waitlist_recompute_on_insert on public.waitlist_entries;
create trigger waitlist_recompute_on_insert
  after insert on public.waitlist_entries
  for each statement execute function public.tg_recompute_positions();

-- Fires only when a statement assigns `points`; recompute_positions itself
-- assigns only position/moved_up, so there is no recursion.
drop trigger if exists waitlist_recompute_on_points on public.waitlist_entries;
create trigger waitlist_recompute_on_points
  after update of points on public.waitlist_entries
  for each statement execute function public.tg_recompute_positions();

-- ── BEFORE INSERT: referral code + join-position snapshot ────────────────
create or replace function public.on_entry_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.referral_code is null then
    loop
      new.referral_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      exit when not exists (
        select 1 from public.waitlist_entries where referral_code = new.referral_code
      );
    end loop;
  end if;
  new.joined_position := (select count(*) from public.waitlist_entries) + 1;
  -- provisional rank so INSERT ... RETURNING has a value; the after-insert
  -- recompute corrects it in the same statement
  new.position := new.joined_position;
  return new;
end; $$;

drop trigger if exists waitlist_before_insert on public.waitlist_entries;
create trigger waitlist_before_insert
  before insert on public.waitlist_entries
  for each row execute function public.on_entry_before_insert();

-- ── AFTER INSERT: base points + referral attribution (once) ──────────────
create or replace function public.on_entry_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_referrer text;
begin
  -- join (100) + verified email (50) — Clerk verifies before an entry exists
  update public.waitlist_entries set points = points + 150 where id = new.id;

  if new.referred_by is not null then
    select user_id into v_referrer
      from public.waitlist_entries
      where referral_code = new.referred_by and user_id <> new.user_id
      limit 1;

    if v_referrer is not null then
      insert into public.referrals (referrer_user_id, referred_user_id)
      values (v_referrer, new.user_id)
      on conflict (referred_user_id) do nothing;

      if found then
        update public.waitlist_entries
        set points = points + 200
        where user_id = v_referrer;
      end if;
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists waitlist_after_insert on public.waitlist_entries;
create trigger waitlist_after_insert
  after insert on public.waitlist_entries
  for each row execute function public.on_entry_after_insert();

-- ── social-share claim: +25 once per network (called with service role) ──
create or replace function public.claim_social(p_network text, p_user_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.social_claims (user_id, network)
  values (p_user_id, p_network)
  on conflict (user_id, network) do nothing;

  if found then
    update public.waitlist_entries
    set points = points + 25
    where user_id = p_user_id;
  end if;
end; $$;

-- ── public top-N leaderboard: first name + points only (no emails) ───────
create or replace function public.top_leaderboard(p_limit int default 20)
returns table (rank bigint, display_name text, total_points int, referrals_count int)
language sql security definer set search_path = public as $$
  select row_number() over (order by e.points desc, e.created_at asc),
         coalesce(nullif(split_part(coalesce(e.full_name, ''), ' ', 1), ''), 'Someone'),
         e.points,
         (select count(*) from public.waitlist_entries w
           where w.referred_by = e.referral_code)::int
  from public.waitlist_entries e
  order by e.points desc, e.created_at asc
  limit greatest(p_limit, 1);
$$;

-- ── lock everything down: server-only access ─────────────────────────────
-- No client ever holds the anon key, so: RLS on, zero policies.
alter table public.waitlist_entries enable row level security;
alter table public.social_claims    enable row level security;
alter table public.referrals        enable row level security;

revoke execute on function public.claim_social(text, text)      from public, anon, authenticated;
revoke execute on function public.recompute_positions()         from public, anon, authenticated;
revoke execute on function public.top_leaderboard(int)          from public, anon, authenticated;
