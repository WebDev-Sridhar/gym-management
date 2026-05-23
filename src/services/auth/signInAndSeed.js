// Wrapper for `signInWithEmail` that synchronously seeds the data-client
// access token from the returned session before resolving.
//
// Why this exists. The data client (supabaseData) reads `_accessToken` set
// by AuthContext.onAuthStateChange — which runs asynchronously after
// signInWithEmail resolves. Any code that calls a supabaseData query (e.g.
// fetchUserProfile) immediately after sign-in races that listener; if it
// wins, the query goes out under the anon-key fallback (Phase 0) and RLS
// rejects it. We hit this twice in production: once in LoginPage (Blocker
// #1) and once in AuthCallback's Google OAuth path. GymLoginPage already
// did the seed inline.
//
// Centralising the pattern guarantees any future login surface (SSO,
// tenant-host login, OTP, magic link) inherits the fix automatically.

import { signInWithEmail } from '../authService'
import { setAccessToken } from '../supabaseClient'

/**
 * Sign in with email + password AND seed the data-client token before
 * returning. Pass the result straight to fetchUserProfile / linkInviteOrMember
 * / any other supabaseData call without worrying about the AuthContext race.
 *
 * @returns {Promise<{ user, session }>} Same shape signInWithEmail returns.
 */
export async function signInAndSeed(email, password) {
  const { user, session } = await signInWithEmail(email, password)
  if (session?.access_token) {
    setAccessToken(session.access_token)
  }
  return { user, session }
}
