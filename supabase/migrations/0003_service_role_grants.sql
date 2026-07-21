-- Make service-role access to `public` explicit.
--
-- The app reaches Supabase only as `service_role` (see lib/supabase/server.ts).
-- On hosted Supabase, `public` tables are auto-granted to service_role via
-- default privileges — but the local stack (`supabase start`) and any NON-public
-- schema (see dev-schema.sql) do NOT get that automatically, so the service-role
-- client hits `42501 permission denied`. Granting explicitly keeps local === cloud.
--
-- RLS stays enabled with no policies: anon/authenticated remain denied by
-- default; service_role has BYPASSRLS + these grants. Idempotent.

grant usage on schema public to service_role;
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Cover objects created by later migrations too.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
