import { supabase } from './supabaseClient'

// ─── Email + Password ───

/**
 * Sign up with email + password.
 *
 * Supabase sends a confirmation email; user must click the link before signing in.
 *
 * `emailRedirectTo` lets callers add a context-bearing query string to the
 * post-verification URL — e.g. gym-side join flows pass `?gym=<slug>` so
 * AuthCallback can render a "not a member of {gym}" screen instead of
 * silently routing a stranger to the owner-onboarding wizard.
 */
export async function signUpWithEmail(email, password, options = {}) {
  const { emailRedirectTo, metadata } = options
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectTo || `${window.location.origin}/auth/callback`,
      // metadata lands in auth.users.user_metadata — read by AuthCallback to
      // support phone-based member auto-link when the email lookup misses.
      ...(metadata ? { data: metadata } : {}),
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign in with email + password (returning users only).
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Re-send the email verification link for a signup that hasn't been
 * confirmed yet. Surfaced via the "Resend verification email" button on
 * the gym login page when the user trips the "Email not confirmed" error.
 *
 * `emailRedirectTo` should mirror the original signup redirect so the post-
 * verification flow lands in the same context (gym slug, return URL).
 */
export async function resendEmailVerification(email, { emailRedirectTo } = {}) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  })
  if (error) throw error
}

/**
 * Heuristic to detect Supabase's "email not confirmed" errors across
 * versions/messages. Returns true so callers can branch into the
 * "Please verify your email" UX instead of just showing the raw error.
 */
export function isEmailNotConfirmedError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return msg.includes('email not confirmed')
      || msg.includes('email_not_confirmed')
      || msg.includes('confirm your email')
}

// ─── Google OAuth ───

/**
 * Start the Google OAuth flow. Browser is redirected to Google, then back to /auth/callback.
 * Requires the Google provider to be enabled in the Supabase dashboard.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
  return data
}

// ─── Email-state probe (signup UX disambiguation) ───

/**
 * Returns the auth-state of an email so the signup UI can pick the right
 * UX path: 'new', 'unconfirmed', or 'confirmed'. See the
 * 20260525_auth_email_state migration for the why and the privacy note.
 *
 * Failures fall back to 'new' — better to attempt signup and let Supabase
 * decide than to block the user on a probe failure. The signUp call itself
 * is anti-enumeration safe (won't leak whether an email exists).
 */
export async function getEmailState(email) {
  if (!email) return 'new'
  const { data, error } = await supabase.rpc('auth_email_state', { p_email: email })
  if (error) {
    console.warn('getEmailState failed, falling back to "new":', error.message)
    return 'new'
  }
  return data || 'new'
}

// ─── Shared ───

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}
