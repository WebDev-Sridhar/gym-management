import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import PasswordInput from '../../components/ui/PasswordInput'
import PasswordRequirements, { isPasswordValid, friendlyPasswordError } from '../../components/ui/PasswordRequirements'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwFocused, setPwFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasSession, setHasSession] = useState(true) // Track if the link is valid
  const navigate = useNavigate()

  const passwordOK = isPasswordValid(password)
  const confirmOK  = confirm.length > 0 && confirm === password

  // 1. Check if the user actually has a valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setHasSession(false)
        setError('Your password reset link is invalid or has expired.')
      }
    }
    checkSession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isPasswordValid(password)) {
      return setError('Password must include lowercase, uppercase letters and a number (min 8 chars).')
    }
    if (password !== confirm) {
      return setError('Passwords do not match')
    }

    setLoading(true)

    try {
      // 2. Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess('Password updated successfully! Redirecting to login...')

      // 3. Optional: Sign out to force a fresh login with the new password
      await supabase.auth.signOut()

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)

    } catch (err) {
      setError(friendlyPasswordError(err.message) || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
      
      {/* ───────── LEFT (HERO) ───────── */}
      <div className="hidden lg:flex w-[65%] relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-violet-950/40 to-violet-900/60" />
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-10" alt="Logo" />
            <span className="text-xl font-bold tracking-tight">Gymmobius</span>
          </div>
          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">Reset your access.</h1>
            <p className="text-white/70 max-w-md text-xl leading-relaxed">
              Secure your account with a new password and continue managing your gym operations seamlessly.
            </p>
          </div>
          <div className="flex gap-8 text-white/60 text-sm">
            <p>✔ Secure account</p>
            <p>✔ Fast recovery</p>
            <p>✔ Pro encryption</p>
          </div>
          <p className="text-white/30 text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} Gymmobius. All rights reserved.
          </p>
        </div>
      </div>

      {/* ───────── RIGHT (FORM) ───────── */}
      <div className="w-full lg:w-[35%] flex flex-col items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">
          
          <div className="text-center mb-10">
            <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">New Password</h1>
            <p className="text-gray-500 mt-2">Set a password that is easy to remember but hard to guess.</p>
          </div>

          {/* Feedback UI */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded-r-lg">
              {success}
            </div>
          )}

          {hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  required
                />
                <PasswordRequirements
                  value={password}
                  visible={pwFocused || password.length > 0}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {confirm.length > 0 && !confirmOK && (
                  <p className="text-[11px] text-red-500 mt-1.5">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || success || !passwordOK || !confirmOK}
                className="w-full mt-4 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Updating...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <div className="text-center mt-6">
               <Link to="/login" className="text-violet-600 font-bold hover:underline">
                 Request a new reset link
               </Link>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
             <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
               Back to login
             </Link>
          </div>

        </div>
      </div>
    </div>
  )
}