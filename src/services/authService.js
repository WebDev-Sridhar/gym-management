import { supabase } from './supabaseClient'

// ─── Email + Password ───

/**
 * Sign up with email + password.
 * Supabase sends a confirmation email with a magic link.
 * User must click the link to verify their email before they can log in.
 */
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign in with email + password (returning users only).
 * Only works after the user has verified their email.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// ─── Phone OTP ───

/**
 * Send OTP to phone number.
 * Phone must include country code (e.g. +919876543210)
 */
export async function sendPhoneOtp(phone) {
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

/**
 * Verify phone OTP code.
 */
export async function verifyPhoneOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  if (error) throw error
  return data
}

// ─── Shared ───

// Backward-compatible aliases
export const sendOtp = sendPhoneOtp
export const verifyOtp = verifyPhoneOtp

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get the current session.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}
