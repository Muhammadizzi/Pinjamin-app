import { createClient, SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY: uses SUPABASE_SERVICE_ROLE and bypasses RLS. Never import this
// module from a "use client" component - only from app/api/**/route.ts.
let client: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    client = null;
    return client;
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function isSupabaseAdminConfigured(): boolean {
  return !!getSupabaseAdmin();
}
