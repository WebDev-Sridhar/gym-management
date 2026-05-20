import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { signUpWithEmail } from '../../services/authService'
import PasswordInput from '../../components/ui/PasswordInput'
import { isPasswordValid, PASSWORD_MIN_LENGTH } from '../../components/ui/PasswordRequirements'

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
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

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
        email.trim(), password, { emailRedirectTo: redirectTo },
      )

      if (signUpError) { setError(signUpError.message); return }

      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
            <Link
              to={loginHref}
              className="block w-full py-2.5 text-sm font-semibold text-center rounded-xl transition-opacity hover:opacity-80"
              style={{ background: 'var(--gym-gradient)', color: '#fff' }}
            >
              Sign in instead
            </Link>
            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
              Already have an account? Use the button above.
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
              <div>
                <label style={labelStyle}>Password</label>
                <PasswordInput
                  className=""
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
                  placeholder="••••••••"
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
