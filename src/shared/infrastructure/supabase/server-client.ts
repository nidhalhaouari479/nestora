import { createClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";

// Anonymous client for public catalogue reads from Server Components.
// Student sessions live in the browser, so RLS only exposes published data here.
export function getSupabaseServerClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
