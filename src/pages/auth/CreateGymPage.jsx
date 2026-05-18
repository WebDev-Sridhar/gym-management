import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { createGym, createUserProfile, updateGymOnboardingStep } from '../../services/userService'
import { checkSlugAvailable } from '../../services/membershipService'
import { buildNameSlug, buildNameCitySlug } from '../../lib/slug'
import { useDebounce } from '../../hooks/useDebounce'
import OnboardingProgress from '../../components/ui/OnboardingProgress'
import { LogOut, Check, Loader2 } from 'lucide-react'

export default function CreateGymPage() {
  const { user, profile, isAuthenticated, loading, refreshProfile, logout } = useAuth()
  const navigate = useNavigate()

  const accountEmail = profile?.email || user?.email || ''
  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [gymName, setGymName] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Profile exists → redirect to the correct onboarding step
  if (!loading && profile) {
    const step = profile.onboarding_step
    if (step === 'subscribed') return <Navigate to="/owner-dashboard" replace />
    if (step === 'setup_done' || step === 'gym_created') return <Navigate to="/billing" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Live URL preview ────────────────────────────────────────────────
  // First-attempt slug = name only. If taken, createGym escalates to
  // name+city, then to a random-suffix variant. The preview reflects
  // exactly what we'll attempt first; if taken, we show the fallback.
  const nameSlug   = buildNameSlug(gymName)
  const cityFallback = buildNameCitySlug(gymName, city)
  const debouncedNameSlug = useDebounce(nameSlug, 350)

  const [slugStatus, setSlugStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken'

  useEffect(() => {
    if (!debouncedNameSlug || debouncedNameSlug === 'gym') {
      setSlugStatus('idle')
      return
    }
    let cancelled = false
    setSlugStatus('checking')
    checkSlugAvailable(debouncedNameSlug)
      .then(ok => { if (!cancelled) setSlugStatus(ok ? 'available' : 'taken') })
      .catch(() => { if (!cancelled) setSlugStatus('idle') })
    return () => { cancelled = true }
  }, [debouncedNameSlug])

  // What the user will actually get if the name-only slug is taken
  const fallbackSlug = cityFallback || (nameSlug !== 'gym' ? `${nameSlug}-XXXX` : null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!ownerName.trim()) { setError('Please enter your name'); return }
    if (!gymName.trim()) { setError('Please enter your gym name'); return }
    if (!city.trim()) { setError('Please enter your city'); return }

    setSubmitting(true)
    try {
      const gymId = await createGym({
        gymName: gymName.trim(),
        city: city.trim(),
        ownerId: user.id,
      })

      await createUserProfile({
        authId: user.id,
        name: ownerName.trim(),
        phone: phone.trim() ? `+91${phone.trim()}` : (user.phone || null),
        email: user.email || null,
        role: 'owner',
        gymId,
      })

      await updateGymOnboardingStep(gymId, 'setup_done')
      await refreshProfile()
      navigate('/billing', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans bg-white">

      {/* ───────── LEFT (65%) ───────── */}
      <div className="hidden lg:flex w-[65%] relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-indigo-950/40 to-violet-900/60" />
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
            <span className="text-xl font-bold tracking-tight">Gymmobius</span>
          </div>
          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">
              Your gym,<br />your rules.
            </h1>
            <p className="text-white/70 max-w-md text-xl leading-relaxed">
              Let's set the foundation. This information helps us customize your dashboard and public booking page.
            </p>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl max-w-sm">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-sm text-white/80 italic">"Setting up my gym took less than 2 minutes. The automation is a game changer."</p>
          </div>
          <p className="text-white/30 text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} Gymmobius
          </p>
        </div>
      </div>

      {/* ───────── RIGHT (35%) ───────── */}
      <div className="w-full lg:w-[35%] flex flex-col items-center justify-center px-8 sm:px-12 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">

          <div className="flex items-center justify-between mb-8">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition-colors">
              ← Back
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                title={accountEmail ? `Signed in as ${accountEmail}` : 'Sign out'}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <LogOut size={12} /> Sign out
              </button>
            )}
          </div>

          <OnboardingProgress currentStep={2} />

          <div className="mb-8 mt-6">
            <h2 className="text-3xl font-bold text-gray-900">Create Your Gym</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Tell us about you and your gym.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="John Doe"
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Phone Number <span className="text-gray-300 font-normal normal-case">optional</span>
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 shrink-0">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gym Name</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="e.g. Iron Paradise Fitness"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
              {nameSlug && nameSlug !== 'gym' && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] flex-wrap">
                  {slugStatus === 'checking' && (
                    <Loader2 size={11} className="text-gray-400 animate-spin" />
                  )}
                  {slugStatus === 'available' && (
                    <Check size={11} className="text-emerald-600" strokeWidth={3} />
                  )}
                  {slugStatus === 'taken' && (
                    <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                  {slugStatus !== 'taken' && (
                    <span className="text-gray-400">
                      Your URL: <span className={`font-semibold tracking-tight ${slugStatus === 'available' ? 'text-emerald-600' : 'text-violet-600'}`}>
                        gymmobius.app/{nameSlug}
                      </span>
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="text-amber-700">
                      <span className="line-through text-gray-400 font-mono mr-1">gymmobius.app/{nameSlug}</span>
                      is taken — you'll get{' '}
                      <span className="text-violet-600 font-semibold tracking-tight">
                        gymmobius.app/{fallbackSlug || `${nameSlug}-XXXX`}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : 'Create Gym & Continue'}
            </button>
          </form>

          <div className="mt-10 p-4 rounded-2xl bg-violet-50/50 border border-violet-100 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <p className="text-xs font-bold text-violet-900 uppercase tracking-tight">Almost there!</p>
              <p className="text-[11px] text-violet-600 leading-relaxed mt-0.5">
                After this, a quick 30-second setup and you'll be ready to manage your members.
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-12">
            © {new Date().getFullYear()} Gymmobius
          </p>
        </div>
      </div>
    </div>
  )
}
