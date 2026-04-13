import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// ── Token cache for data client ──
let _accessToken = null

/**
 * Called by AuthContext whenever the session changes.
 * The data client reads this on every request.
 */
export function setAccessToken(token) {
  _accessToken = token
}

// ── Auth client (login, logout, getSession only) ──
// Singleton to prevent duplicate clients on Vite HMR.
const AUTH_KEY = '__supabase_auth__'
export const supabase = globalThis[AUTH_KEY] ||
  (globalThis[AUTH_KEY] = createClient(supabaseUrl, supabaseAnonKey))

// ── Data client (all .from() queries and .functions.invoke()) ──
// Uses the `accessToken` option so it NEVER calls getSession() internally,
// which means NO Navigator Lock contention. This is why dashboard pages
// were hanging — every .from().select() was blocked waiting for the lock.
const DATA_KEY = '__supabase_data__'
export const supabaseData = globalThis[DATA_KEY] ||
  (globalThis[DATA_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => _accessToken || '',
  }))

// ── Public client (gym public pages, check-in) ──
// No auth, no session, no token refresh, no Navigator Lock contention.
const ANON_KEY = '__supabase_anon__'
export const supabaseAnon = globalThis[ANON_KEY] ||
  (globalThis[ANON_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }))
