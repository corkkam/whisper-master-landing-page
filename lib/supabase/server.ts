import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service-role key — bypasses RLS.
 * Auth is now handled by Clerk; Supabase is used as a plain database.
 * Never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
