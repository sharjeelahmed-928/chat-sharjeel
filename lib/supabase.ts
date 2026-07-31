import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service_role key.
 *
 * This must NEVER be imported from a "use client" component or leaked to the
 * browser — it bypasses Row Level Security entirely. It is only ever used
 * from API routes, middleware, and server components.
 *
 * Both env vars are optional at build time so the existing (account-free)
 * app keeps working even if the admin panel hasn't been configured yet.
 * Callers must handle `null` gracefully.
 */
let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
