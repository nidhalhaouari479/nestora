import { createClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";

// Service-role client, server only (Route Handlers). Used to resolve a phone number
// to its account without exposing emails to the browser.
export function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!env.supabaseUrl || !serviceRoleKey) return null;
  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Stateless anon client for sign-in / sign-up performed on the server.
export function getSupabaseAnonServerClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
