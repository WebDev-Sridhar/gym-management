import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUpWithEmail, sendPhoneOtp, verifyPhoneOtp } from '../../services/authService'
import { useAuth } from '../../store/AuthContext'
import OnboardingProgress from '../../components/ui/OnboardingProgress'

export default function SignupPage() {
  const [authMethod, setAuthMethod] = useState('email') // 'email' | 'phone'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('info') // 'info' | 'otp' | 'confirm-email'
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const fullPhone = `+91${phone}`

  const validateInfo = () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return false
    }
    if (authMethod === 'email') {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Enter a valid email address')
        return false
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return false
      }
    } else {
      if (phone.length < 10) {
        setError('Enter a valid 10-digit phone number')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateInfo()) return

    setSending(true)
    try {
      // Store name for the callback/onboarding flow
      sessionStorage.setItem('onboarding_name', name.trim())

      if (authMethod === 'email') {
        await signUpWithEmail(email.trim(), password)
        setStep('confirm-email')
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
      navigate('/create-gym', { replace: true })
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
    setStep('info')
  }

  const handleResendEmail = async () => {
    setError('')
    setSending(true)
    try {
      await signUpWithEmail(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Failed to resend email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <OnboardingProgress currentStep={1} />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start managing your gym in 2 minutes</h1>
          <p className="text-gray-500 text-sm mt-2">
            {step === 'info'
              ? 'Create your free account to get started'
              : step === 'otp'
                ? `We sent a 6-digit code to +91 ${phone}`
                : 'Verify your email to continue'
            }
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* ── Step: Enter info ── */}
          {step === 'info' && (
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

              {/* Name */}
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

              {/* Email input */}
              {authMethod === 'email' && (
                <>
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
                </>
              )}

              {/* Phone input */}
              {authMethod === 'phone' && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
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
                  ? 'Creating account...'
                  : authMethod === 'email'
                    ? 'Create Account'
                    : 'Send OTP'
                }
              </button>

              {/* Login link */}
              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-violet-600 font-medium hover:text-violet-800 transition-colors">
                  Log in
                </Link>
              </p>
            </form>
          )}

          {/* ── Step: Email confirmation sent ── */}
          {step === 'confirm-email' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Verify your email</h3>
              <p className="text-sm text-gray-500 mb-1">
                We sent a confirmation link to
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-5">{email}</p>
              <p className="text-xs text-gray-400 mb-5">
                Click the link in your email to verify your account. After that, you can log in with your email and password.
              </p>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleResendEmail}
                disabled={sending}
                className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {sending ? 'Resending...' : 'Resend verification email'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('info'); setError('') }}
                className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Use a different method
              </button>
            </div>
          )}

          {/* ── Step: Phone OTP verification ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <p className="text-xs text-gray-500 mb-4">
                Check your phone for a 6-digit code
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
                {sending ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('info'); setOtp(''); setError('') }}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Change number
              </button>
            </form>
          )}
        </div>

        {/* Trust signal */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Join 500+ gym owners already using GymOS
          </p>
          <p className="text-xs text-gray-400 mt-1">
            By signing up, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
