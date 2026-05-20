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

// ─── Magic Link (passwordless email) ───

/**
 * Send a magic link to an email address. User clicks the link and lands on /auth/callback.
 */
export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
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

// ─── Account email management ───

/**
 * Add (or change) the email on the current user's account.
 * Used by EmailRequiredGuard for legacy phone-only owners.
 * Triggers a confirmation email — user must click the link to finalize.
 */
export async function addEmailToAccount(email) {
  const { data, error } = await supabase.auth.updateUser({ email })
  if (error) throw error
  return data
}

// ─── Phone OTP (DEPRECATED) ───
// SMS OTP is removed from the UI. These functions remain only so any
// in-flight references don't crash before the next release ships.
// Do NOT use in new code.

/** @deprecated Phone OTP is removed. Use signInWithGoogle or sendMagicLink instead. */
export async function sendPhoneOtp(phone) {
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

/** @deprecated Phone OTP is removed. */
export async function verifyPhoneOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
  return data
}

/** @deprecated alias for sendPhoneOtp. */
export const sendOtp = sendPhoneOtp
/** @deprecated alias for verifyPhoneOtp. */
export const verifyOtp = verifyPhoneOtp

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
