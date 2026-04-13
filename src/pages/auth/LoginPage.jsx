import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmail, sendPhoneOtp, verifyPhoneOtp } from '../../services/authService'
import { useAuth } from '../../store/AuthContext'

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState('email') // 'email' | 'phone'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('credential') // 'credential' | 'otp'
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const fullPhone = `+91${phone}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (authMethod === 'email') {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Enter a valid email address')
        return
      }
      if (!password) {
        setError('Enter your password')
        return
      }
    } else {
      if (phone.length < 10) {
        setError('Enter a valid 10-digit phone number')
        return
      }
    }

    setSending(true)
    try {
      if (authMethod === 'email') {
        // Direct email + password login
        await signInWithEmail(email.trim(), password)
        await refreshProfile()
        navigate('/owner-dashboard', { replace: true })
      } else {
        await sendPhoneOtp(fullPhone)
        setStep('otp')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')

    if (otp.length < 6) {
      setError('Enter the 6-digit OTP')
      return
    }

    setSending(true)
    try {
      await verifyPhoneOtp(fullPhone, otp)
      await refreshProfile()
      navigate('/owner-dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setSending(false)
    }
  }

  const switchMethod = (method) => {
    setAuthMethod(method)
    setOtp('')
    setError('')
    setStep('credential')
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

          {/* ── Step: Enter credential ── */}
          {step === 'credential' && (
            <form onSubmit={handleSubmit}>
              {/* Auth method toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
                <button
                  type="button"
                  onClick={() => switchMethod('email')}
                  className={`
                    flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer
                    ${authMethod === 'email'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod('phone')}
                  className={`
                    flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer
                    ${authMethod === 'phone'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  Phone
                </button>
              </div>

              {/* Email + Password input */}
              {authMethod === 'email' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Phone input */}
              {authMethod === 'phone' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter your phone number"
                      maxLength={10}
                      autoFocus
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending
                  ? authMethod === 'email' ? 'Signing in...' : 'Sending...'
                  : authMethod === 'email'
                    ? 'Sign In'
                    : 'Send OTP'
                }
              </button>

              {/* Signup link */}
              <p className="text-center text-sm text-gray-500 mt-4">
                Don't have an account?{' '}
                <Link to="/signup" className="text-violet-600 font-medium hover:text-violet-800 transition-colors">
                  Sign up
                </Link>
              </p>
            </form>
          )}

          {/* ── Step: Phone OTP verification ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <p className="text-xs text-gray-500 mb-4">
                We sent a 6-digit code to +91 {phone}
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors mb-4 tracking-widest text-center text-lg"
              />

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('credential'); setOtp(''); setError('') }}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  )
}
