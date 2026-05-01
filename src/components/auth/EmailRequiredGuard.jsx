import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { addEmailToAccount } from '../../services/authService'

/**
 * Blocks the dashboard until legacy phone-only owners add an email.
 * Triggers when: a session exists, but auth.user has no email AND has a phone
 * (= signed up via the deprecated phone OTP flow).
 *
 * On submit: calls supabase.auth.updateUser({ email }) which sends a
 * confirmation link. After the user clicks the link, supabase.user.email is
 * populated on the next session refresh and this guard automatically dismisses.
 */
export default function EmailRequiredGuard({ children }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState('')

  // Show guard only when phone-only legacy user (has phone, no email)
  const needsEmail = !!user && !user.email && !!user.phone

  if (!needsEmail) return children

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    setSubmitting(true)
    try {
      await addEmailToAccount(email.trim())
      setSentTo(email.trim())
    } catch (err) {
      setError(err.message || 'Failed to send confirmation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-9 8.25a3 3 0 016 0v.75H7.5v-.75zM21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
        </div>

        {sentTo ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
            <p className="text-sm text-gray-500 mb-1">We sent a confirmation link to</p>
            <p className="text-sm font-semibold text-gray-900 mb-5">{sentTo}</p>
            <p className="text-xs text-gray-400 mb-5">
              Click the link in your email to finish linking your account. You can close this window — once confirmed, refresh the page.
            </p>
            <button
              type="button"
              onClick={() => { setSentTo(null); setEmail('') }}
              className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Add an email to continue</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Phone-only login is being phased out. Add an email to your account so you can keep signing in securely.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />

              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-5 py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending link...' : 'Send confirmation link'}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                Your phone number stays as your contact info — only the way you log in changes.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
