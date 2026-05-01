import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmail, sendMagicLink, signInWithGoogle } from '../../services/authService'
import { useAuth } from '../../store/AuthContext'

export default function LoginPage() {
  const [mode, setMode] = useState('password')         // 'password' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address')
    }
    if (mode === 'password' && !password) return setError('Enter your password')

    setSending(true)
    try {
      if (mode === 'password') {
        await signInWithEmail(email.trim(), password)
        await refreshProfile()
        navigate('/owner-dashboard', { replace: true })
      } else {
        await sendMagicLink(email.trim())
        setSuccess('Check your inbox — we sent you a sign-in link.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setSending(true)
    try {
      await signInWithGoogle()
      // browser is redirected — no further state changes here
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back to landing */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to manage your gym</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* ── Google ── */}
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Or with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email + password / magic link ── */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            {mode === 'password' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>
            )}

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            {success && <p className="text-emerald-600 text-xs mb-3">{success}</p>}

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? mode === 'password' ? 'Signing in...' : 'Sending link...'
                : mode === 'password' ? 'Sign In' : 'Send Magic Link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); setSuccess('') }}
              className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              {mode === 'password' ? 'Use email magic link instead' : 'Use password instead'}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-violet-600 font-medium hover:text-violet-800 transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  )
}
