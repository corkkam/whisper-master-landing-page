-- Payment-interest tracking: one row per click on a "skip the queue"
-- donation tier. No payment happens yet (checkout is stubbed) — this
-- measures how many users would pay, and for which tier.
--
-- Server-only access (service role), same model as 0001_init.sql.

create table if not exists public.payment_clicks (
  id          bigint generated always as identity primary key,
  user_id     text not null,                 -- Clerk user id
  tier        text not null check (tier in ('supporter', 'champion', 'founder')),
  created_at  timestamptz not null default now()
);

create index if not exists payment_clicks_user_id_idx on public.payment_clicks (user_id);
create index if not exists payment_clicks_tier_idx    on public.payment_clicks (tier);

alter table public.payment_clicks enable row level security;
