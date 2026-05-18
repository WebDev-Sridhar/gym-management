import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { signInWithEmail } from '../../services/authService'
import { supabase, setAccessToken } from '../../services/supabaseClient'
import PasswordInput from '../../components/ui/PasswordInput'
import {
  fetchUserProfile,
  createUserProfile,
  findMemberByEmail,
  findTrainerInviteByEmail,
  claimTrainerInvite,
  createTrainerRecord,
} from '../../services/userService'

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

export default function GymLoginPage() {
  const { gym } = useGym()
  const navigate = useNavigate()

  const [step, setStep]         = useState('email') // 'email' | 'password' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  if (!gym) return null
  const base = `/${gym.slug}`

  function handleEmailContinue(e) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    setError('')
    setStep('password')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { user, session } = await signInWithEmail(email.trim(), password)

      // Seed the data-client token NOW — AuthContext processes SIGNED_IN
      // asynchronously, so _accessToken is still null at this point. Without
      // this, supabaseData sends requests with no token and RLS blocks them,
      // causing fetchUserProfile to return null even for existing users.
      setAccessToken(session.access_token)

      // ── 1. Check for an existing users-table profile ──────────────────────
      let profile = await fetchUserProfile(user.id)

      if (!profile) {
        // ── 2. No profile yet — try member auto-detection ──────────────────
        const memberRow = await findMemberByEmail(email.trim())
        if (memberRow) {
          profile = await createUserProfile({
            authId: user.id,
            name: memberRow.name,
            phone: memberRow.phone || '',
            email: email.trim(),
            role: 'member',
            gymId: memberRow.gym_id,
          })
        } else {
          // ── 3. Try trainer-invite detection ──────────────────────────────
          const invite = await findTrainerInviteByEmail(email.trim())
          if (invite) {
            profile = await createUserProfile({
              authId: user.id,
              name: invite.name,
              phone: invite.phone || '',
              email: email.trim(),
              role: 'trainer',
              gymId: invite.gym_id,
            })
            await Promise.all([
              claimTrainerInvite(invite.id),
              createTrainerRecord({ authId: user.id, gymId: invite.gym_id }),
            ])
          }
        }
      }

      // ── 4. Route based on confirmed role ─────────────────────────────────
      const roleRoutes = {
        owner:   '/owner-dashboard',
        trainer: '/trainer-dashboard',
        member:  '/member-app',
      }
      navigate(roleRoutes[profile?.role] || '/create-gym', { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Invalid email or password' : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess('Reset link sent — check your email.')
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

          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
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
          <Link to={`${base}/join`} className="font-semibold hover:opacity-80 transition-opacity"
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
