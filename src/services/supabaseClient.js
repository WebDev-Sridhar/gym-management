import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// ── Authenticated client (dashboard, auth flows) ──
// Singleton to prevent duplicate clients on Vite HMR.
const AUTH_KEY = '__supabase_auth__'
export const supabase = globalThis[AUTH_KEY] ||
  (globalThis[AUTH_KEY] = createClient(supabaseUrl, supabaseAnonKey))

// ── Public client (gym public pages, check-in) ──
// No auth, no session, no token refresh, no Navigator Lock contention.
// Every REST query on the auth client calls getSession() which acquires
// a Web Lock. When the browser tab regains focus, the visibility handler
// holds that same lock for token refresh — blocking all queries until it
// finishes. This anon client bypasses that entirely.
const ANON_KEY = '__supabase_anon__'
export const supabaseAnon = globalThis[ANON_KEY] ||
  (globalThis[ANON_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }))
