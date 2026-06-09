import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase admin client using the service role key.
 * Lazily initialized to avoid build-time errors when env vars are not yet set.
 * This client bypasses RLS and should only be used in server-side code
 * (API routes, server components, etc.).
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing Supabase environment variables. " +
          "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
      );
    }

    _supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  return _supabase;
}
