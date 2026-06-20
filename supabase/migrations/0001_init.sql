-- Whispr waitlist — schema, position counter, auto-profile, and RLS.
-- Run this in Supabase → SQL Editor (or via the Supabase CLI) once.

-- ── profiles: one row per authenticated user ─────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  provider    text,
  created_at  timestamptz not null default now()
);

-- ── waitlist position counter (starts above the public "2,400+" number) ──
create sequence if not exists public.waitlist_position_seq start with 2401;

-- ── waitlist_entries: one row per person ─────────────────────────────────
create table if not exists public.waitlist_entries (
  id               bigint generated always as identity primary key,
  user_id          uuid references public.profiles (id) on delete set null,
  email            text not null unique,
  full_name        text,
  company          text,
  role             text,
  use_case         text,
  platform         text,
  referral_source  text,
  referred_by      text,
  status           text not null default 'pending'
                     check (status in ('pending', 'invited', 'accepted')),
  position         bigint not null default nextval('public.waitlist_position_seq'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists waitlist_entries_user_id_idx on public.waitlist_entries (user_id);

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

-- ── auto-create a profile when a user signs up (Google or email OTP) ─────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row-Level Security: everyone touches only their own rows ─────────────
alter table public.profiles        enable row level security;
alter table public.waitlist_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "waitlist_select_own" on public.waitlist_entries;
create policy "waitlist_select_own" on public.waitlist_entries
  for select using (auth.uid() = user_id);

drop policy if exists "waitlist_insert_own" on public.waitlist_entries;
create policy "waitlist_insert_own" on public.waitlist_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "waitlist_update_own" on public.waitlist_entries;
create policy "waitlist_update_own" on public.waitlist_entries
  for update using (auth.uid() = user_id);

-- Admin/server reads use the service-role key, which bypasses RLS.
