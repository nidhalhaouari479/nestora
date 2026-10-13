"use client";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  client ??= createClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
