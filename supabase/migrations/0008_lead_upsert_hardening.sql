-- 0008_lead_upsert_hardening.sql
--
-- Hardens public.upsert_lead against two abuses of the deliberately
-- unauthenticated /for-teams funnel. The lead form keys on email only and has
-- no ownership proof (a managing partner will not create an account to ask a
-- question), so anyone who knows a prospect's email can resubmit against their
-- row. Two consequences are fixed here; the third needs a schema change and is
-- left as a follow-up (see NOTE at the bottom).
--
-- Redefining upsert_lead only. `create or replace function` keeps the existing
-- grants/revokes from 0006 intact, so no re-grant is needed. Idempotent.

-- (1) Lead-linkage hijack. The old body did
--       clerk_user_id = coalesce(p_clerk_user_id, clerk_user_id)
--     which REPLACES an existing Clerk linkage whenever a signed-in visitor
--     resubmits — even if their session email is not the lead's email. A signed-in
--     attacker could point a stranger's lead at their own account. Reversed to
--     coalesce(clerk_user_id, p_clerk_user_id): fill the linkage only while it is
--     still empty, never overwrite one already on the row.
--
-- (2) Unbounded row growth. Notes append on every resubmission with no ceiling,
--     so a resubmit loop against one email grows a single row without limit.
--     The append is kept (the second enquiry usually adds real context), but the
--     result is now clamped to the most recent 10000 characters.

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
      -- ("we now have budget"), and overwriting would destroy the first. Clamped
      -- to the last 10000 chars so a resubmit loop cannot grow the row unbounded.
      notes             = right(
                            concat_ws(E'\n\n---\n\n', nullif(notes, ''), nullif(trim(p_notes), '')),
                            10000
                          ),
      -- Re-score, but never downgrade a lead the founder has already worked up.
      score             = greatest(coalesce(score, 0), p_score),
      band              = case when p_score > coalesce(score, 0) then p_band else band end,
      -- Fill the Clerk linkage only while empty; never let a resubmission
      -- overwrite an existing one (that was a lead-hijack vector).
      clerk_user_id     = coalesce(clerk_user_id, p_clerk_user_id),
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

-- NOTE (follow-up, not fixed here): the IP rate cap in lib/leads/queries.ts
-- counts rows in `leads`, but a resubmission to a known email updates the
-- existing row instead of inserting one, so repeat submissions to one email are
-- never counted and the founder-notification path can still be flooded. The
-- proper fix counts submission *events*, which needs `ip_hash` carried on
-- `lead_events` (it is not today). Left for a dedicated migration + query change
-- so this one stays a pure, low-risk function redefinition.
