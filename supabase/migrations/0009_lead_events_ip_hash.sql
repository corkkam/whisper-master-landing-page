-- 0009_lead_events_ip_hash.sql
--
-- Fixes the follow-up left at the bottom of 0008_lead_upsert_hardening.sql:
-- the IP rate cap in lib/leads/queries.ts counts rows in `leads`, but a
-- resubmission to a known email updates the existing row instead of inserting
-- one. A resubmit loop against one email is therefore invisible to the rate
-- limiter no matter how many times it fires, and the founder-notification
-- path (Telegram/webhook, fired on every recordLead call, not just new leads)
-- can still be flooded.
--
-- Fix: carry ip_hash on lead_events too, so every submission attempt (new or
-- resubmit) leaves a countable row, then have the rate limiter count events
-- in the window instead of leads rows.

alter table public.lead_events add column if not exists ip_hash text;

-- Partial index: only 'created'/'resubmitted' rows are submission attempts,
-- and those are the only kind the rate limiter queries.
create index if not exists lead_events_ip_hash_idx
  on public.lead_events (ip_hash, created_at desc)
  where kind in ('created', 'resubmitted');

-- Redefine upsert_lead only to stamp ip_hash on the event rows it inserts.
-- Everything else is unchanged from 0008.
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
      notes             = right(
                            concat_ws(E'\n\n---\n\n', nullif(notes, ''), nullif(trim(p_notes), '')),
                            10000
                          ),
      score             = greatest(coalesce(score, 0), p_score),
      band              = case when p_score > coalesce(score, 0) then p_band else band end,
      clerk_user_id     = coalesce(clerk_user_id, p_clerk_user_id),
      ip_hash           = p_ip_hash
    where id = v_id;

    insert into public.lead_events (lead_id, kind, detail, ip_hash)
    values (v_id, 'resubmitted', concat('Re-enquiry from ', coalesce(p_source, 'unknown source')), p_ip_hash);
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

    insert into public.lead_events (lead_id, kind, detail, ip_hash)
    values (v_id, 'created', concat('Enquiry from ', coalesce(p_source, 'unknown source')), p_ip_hash);
  end if;

  return query select v_id, not v_existed;
end; $$;
