-- Whisper Master — paid entitlements, mirrored from Clerk.
--
-- Clerk `publicMetadata` is the SOURCE OF TRUTH for whether someone has paid
-- (doc 10 §10.4, and the same mechanism `betaAccess` already uses — the Mac app
-- reads it directly after sign-in). These tables are a MIRROR, for the things
-- Clerk metadata is bad at: reporting, revenue queries, exports, and answering
-- "what did our webhook actually do with that event" three weeks later.
--
-- Nothing should ever read `entitlements` to decide whether to unlock a
-- feature. If those two ever disagree, Clerk wins.
--
-- Same access model as the rest of this schema: RLS on, zero policies, reached
-- only via the service-role key from server-only modules.

create table if not exists public.entitlements (
  clerk_user_id          text primary key,
  tier                   text not null default 'free'
                           check (tier in ('free', 'pro', 'team', 'practice', 'lifetime')),
  active                 boolean not null default false,
  seats                  integer,

  polar_customer_id      text,
  polar_subscription_id  text,
  polar_order_id         text,

  -- Null means no expiry — a lifetime licence, or a free account.
  current_period_end     timestamptz,
  revoked_reason         text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists entitlements_tier_idx     on public.entitlements (tier, active);
create index if not exists entitlements_customer_idx on public.entitlements (polar_customer_id);
create index if not exists entitlements_period_idx   on public.entitlements (current_period_end)
  where current_period_end is not null;

-- ── billing_events: append-only audit trail ──────────────────────────────
-- Every webhook we acted on. Deliberately has no unique constraint and is never
-- updated: it is a log, and a log that can be rewritten is not evidence.
create table if not exists public.billing_events (
  id                bigint generated always as identity primary key,
  event_type        text not null,
  clerk_user_id     text,
  polar_customer_id text,
  product_id        text,
  detail            text,
  created_at        timestamptz not null default now()
);

create index if not exists billing_events_user_idx on public.billing_events (clerk_user_id, created_at desc);
create index if not exists billing_events_type_idx on public.billing_events (event_type, created_at desc);

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- ── revenue_summary: what is actually being earned ───────────────────────
create or replace function public.revenue_summary()
returns table (tier text, holders bigint, seats_total bigint)
language sql security definer set search_path = public as $$
  select e.tier, count(*)::bigint, coalesce(sum(e.seats), count(*))::bigint
  from public.entitlements e
  where e.active
  group by e.tier;
$$;

alter table public.entitlements  enable row level security;
alter table public.billing_events enable row level security;

revoke execute on function public.revenue_summary() from public, anon, authenticated;
