// Member self-registration request form. Live at /:slug/register on the
// gym's public site. Submits identity (name, phone, email, optional notes)
// to the submit-member-registration edge fn, which queues the request for
// the owner to approve in the dashboard. No auth account or members row is
// created here — the existing createMember + invite chain runs after the
// owner clicks Approve, so this stays cap-isolated and abuse-resistant.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { submitMemberRegistration } from '../../services/memberRegistrationService'

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

export default function GymRegisterPage() {
  const { gym } = useGym()
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName  = name.trim()
    const trimmedPhone = phone.replace(/\D/g, '')
    const trimmedEmail = email.trim().toLowerCase()

    if (trimmedName.length < 2)      return setError('Please enter your full name.')
    if (trimmedPhone.length !== 10)  return setError('Please enter a valid 10-digit phone number.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError('Please enter a valid email address.')

    setLoading(true)
    try {
      await submitMemberRegistration({
        gymSlug: gym.slug,
        name:    trimmedName,
        phone:   trimmedPhone,
        email:   trimmedEmail,
        notes:   notes.trim() || null,
      })
      setDone(true)
    } catch (err) {
      // Friendly already-member error code from the edge fn — surface
      // verbatim so the member knows to contact the gym instead of retrying.
      setError(err.message || 'Submission failed. Please try again or contact the gym directly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--gym-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Gym branding header — mirrors GymJoinPage so members see a
            consistent visual identity across all gym-portal entry points. */}
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
            <p className="text-xs mt-0.5" style={{ color: 'var(--gym-text-muted)' }}>New member registration</p>
          </div>
        </div>

        {done ? (
          /* Success state. We deliberately don't reveal anything about the
             owner's queue state (e.g. "you're 3rd in line") — keeps the UX
             simple and the abuse surface small. */
          <div className="rounded-2xl p-8 text-center space-y-5"
            style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <svg className="w-7 h-7" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--gym-text)' }}>
                Registration submitted
              </h2>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>
                Thanks <span className="font-semibold" style={{ color: 'var(--gym-text)' }}>{name.trim()}</span> — {gym.name} will review your request and email{' '}
                <span className="font-semibold" style={{ color: 'var(--gym-text)' }}>{email}</span> once you're approved.
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
              You can close this page. The invite email will let you set a password and access your member dashboard.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl p-8 space-y-5"
            style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>
            <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>
              Fill in your details to request a member account. The gym will review and approve.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ravi Kumar" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>

              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile" maxLength={10} required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>

              {/* Optional notes — free text for "I'm on monthly plan, renewed
                  on the 5th" hints. Owner sees this in the approval queue. */}
              <div>
                <label style={labelStyle}>
                  Anything for the gym to know?{' '}
                  <span style={{ textTransform: 'none', opacity: 0.6, fontWeight: 500 }}>(optional)</span>
                </label>
                <textarea value={notes}
                  onChange={e => setNotes(e.target.value.slice(0, 500))}
                  placeholder="Your plan, renewal date, or anything else..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gym-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gym-border-strong)' }} />
              </div>

              {error && (
                <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ background: 'var(--gym-gradient)', borderRadius: 'var(--gym-card-radius)' }}>
                {loading ? 'Submitting...' : 'Request membership'}
              </button>
            </form>

            <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--gym-text-muted)' }}>
              Already a member?{' '}
              <Link to={`/${gym.slug}/login`} className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: 'var(--gym-text)' }}>
                Sign in
              </Link>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
