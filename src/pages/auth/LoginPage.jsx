import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle } from '../../services/authService'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../services/supabaseClient'
import PasswordInput from '../../components/ui/PasswordInput'

export default function LoginPage() {
  // --- States ---
  const [step, setStep] = useState('email') // 'email' | 'password' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const timerRef = useRef(null)

  // --- Helpers ---
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  function startCooldown() {
    setCooldown(30)
    if (timerRef.current) clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Cleanup timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // --- Handlers ---
  const handleEmailContinue = (e) => {
    e.preventDefault()
    if (!email.trim()) return setError('Enter your email')
    if (!validateEmail(email)) return setError('Enter a valid email address')
    setError('')
    setStep('password')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signInWithEmail(email.trim(), password)
      await refreshProfile()
      navigate('/owner-dashboard', { replace: true })
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Invalid email or password" : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      // Browser redirects, so loading state stays true until page unloads
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (cooldown > 0) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      
      setSuccess('Check your email for the reset link')
      startCooldown()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  setError('')
  setSuccess('')
}, [step])

  return (
    <div className="min-h-screen flex font-sans selection:bg-violet-100">
      
      {/* ───────── LEFT (HERO) ───────── */}
      <div className="hidden lg:flex w-[65%] relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-violet-950/40 to-violet-900/60" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
            <span className="text-xl font-bold tracking-tight">Gymmobius</span>
          </div>

          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">
              Run your gym.<br />Like a pro.
            </h1>
            <p className="text-white/70 max-w-md text-xl leading-relaxed">
              The all-in-one platform to manage members, track payments, and grow your fitness empire.
            </p>
          </div>

          <div className="flex gap-8 text-white/60 text-sm font-medium">
            <p className="flex items-center gap-2">
              <span className="text-violet-400">✔</span> Member CRM
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-400">✔</span> Automated Billing
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-400">✔</span> Performance Analytics
            </p>
          </div>

          <p className="text-white/30 text-xs uppercase tracking-widest">
                  © {new Date().getFullYear()} Gymmobius. All rights reserved.


          </p>
        </div>
      </div>

      {/* ───────── RIGHT (AUTH) ───────── */}
      <div className="w-full lg:w-[35%] flex flex-col items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">
          
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 mb-8 transition-colors">
            ← Back
          </Link>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              {step === 'forgot' ? 'Reset Password' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 mt-2">
              {step === 'forgot' 
                ? 'Enter your email to receive a secure link.' 
                : 'Sign in to manage your gym dashboard.'}
            </p>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* ── GOOGLE (Only on Email Step) ── */}
          {step === 'email' && (
            <>
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
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 my-8">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Or email</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

          {/* ── FORMS ── */}
          <div className="space-y-4">
            {step === 'email' && (
              <form onSubmit={handleEmailContinue}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                />
                <button 
                  type="submit"
                  className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Continue
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleLogin}>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-xs font-medium text-gray-400">{email}</p>
                  <button type="button" onClick={() => setStep('email')} className="text-xs text-violet-600 font-semibold hover:underline">
                    Change
                  </button>
                </div>
                <PasswordInput
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <div className="mt-2 text-right">
                  <button type="button" onClick={() => setStep('forgot')} className="text-xs text-gray-500 hover:text-gray-800">
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {step === 'forgot' && (
              <form onSubmit={handleForgotPassword}>
                <input
                  type="email"
                  placeholder="name@gym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full mt-4 py-3 bg-violet-600 text-white rounded-xl font-bold disabled:bg-gray-400 transition-colors"
                >
                  {cooldown > 0 ? `Retry in ${cooldown}s` : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="w-full mt-4 text-sm text-gray-500 hover:text-gray-800"
                >
                  Back to login
                </button>
              </form>
            )}
          </div>

          {/* Footer UI */}
          <p className="text-center text-sm text-gray-500 mt-10">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-violet-600 font-bold hover:underline">
              Join for free
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            {'Members & trainers — sign in with the email your gym registered for you.'}
          </p>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-center text-[11px] text-gray-400 leading-relaxed">
              By continuing, you agree to our{' '}
              <a href="/privacy" className="text-gray-600 font-medium underline underline-offset-2">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-gray-600 font-medium underline underline-offset-2">Terms of Service</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}