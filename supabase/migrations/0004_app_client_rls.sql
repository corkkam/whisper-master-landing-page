-- App client access (Option A): let the macOS app read its OWN waitlist row
-- directly from Supabase as the signed-in Clerk user, scoped by RLS.
--
-- Prerequisite (Supabase dashboard, one-time): Authentication → Sign In /
-- Providers → Third-Party Auth → add **Clerk**, pointing at the Clerk instance
-- domain so Supabase trusts Clerk-issued JWTs (validates against Clerk's JWKS).
-- Clerk's Supabase integration mints a session token whose `role` claim is
-- "authenticated" and whose `sub` is the Clerk user id — which is exactly
-- `waitlist_entries.user_id`. The macOS `SupabaseAccess` client passes that
-- token as the access token on every request, so `auth.jwt() ->> 'sub'` below
-- resolves to the caller's Clerk id.
--
-- Server code is unaffected: the service-role key still bypasses RLS.
-- Idempotent. Apply to `public` (production) and, if beta/dev builds use it,
-- the `dev` schema mirror (see dev-schema.sql) — swap `public.` for `dev.`.

-- The `authenticated` role must be able to touch the table at all; RLS then
-- narrows it to the caller's own row.
grant usage on schema public to authenticated;
grant select on public.waitlist_entries to authenticated;

-- A signed-in user can read only their own waitlist row. This is what the app's
-- access gate reads (status == 'accepted' unlocks dictation; position/points
-- feed the Account panel).
drop policy if exists "own waitlist row: select" on public.waitlist_entries;
create policy "own waitlist row: select"
  on public.waitlist_entries
  for select
  to authenticated
  using ( user_id = auth.jwt() ->> 'sub' );

-- No insert/update/delete policies for `authenticated`: the app never writes
-- waitlist state (that stays server-side via the landing page's service-role
-- client), so writes remain denied by default.
