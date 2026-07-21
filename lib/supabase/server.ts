import { createClient } from "@supabase/supabase-js";

/**
 * Which Postgres schema to read/write. Lets one Supabase instance serve
 * multiple environments without colliding:
 *   - Production → "public"
 *   - Preview    → "dev"
 *   - Local dev  → "public" (against the local `supabase start` stack)
 * Defaults to "public" when unset.
 */
const SCHEMA = process.env.SUPABASE_DB_SCHEMA ?? "public";

/**
 * Admin client using the service-role key — bypasses RLS.
 * Auth is now handled by Clerk; Supabase is used as a plain database.
 * Never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Cast: no generated DB types here, so `schema` is typed as "public".
      db: { schema: SCHEMA as "public" },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
