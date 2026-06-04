import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { resendEmailVerification, isEmailNotConfirmedError } from '../../services/authService'
import { signInAndSeed } from '../../services/auth/signInAndSeed'
import { supabase, setAccessToken } from '../../services/supabaseClient'
import PasswordInput from '../../components/ui/PasswordInput'
import { useAuth } from '../../store/AuthContext'
import { linkInviteOrMember } from '../../services/auth/linkInviteOrMember'
import { roleHome } from '../../lib/onboarding'
import { isMainHost, MAIN_DOMAIN } from '../../lib/host'

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--gym-bg)',
  border: '1px solid var(--gym-border-strong)',
  borderRadius: '12px',
  color: 'var(--gym-text)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--gym-text-muted)',
  marginBottom: '6px',
}

const RESEND_COOLDOWN_SECONDS = 30

// Open-redirect guard. Only accept return URLs that are same-origin paths
// starting with a single "/" — block "//evil.com", "\\evil", full URLs, etc.
function safeReturnUrl(raw) {
  if (!raw) return null
  if (typeof raw !== 'string') return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (raw.includes('\\')) return null
  return raw
}

export default function GymLoginPage() {
  const { gym, basePath } = useGym()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnUrl(searchParams.get('return'))
  const { refreshProfile, initialized, isAuthenticated, profile, role } = useAuth()

  const [step, setStep]         = useState('email') // 'email' | 'password' | 'forgot' | 'verify-email'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  // Cooldown timer (seconds) for the "send reset link" button. Re-armed
  // each time a reset email is dispatched. Prevents accidental spam — both
  // for the initial send and for a reset link the user already clicked in
  // a new tab (the original tab stays on the success screen until refresh).
  const [resetCooldown, setResetCooldown] = useState(0)
  // Separate cooldown for the verify-email Resend button. Kept distinct
  // from resetCooldown so the two flows never share a stale timer.
  const [verifyCooldown, setVerifyCooldown] = useState(0)
  // Inline "we just sent a new link" confirmation under the Resend button.
  // Kept separate from the global `success` banner so it can render next
  // to its button on the verify-email step instead of at the top of the card.
  const [resendMsg, setResendMsg] = useState('')

  // Recursive 1-second timer — counts down to 0, then stops. setTimeout +
  // re-run on dep change is simpler than setInterval with cleanup tracking.
  useEffect(() => {
    if (resetCooldown <= 0) return
    const id = setTimeout(() => setResetCooldown(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resetCooldown])

  // Mirror tick effect for the verify-email Resend cooldown.
  useEffect(() => {
    if (verifyCooldown <= 0) return
    const id = setTimeout(() => setVerifyCooldown(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [verifyCooldown])

  // Already-authed auto-redirect. Owner equivalent of PublicRoute's "if
  // authed, navigate to roleHome" behavior — GymLoginPage isn't wrapped in
  // PublicRoute (it's nested inside gymChildRoutes), so without this a
  // member reopening /{slug}/login with a live session sees the email form
  // and thinks persistence is broken.
  //
  // Only fires when idle on the email step — guarded against preempting
  // an in-progress handleLogin / forgot-password / verify-email flow.
  //
  // Branches:
  //   - Right gym member/trainer → roleHome (honors ?return= for members)
  //   - Owner                    → cross-host redirect to main /owner-dashboard
  //   - Wrong gym, or no profile → render the form (user signs in fresh)
  useEffect(() => {
    if (!gym) return
    if (!initialized) return
    if (loading) return
    if (step !== 'email') return
    if (!isAuthenticated || !profile) return

    if (role === 'owner') {
      // Owners don't belong on a gym portal. Cross-host nav back to SaaS.
      if (isMainHost()) {
        navigate('/owner-dashboard', { replace: true })
      } else {
        window.location.href = `https://${MAIN_DOMAIN}/owner-dashboard`
      }
      return
    }

    if ((role === 'member' || role === 'trainer') && profile.gym_id === gym.id) {
      const target = (role === 'member' && returnTo) ? returnTo : roleHome(role)
      navigate(target, { replace: true })
      return
    }

    // Wrong gym (member of a different gym opening this gym's portal) or
    // some odd state — render the form so they can sign in with a different
    // account if they want. Cross-gym is detected on fresh sign-in by
    // linkInviteOrMember, which surfaces the proper "wrong gym" error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym, initialized, isAuthenticated, profile, role, step, loading])

  // Cross-tab password-reset detection.
  // When the user clicks the reset link in a *new* tab, Supabase updates the
  // password and fires USER_UPDATED via the shared localStorage session.
  // supabase-js broadcasts this to ALL open tabs through its storage listener,
  // so onAuthStateChange fires here too — even though the user didn't do
  // anything on this tab.
  // When we detect it we:
  //   1. Clear the "Reset link sent" success banner so the old CTA is gone.
  //   2. Flip back to the password step with a notice so the user knows their
  //      password was already changed and they can sign in with the new one.
  //   3. Immediately sign out the session Supabase just injected — this tab
  //      wasn't the one the user intended to be logged into, and silently
  //      keeping a session open here would be surprising.
  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event !== 'USER_UPDATED') return
        // Sign out the injected session — this tab shouldn't silently inherit it.
        await supabase.auth.signOut().catch(() => {})
        // Reset UI to the password step with an informational notice.
        setSuccess('')
        setError('')
        setResetCooldown(0)
        setStep('password')
        setSuccess('Your password was updated in another tab. You can now sign in with your new password.')
      }
    )
    return () => authSub.unsubscribe()
  }, [])

  if (!gym) return null
  // basePath honours the current host: /:gym.slug on main domain, '' on
  // subdomain/custom-domain. Empty-string + '/' resolves to '/' which is
  // the gym home on those hosts.
  const base = basePath || '/'
  // Preserve the return URL when offering the "Create account" link.
  const joinHref = returnTo ? `${basePath}/join?return=${encodeURIComponent(returnTo)}` : `${basePath}/join`

  function handleEmailContinue(e) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    setError('')
    setStep('password')
  }

  async function handleResendVerification() {
    if (!email.trim() || verifyCooldown > 0 || loading) return
    setLoading(true); setError(''); setResendMsg('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?gym=${encodeURIComponent(gym.slug)}`
      await resendEmailVerification(email.trim(), { emailRedirectTo: redirectTo })
      setResendMsg(`A new verification link has been sent to ${email}.`)
      setVerifyCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message || 'Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setResendMsg('')
    try {
      // signInAndSeed handles the "seed _accessToken before any data-client
      // query" race that used to be inlined here — see the helper's comment.
      const { user } = await signInAndSeed(email.trim(), password)

      // Shared link logic — same call as AuthCallbackPage uses, with the
      // expected gym pinned so cross-gym mismatches short-circuit cleanly.
      // GymLoginPage does NOT enable the phone-fallback path (password
      // login implies the user already has an email-based account).
      const result = await linkInviteOrMember(user, {
        expectedGymId: gym.id,
      })

      // Owner using a gym portal — they belong on the SaaS owner login.
      if (result.kind === 'owner_on_gym_portal') {
        await supabase.auth.signOut().catch(() => {})
        setAccessToken(null)
        setError(
          `This account is a gym owner. Owners sign in at the main Gymmobius login, not on a gym's member portal. ` +
          `Go to the main site to access your dashboard.`
        )
        return
      }

      // Cross-gym: sign out and surface a clear "wrong gym portal" message.
      if (result.kind === 'cross_gym_member' || result.kind === 'cross_gym_trainer') {
        await supabase.auth.signOut().catch(() => {})
        setAccessToken(null)
        const other = result.actualGym
        if (result.kind === 'cross_gym_member') {
          setError(
            `This email is registered as a member of ${other?.name || 'another gym'}, not ${gym.name}. ` +
            (other?.slug
              ? `Sign in at /${other.slug}/login instead, or join ${gym.name} from the pricing page.`
              : `Sign in at the correct gym's portal instead.`)
          )
        } else {
          setError(
            `Your trainer invite is for ${other?.name || 'a different gym'}, not ${gym.name}. ` +
            (other?.slug ? `Sign in at /${other.slug}/login instead.` : '')
          )
        }
        return
      }

      // No match, OR an existing-but-neutered profile (former member whose
      // role + gym_id were nulled by deleteMember). Don't silently route to
      // owner onboarding — sign them out and tell them what to do.
      const profile = result.profile
      if (result.kind === 'no_match' || !profile || !profile.role) {
        await supabase.auth.signOut().catch(() => {})
        setAccessToken(null)
        setError(`We couldn't find you on ${gym.name}'s member list. Pick a plan from the pricing page to join, or ask the gym to add you.`)
        return
      }

      // Sync AuthContext with the (possibly new) profile BEFORE we navigate.
      // Without this, ProtectedRoute on /member-app reads a stale null
      // profile and bounces to /create-gym. Page only renders after a manual
      // refresh. This explicit refresh closes the race.
      await refreshProfile()

      // Route based on confirmed role. Members honor ?return= so flows
      // like QR-code check-in can bounce the user back to where they were.
      const target = (profile.role === 'member' && returnTo)
        ? returnTo
        : roleHome(profile.role)
      navigate(target, { replace: true })
    } catch (err) {
      // "Email not confirmed" → don't dead-end the user on an inline error.
      // Auto-fire a fresh confirmation link (they already proved intent by
      // hitting Sign In — the old UI told them "we sent a link" without
      // actually sending one) and forward to a dedicated verify-email step
      // with the Resend button already on cooldown so a double-click can't
      // spam Supabase's email service.
      if (isEmailNotConfirmedError(err)) {
        try {
          const redirectTo = `${window.location.origin}/auth/callback?gym=${encodeURIComponent(gym.slug)}`
          await resendEmailVerification(email.trim(), { emailRedirectTo: redirectTo })
        } catch {
          // Swallow — the verify-email step's Resend button is the user's
          // fallback. Most failures here are Supabase rate-limits, which
          // the cooldown also handles. Better to land them on the right
          // screen than block on a resend that they can retry.
        }
        setVerifyCooldown(RESEND_COOLDOWN_SECONDS)
        setStep('verify-email')
      } else {
        setError(err.message === 'Invalid login credentials' ? 'Invalid email or password' : err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    // Cooldown gate — prevents accidental spam if the user double-clicks,
    // or clicks "send" again on the original tab after already using the
    // link in a new tab.
    if (resetCooldown > 0) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      // Tag the reset link with the gym slug so ResetPasswordPage can route
      // the user back to THIS gym's login after a successful reset, not the
      // SaaS owner login. Without the tag, members from a path-based gym URL
      // (gymmobius.com/iron-paradise/login) end up at /login (SaaS) after
      // reset — wrong audience, wrong branding.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password?gym=${encodeURIComponent(gym.slug)}`,
      })
      if (error) throw error
      setSuccess('Reset link sent — check your email.')
      setResetCooldown(30)   // arm the 30-second cooldown
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--gym-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Gym branding */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {gym.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'var(--gym-gradient)' }}>
              {gym.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="font-bold text-lg" style={{ color: 'var(--gym-text)' }}>{gym.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--gym-text-muted)' }}>Member &amp; Trainer Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 space-y-5"
          style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>

          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--gym-text)' }}>
              {step === 'forgot'
                ? 'Reset Password'
                : step === 'verify-email'
                  ? 'Verify Your Email'
                  : 'Sign In'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--gym-text-secondary)' }}>
              {step === 'forgot'
                ? 'Enter your email to receive a reset link.'
                : step === 'verify-email'
                  ? "We've sent a confirmation link to your inbox."
                  : 'Sign in to access your workouts and plans.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
              {success}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailContinue} className="space-y-4">
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>
              <button type="submit" className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                Continue
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>{email}</p>
                <button type="button" onClick={() => setStep('email')}
                  className="text-xs font-semibold cursor-pointer hover:opacity-80" style={{ color: 'var(--gym-text-secondary)' }}>
                  Change
                </button>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <PasswordInput
                  className=""
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  style={inputStyle}
                  iconColor="var(--gym-text-muted)"
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }}
                />
              </div>
              <div className="text-right">
                <button type="button" onClick={() => setStep('forgot')}
                  className="text-xs cursor-pointer hover:opacity-80" style={{ color: 'var(--gym-text-muted)' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {step === 'verify-email' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <svg className="w-7 h-7" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm" style={{ color: 'var(--gym-text-secondary)' }}>
                  We've sent a verification link to{' '}
                  <span className="font-semibold" style={{ color: 'var(--gym-text)' }}>{email}</span>.
                </p>
                <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
                  Click the link to activate your account, then sign in.
                  Check your spam folder if you don't see it.
                </p>
              </div>
              {resendMsg && (
                <p className="text-xs font-medium" style={{ color: '#4ade80' }}>{resendMsg}</p>
              )}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading || verifyCooldown > 0}
                  className="font-semibold text-sm cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: 'var(--gym-primary)' }}
                >
                  {loading
                    ? 'Sending…'
                    : verifyCooldown > 0
                      ? `Resend in ${verifyCooldown}s`
                      : 'Resend verification email'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm hover:opacity-80"
                  style={{ color: 'var(--gym-text-muted)' }}
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>
              <button type="submit" disabled={loading || resetCooldown > 0}
                className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                {loading
                  ? 'Sending...'
                  : resetCooldown > 0
                    ? `Resend in ${resetCooldown}s`
                    : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setStep('password')}
                className="w-full text-sm cursor-pointer hover:opacity-80" style={{ color: 'var(--gym-text-muted)' }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--gym-text-secondary)' }}>
          {"Don't have an account? "}
          <Link to={joinHref} className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--gym-text)' }}>
            Create one
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link to={base} className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: 'var(--gym-text-muted)' }}>
            ← Back to {gym.name}
          </Link>
        </p>
      </div>
    </div>
  )
}
