import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUpWithEmail, sendMagicLink, signInWithGoogle } from '../../services/authService'
import OnboardingProgress from '../../components/ui/OnboardingProgress'

export default function SignupPage() {
  const [mode, setMode] = useState('password')         // 'password' | 'magic'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('info')             // 'info' | 'confirm-email' | 'magic-sent'
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  function validate() {
    if (!name.trim()) { setError('Please enter your name'); return false }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address'); return false
    }
    if (mode === 'password' && password.length < 6) {
      setError('Password must be at least 6 characters'); return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setSending(true)
    try {
      sessionStorage.setItem('onboarding_name', name.trim())
      if (mode === 'password') {
        await signUpWithEmail(email.trim(), password)
        setStep('confirm-email')
      } else {
        await sendMagicLink(email.trim())
        setStep('magic-sent')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  async function handleGoogle() {
    setError('')
    sessionStorage.setItem('onboarding_name', name.trim() || '')
    setSending(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-up failed')
      setSending(false)
    }
  }

  async function handleResend() {
    setError(''); setSending(true)
    try {
      if (mode === 'password') await signUpWithEmail(email.trim(), password)
      else                     await sendMagicLink(email.trim())
    } catch (err) {
      setError(err.message || 'Failed to resend')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>

        <OnboardingProgress currentStep={1} />

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start managing your gym in 2 minutes</h1>
          <p className="text-gray-500 text-sm mt-2">
            {step === 'info'         ? 'Create your free account to get started'
             : step === 'confirm-email' ? 'Verify your email to continue'
             : 'Check your inbox for the sign-in link'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* ── Step: Enter info ── */}
          {step === 'info' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={sending}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Or with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />
                </div>

                {mode === 'password' && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                )}

                {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending
                    ? 'Sending...'
                    : mode === 'password' ? 'Create Account' : 'Send Magic Link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError('') }}
                  className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  {mode === 'password' ? 'Use email magic link instead' : 'Use password instead'}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                  Already have an account?{' '}
                  <Link to="/login" className="text-violet-600 font-medium hover:text-violet-800 transition-colors">
                    Log in
                  </Link>
                </p>
              </form>
            </>
          )}

          {/* ── Step: Email confirmation sent ── */}
          {(step === 'confirm-email' || step === 'magic-sent') && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {step === 'magic-sent' ? 'Check your email' : 'Verify your email'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                We sent a {step === 'magic-sent' ? 'sign-in link' : 'confirmation link'} to
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-5">{email}</p>
              <p className="text-xs text-gray-400 mb-5">
                {step === 'magic-sent'
                  ? 'Click the link in your inbox to sign in.'
                  : 'Click the link in your inbox to verify your account, then come back to log in.'}
              </p>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {sending ? 'Resending...' : 'Resend email'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('info'); setError('') }}
                className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">Join 500+ gym owners already using Gymmobius</p>
          <p className="text-xs text-gray-400 mt-1">
            By signing up, you agree to our Terms &amp; Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
