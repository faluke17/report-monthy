import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Strip BOM (U+FEFF) that PowerShell/Vercel CLI sometimes prepends to env values
const clean = (s: string) => s.replace(/﻿/g, '').trim()

// Server-side only -- uses service role key to bypass RLS.
// Auth is handled at the app layer via PWA session cookie.
export async function createClient() {
  return createSupabaseClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY!),
    { auth: { persistSession: false } }
  )
}