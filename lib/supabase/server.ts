import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side only — uses service role key to bypass RLS.
// Auth is handled at the app layer via PWA session cookie (proxy.ts).
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
