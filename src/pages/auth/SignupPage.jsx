import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../../services/authService'
import { supabase } from '../../services/supabaseClient'
import OnboardingProgress from '../../components/ui/OnboardingProgress'
import PasswordInput from '../../components/ui/PasswordInput'
import PasswordRequirements, { isPasswordValid, friendlyPasswordError } from '../../components/ui/PasswordRequirements'

export default function SignupPage() {
  const [step, setStep] = useState('info') // 'info' | 'confirm-email'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwFocused, setPwFocused] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordOK = isPasswordValid(password)

  useEffect(() => {
    setError('')
  }, [step])

  function validate() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address'); return false
    }
    if (!isPasswordValid(password)) {
      setError('Password must include lowercase, uppercase letters and a number (min 8 chars).')
      return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await signUpWithEmail(email.trim(), password)

      if (signUpError) {
        setError(friendlyPasswordError(signUpError.message))
        return
      }

      const identities = data?.user?.identities || []
      if (identities.length === 0) {
        setError('An account with this email already exists. Try logging in.')
        return
      }

      setStep('confirm-email')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-up failed')
      setLoading(false)
    }
  }

  async function handleResendEmail() {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      alert('A new verification link has been sent!')
    } catch (err) {
      setError(err.message || 'Could not resend email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">

      {/* ───────── LEFT (65%) ───────── */}
      <div className="hidden lg:flex w-[65%] relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-violet-950/40 to-violet-900/60" />
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
            <span className="text-xl font-bold tracking-tight">Gymmobius</span>
          </div>
          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">
              Build your gym's<br />future today.
            </h1>
            <p className="text-white/70 max-w-md text-xl leading-relaxed">
              Join 500+ gym owners who have automated their business and reclaimed their time.
            </p>
          </div>
          <div className="flex gap-8 text-white/60 text-sm font-medium">
            <p className="flex items-center gap-2"><span className="text-violet-400">✔</span> Free 14-day trial</p>
            <p className="flex items-center gap-2"><span className="text-violet-400">✔</span> No credit card</p>
            <p className="flex items-center gap-2"><span className="text-violet-400">✔</span> Setup in 2 mins</p>
          </div>
          <p className="text-white/30 text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} Gymmobius Core
          </p>
        </div>
      </div>

      {/* ───────── RIGHT (35%) ───────── */}
      <div className="w-full lg:w-[35%] flex flex-col items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">

          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 mb-8 transition-colors">
            ← Back
          </Link>

          <OnboardingProgress currentStep={1} />

          <div className="mb-8 mt-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {step === 'info' ? 'Create Account' : 'Verify Email'}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {step === 'info'
                ? 'Start managing your gym with precision.'
                : "We've sent a confirmation link to your inbox."}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'info' && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Connecting...' : 'Sign up with Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Or email</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gym.com"
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Use letters and a number"
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                  />
                  <PasswordRequirements
                    value={password}
                    visible={pwFocused || password.length > 0}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !passwordOK}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Creating Account...' : 'Get Started Free'}
                </button>
              </form>
            </div>
          )}

          {step === 'confirm-email' && (
            <div className="text-center space-y-6">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600 text-sm">
                  We've sent a link to <span className="font-bold text-gray-900">{email}</span>.
                </p>
                <p className="text-xs text-gray-400">
                  Check your spam folder if you don't see it.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResendEmail}
                  disabled={loading}
                  className="text-violet-600 font-bold hover:underline text-sm disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Resend verification email'}
                </button>
                <button
                  onClick={() => setStep('info')}
                  className="text-gray-500 text-sm hover:text-gray-800"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-10">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-bold hover:underline">
              Log in
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            {'This page is for gym owners only. Members & trainers — use '}
            <Link to="/login" className="text-violet-500 hover:underline">Login</Link>
            {'.'}
          </p>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-center text-[11px] text-gray-400 leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="/privacy" className="text-gray-600 font-medium underline underline-offset-2">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-gray-600 font-medium underline underline-offset-2">Terms of Service</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
