import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { createGym, createUserProfile, updateGymOnboardingStep } from '../../services/userService'
import OnboardingProgress from '../../components/ui/OnboardingProgress'

export default function CreateGymPage() {
  const { user, isAuthenticated, isOnboarded, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [gymName, setGymName] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Not authenticated → back to signup
  if (!loading && !isAuthenticated) {
    return <Navigate to="/signup" replace />
  }

  // Already onboarded → skip ahead
  if (!loading && isOnboarded) {
    return <Navigate to="/billing" replace />
  }

  const slug = gymName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const handleSubmit = async (e) => {
    console.log(user)
    e.preventDefault()
    setError('')

    if (!gymName.trim()) {
      setError('Gym name is required')
      return
    }
    if (!city.trim()) {
      setError('City is required')
      return
    }

    setSubmitting(true)
    try {
      // Create gym
      const gymId = await createGym({
        gymName: gymName.trim(),
        city: city.trim(),
        ownerId: user.id,
      })

      // Create user profile as owner
      const savedName = sessionStorage.getItem('onboarding_name') || 'Gym Owner'
      await createUserProfile({
        authId: user.id,
        name: savedName,
        phone: user.phone || null,
        email: user.email || null,
        role: 'owner',
        gymId,
      })

      // Track onboarding step
      await updateGymOnboardingStep(gymId, 'gym_created')

      // Refresh auth context
      await refreshProfile()

      // Clean up
      sessionStorage.removeItem('onboarding_name')

      navigate('/onboarding', { replace: true })
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <OnboardingProgress currentStep={2} />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Your Gym</h1>
          <p className="text-gray-500 text-sm mt-2">
            Tell us about your gym so we can set things up
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            {/* Gym Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gym Name</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="e.g. Iron Paradise Fitness"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                autoFocus
              />
              {slug && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Your gym URL: <span className="text-violet-500 font-medium">gymos.app/{slug}</span>
                </p>
              )}
            </div>

            {/* City */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Gym & Continue'}
            </button>
          </form>
        </div>

        {/* Value prop */}
        <div className="mt-6 bg-violet-50 border border-violet-100 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-violet-900">You're almost there!</p>
              <p className="text-xs text-violet-600 mt-0.5">
                After this, a quick 30-second setup and you'll be ready to manage your gym.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
