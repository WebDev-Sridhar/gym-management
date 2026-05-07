import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { createPlan, addTrainerInvite, updateGymOnboardingStep } from '../../services/userService'
import OnboardingProgress from '../../components/ui/OnboardingProgress'

const PRESET_PLANS = [
  { name: 'Monthly', durationDays: 30, price: 1000 },
  { name: 'Quarterly', durationDays: 90, price: 2500 },
  { name: 'Half Yearly', durationDays: 180, price: 4500 },
  { name: 'Yearly', durationDays: 365, price: 8000 },
]

export default function OnboardingPage() {
  const { profile, isAuthenticated, loading, gymId } = useAuth()
  const navigate = useNavigate()

  const [setupStep, setSetupStep] = useState('plan') // 'plan' | 'trainer'
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [customPlan, setCustomPlan] = useState({ name: '', durationDays: '', price: '' })
  const [useCustom, setUseCustom] = useState(false)

  const [trainerName, setTrainerName] = useState('')
  const [trainerPhone, setTrainerPhone] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // No gym yet → must create gym first
  if (!loading && !gymId) {
    return <Navigate to="/create-gym" replace />
  }

  // Already subscribed with active onboarding → dashboard
  if (!loading && profile?.onboarding_step === 'subscribed') {
    return <Navigate to="/owner-dashboard" replace />
  }

  // Non-owner roles shouldn't be here
  if (!loading && profile?.role && profile.role !== 'owner') {
    const routes = { trainer: '/trainer-dashboard', member: '/member-app' }
    return <Navigate to={routes[profile.role] || '/'} replace />
  }

  const handleSavePlan = async () => {
    setError('')

    let planData
    if (useCustom) {
      if (!customPlan.name.trim()) return setError('Plan name is required')
      if (!customPlan.durationDays || customPlan.durationDays <= 0) return setError('Duration is required')
      if (!customPlan.price || customPlan.price <= 0) return setError('Price is required')
      planData = {
        gymId,
        name: customPlan.name.trim(),
        durationDays: parseInt(customPlan.durationDays),
        price: parseInt(customPlan.price),
      }
    } else {
      if (selectedPlan === null) return setError('Select a plan or create a custom one')
      const preset = PRESET_PLANS[selectedPlan]
      planData = {
        gymId,
        name: preset.name,
        durationDays: preset.durationDays,
        price: preset.price,
      }
    }

    setSubmitting(true)
    try {
      await createPlan(planData)
      setSetupStep('trainer')
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to create plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = async () => {
    setSubmitting(true)
    setError('')

    try {
      // Add trainer if provided
      if (trainerName.trim() && trainerPhone.trim()) {
        await addTrainerInvite({
          gymId,
          name: trainerName.trim(),
          phone: `+91${trainerPhone.replace(/\D/g, '')}`,
        })
      }

      await updateGymOnboardingStep(gymId, 'setup_done')
      navigate('/billing', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
        <OnboardingProgress currentStep={3} />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quick Setup</h1>
          <p className="text-gray-500 text-sm mt-2">
            {setupStep === 'plan'
              ? 'Add your first membership plan for members'
              : 'Add a trainer to your gym (optional)'
            }
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {setupStep === 'plan' ? (
            /* Step: Add Plan */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Membership Plan</h3>
                <button
                  type="button"
                  onClick={() => { setUseCustom(!useCustom); setSelectedPlan(null); setError('') }}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer"
                >
                  {useCustom ? 'Use presets' : 'Custom plan'}
                </button>
              </div>

              {!useCustom ? (
                /* Preset plans */
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {PRESET_PLANS.map((plan, i) => (
                    <button
                      key={plan.name}
                      type="button"
                      onClick={() => { setSelectedPlan(i); setError('') }}
                      className={`
                        p-3 rounded-xl border-2 text-left transition-all cursor-pointer
                        ${selectedPlan === i
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300'
                        }
                      `}
                    >
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.durationDays} days</p>
                      <p className="text-sm font-bold text-violet-600 mt-1">₹{plan.price.toLocaleString('en-IN')}</p>
                    </button>
                  ))}
                </div>
              ) : (
                /* Custom plan form */
                <div className="space-y-3 mb-5">
                  <input
                    type="text"
                    value={customPlan.name}
                    onChange={(e) => setCustomPlan({ ...customPlan, name: e.target.value })}
                    placeholder="Plan name (e.g. Premium Monthly)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={customPlan.durationDays}
                      onChange={(e) => setCustomPlan({ ...customPlan, durationDays: e.target.value })}
                      placeholder="Duration (days)"
                      min="1"
                      className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <input
                      type="number"
                      value={customPlan.price}
                      onChange={(e) => setCustomPlan({ ...customPlan, price: e.target.value })}
                      placeholder="Price (₹)"
                      min="1"
                      className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleSavePlan}
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Plan & Continue'}
              </button>
            </div>
          ) : (
            /* Step: Add Trainer */
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Add a Trainer</h3>
                  <p className="text-xs text-gray-500">Optional — you can always add more later</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <input
                  type="text"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder="Trainer's name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={trainerPhone}
                    onChange={(e) => setTrainerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Trainer's phone number"
                    maxLength={10}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Saving...'
                  : trainerName.trim()
                    ? 'Add Trainer & Continue'
                    : 'Skip & Continue'
                }
              </button>

              <button
                type="button"
                onClick={() => { setSetupStep('plan'); setError('') }}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Back to plans
              </button>
            </div>
          )}
        </div>

        {/* Substep indicator */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <div className={`w-2 h-2 rounded-full transition-colors ${setupStep === 'plan' ? 'bg-violet-500' : 'bg-gray-300'}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${setupStep === 'trainer' ? 'bg-violet-500' : 'bg-gray-300'}`} />
        </div>

      </div>
    </div>
    </div>
  )
}
