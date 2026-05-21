import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { signUpWithEmail, resendEmailVerification } from '../../services/authService'
import PasswordInput from '../../components/ui/PasswordInput'
import { isPasswordValid, PASSWORD_MIN_LENGTH } from '../../components/ui/PasswordRequirements'

const RESEND_COOLDOWN_SECONDS = 60

// Mirror GymLoginPage's open-redirect guard.
function safeReturnUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//') || raw.startsWith('/\\') || raw.includes('\\')) return null
  return raw
}

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

export default function GymJoinPage() {
  const { gym } = useGym()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnUrl(searchParams.get('return'))

  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  // Resend cooldown — starts at RESEND_COOLDOWN_SECONDS the moment the
  // confirmation email is sent, ticks down to 0, then the button becomes
  // active. Prevents owners from spamming Supabase's email service.
  const [resendIn, setResendIn] = useState(0)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendError, setResendError] = useState('')

  // Tick the cooldown each second once the post-signup "done" screen is
  // shown. Stops at 0 (or when leaving the screen).
  useEffect(() => {
    if (!done || resendIn <= 0) return
    const id = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [done, resendIn])

  if (!gym) return null
  const base = `/${gym.slug}`
  // Forward the return URL through to the post-signup login link so the
  // QR-code check-in flow comes full circle.
  const loginHref = returnTo
    ? `${base}/login?return=${encodeURIComponent(returnTo)}`
    : `${base}/login`

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    if (!isPasswordValid(password)) {
      return setError(`Password must include lowercase, uppercase letters and a number (min ${PASSWORD_MIN_LENGTH} chars).`)
    }
    if (password !== confirm) return setError('Passwords do not match')

    setLoading(true)
    try {
      // Tag the email confirmation redirect with this gym's slug so the
      // post-verification AuthCallback can render a gym-aware "not a member"
      // screen if the signup doesn't match any existing member/trainer row.
      // Without the tag, strangers would be silently routed to /create-gym
      // and prompted to start their own gym (wrong audience).
      const redirectTo = `${window.location.origin}/auth/callback?gym=${encodeURIComponent(gym.slug)}`
        + (returnTo ? `&return=${encodeURIComponent(returnTo)}` : '')

      const { error: signUpError } = await signUpWithEmail(
        email.trim(), password,
        {
          emailRedirectTo: redirectTo,
          // Phone gets stashed in user_metadata so AuthCallback can use it
          // as a fallback for member auto-link when the email match misses.
          metadata: phone.trim() ? { phone: phone.trim() } : undefined,
        },
      )

      if (signUpError) { setError(signUpError.message); return }

      setDone(true)
      setResendIn(RESEND_COOLDOWN_SECONDS)   // arm the resend cooldown
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || resendBusy || !email.trim()) return
    setResendBusy(true); setResendMsg(''); setResendError('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?gym=${encodeURIComponent(gym.slug)}`
        + (returnTo ? `&return=${encodeURIComponent(returnTo)}` : '')
      await resendEmailVerification(email.trim(), { emailRedirectTo: redirectTo })
      setResendMsg('Verification email re-sent. Check your inbox (and spam folder).')
      setResendIn(RESEND_COOLDOWN_SECONDS)   // re-arm the cooldown
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email.')
    } finally {
      setResendBusy(false)
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

        {done ? (
          /* ── Verification sent ── */
          <div className="rounded-2xl p-8 text-center space-y-5"
            style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <svg className="w-7 h-7" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--gym-text)' }}>Check your email</h2>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>
                {"If "}
                <span className="font-semibold" style={{ color: 'var(--gym-text)' }}>{email}</span>
                {" is new, a verification link is on its way. Click it to activate your account."}
              </p>
            </div>
            {/* Resend with cooldown — replaces the old "Sign in instead"
                affordance, which was misleading (it let unverified users
                attempt sign-in even though Supabase rightly blocks them). */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || resendBusy}
              className="block w-full py-2.5 text-sm font-semibold text-center rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--gym-gradient)', color: '#fff' }}
            >
              {resendBusy
                ? 'Sending…'
                : resendIn > 0
                  ? `Resend link in ${resendIn}s`
                  : 'Resend verification email'}
            </button>

            {resendMsg && (
              <p className="text-xs" style={{ color: '#4ade80' }}>{resendMsg}</p>
            )}
            {resendError && (
              <p className="text-xs" style={{ color: '#f87171' }}>{resendError}</p>
            )}

            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
              Didn't get it? Check your spam folder. Once you click the link,
              you'll be redirected to your account.
            </p>

            {/* Help for users who actually do already have an account — kept
                small + secondary so it doesn't tempt fresh signups to skip
                verification. */}
            <p className="text-xs pt-2 border-t" style={{ color: 'var(--gym-text-muted)', borderColor: 'var(--gym-border)' }}>
              Already verified earlier? <Link to={loginHref} className="font-semibold hover:opacity-80" style={{ color: 'var(--gym-text)' }}>Sign in</Link>
            </p>
          </div>
        ) : (
          /* ── Sign up form ── */
          <div className="rounded-2xl p-8 space-y-5"
            style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>

            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--gym-text)' }}>Create Account</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--gym-text-secondary)' }}>
                Use the email your gym registered for you.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>
              {/* Optional phone — used as a fallback link to your member row
                  when the gym added you by phone only (no email). */}
              <div>
                <label style={labelStyle}>
                  Phone <span style={{ textTransform: 'none', opacity: 0.6, fontWeight: 500 }}>(optional)</span>
                </label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="10-digit mobile" maxLength={15} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <PasswordInput
                  className=""
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={inputStyle}
                  iconColor="var(--gym-text-muted)"
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <PasswordInput
                  className=""
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••••"
                  style={inputStyle}
                  iconColor="var(--gym-text-muted)"
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 text-white font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--gym-text-muted)' }}>
              Your email must be registered by your gym owner. If you get an error, contact your gym manager.
            </p>
          </div>
        )}

        <p className="text-center text-sm mt-6" style={{ color: 'var(--gym-text-secondary)' }}>
          {'Already have an account? '}
          <Link to={loginHref} className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--gym-text)' }}>
            Sign in
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
