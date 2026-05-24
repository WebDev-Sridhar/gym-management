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
  const { gym } = useGym()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnUrl(searchParams.get('return'))
  const { refreshProfile } = useAuth()

  const [step, setStep]         = useState('email') // 'email' | 'password' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  // When set, the password screen surfaces a "Resend verification email"
  // button alongside the error message (Supabase rejected sign-in because
  // the user hasn't confirmed their email yet).
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  // Cooldown timer (seconds) for the "send reset link" button. Re-armed
  // each time a reset email is dispatched. Prevents accidental spam — both
  // for the initial send and for a reset link the user already clicked in
  // a new tab (the original tab stays on the success screen until refresh).
  const [resetCooldown, setResetCooldown] = useState(0)

  // Recursive 1-second timer — counts down to 0, then stops. setTimeout +
  // re-run on dep change is simpler than setInterval with cleanup tracking.
  useEffect(() => {
    if (resetCooldown <= 0) return
    const id = setTimeout(() => setResetCooldown(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resetCooldown])

  if (!gym) return null
  const base = `/${gym.slug}`
  // Preserve the return URL when offering the "Create account" link.
  const joinHref = returnTo ? `${base}/join?return=${encodeURIComponent(returnTo)}` : `${base}/join`

  function handleEmailContinue(e) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    setError('')
    setStep('password')
  }

  async function handleResendVerification() {
    if (!email.trim() || resendBusy) return
    setResendBusy(true); setError(''); setSuccess('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?gym=${encodeURIComponent(gym.slug)}`
      await resendEmailVerification(email.trim(), { emailRedirectTo: redirectTo })
      setSuccess(`Verification email re-sent to ${email}. Check your inbox (and spam folder).`)
      setNeedsVerification(false)
    } catch (err) {
      setError(err.message || 'Failed to resend verification email')
    } finally {
      setResendBusy(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNeedsVerification(false)
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
      // Recognise Supabase's "Email not confirmed" rejection and switch
      // the UI to the resend-verification affordance instead of a flat
      // error string the user can't act on.
      if (isEmailNotConfirmedError(err)) {
        setNeedsVerification(true)
        setError(`Please verify your email before signing in. We sent a confirmation link to ${email}.`)
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
      // (gymmobius.app/iron-paradise/login) end up at /login (SaaS) after
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
              {step === 'forgot' ? 'Reset Password' : 'Sign In'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--gym-text-secondary)' }}>
              {step === 'forgot'
                ? 'Enter your email to receive a reset link.'
                : 'Sign in to access your workouts and plans.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm space-y-2" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <div>{error}</div>
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendBusy}
                  className="w-full py-2 mt-1 text-xs font-semibold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.35)', color: '#fff' }}
                >
                  {resendBusy ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
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
