import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { performCheckin, fetchGymForCheckin } from '../../services/checkinService'

export default function CheckinPage() {
  const [searchParams] = useSearchParams()
  const gymId = searchParams.get('gymId')

  const { isAuthenticated, profile, loading: authLoading } = useAuth()

  const [gym, setGym] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error' | 'cooldown'
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  // Load gym info on mount
  useEffect(() => {
    if (!gymId) {
      setPageLoading(false)
      return
    }
    fetchGymForCheckin(gymId)
      .then((g) => setGym(g))
      .catch(() => setGym(null))
      .finally(() => setPageLoading(false))
  }, [gymId])

  const handleCheckin = async () => {
    setStatus('loading')
    setError('')
    setResult(null)

    try {
      const data = await performCheckin(gymId)

      if (data.success) {
        setStatus('success')
        setResult(data)
      } else if (data.error === 'cooldown') {
        setStatus('cooldown')
        setResult(data)
      } else {
        setStatus('error')
        setError(data.message)
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Something went wrong')
    }
  }

  // Show loading while auth + gym info loads
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // No gymId in URL
  if (!gymId) {
    return (
      <StatusScreen
        icon="warning"
        title="Invalid QR Code"
        message="This check-in link is missing a gym ID. Please scan the QR code at your gym."
      />
    )
  }

  // Gym not found
  if (!gym) {
    return (
      <StatusScreen
        icon="warning"
        title="Gym Not Found"
        message="This gym doesn't exist or the QR code is invalid."
      />
    )
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <StatusScreen
        icon="lock"
        title="Sign in Required"
        message={`Sign in to check in at ${gym.name}.`}
      >
        <Link
          to="/login"
          className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          Sign In
        </Link>
        <Link
          to="/signup"
          className="block text-center text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors mt-3"
        >
          Create an account
        </Link>
      </StatusScreen>
    )
  }

  // Logged in but not a member role
  if (profile?.role !== 'member') {
    return (
      <StatusScreen
        icon="warning"
        title="Members Only"
        message="Check-in is only available for gym members. You're logged in as an owner or trainer."
      />
    )
  }

  // Gym mismatch
  if (profile?.gym_id !== gymId) {
    return (
      <StatusScreen
        icon="warning"
        title="Wrong Gym"
        message={`You're a member of a different gym. This QR code is for ${gym.name}.`}
      />
    )
  }

  // Format time remaining for cooldown
  const formatTimeRemaining = () => {
    if (!result?.next_allowed) return ''
    const diff = new Date(result.next_allowed) - new Date()
    if (diff <= 0) return 'You can check in now!'
    const mins = Math.ceil(diff / 60000)
    return `Try again in ${mins} minute${mins !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">G</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{gym.name}</h1>
        <p className="text-gray-500 text-sm mb-8">
          Welcome, {profile?.name || 'Member'}
        </p>

        {/* Check-in Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* Idle state — ready to check in */}
          {status === 'idle' && (
            <>
              <div className="w-20 h-20 rounded-full bg-violet-50 border-2 border-violet-200 flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Ready to Check In</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tap the button below to record your attendance
              </p>
              <button
                onClick={handleCheckin}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm"
              >
                Check In Now
              </button>
            </>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div className="py-8">
              <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Checking you in...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">You're Checked In!</h2>
              <p className="text-sm text-gray-500 mb-1">
                {result?.checked_in_at && new Date(result.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-gray-400 mb-6">Have a great workout!</p>
              <button
                onClick={() => { setStatus('idle'); setResult(null) }}
                className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}

          {/* Cooldown */}
          {status === 'cooldown' && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Already Checked In</h2>
              <p className="text-sm text-gray-500 mb-1">
                You checked in at {result?.last_checkin && new Date(result.last_checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-amber-600 font-medium mb-6">
                {formatTimeRemaining()}
              </p>
              <button
                onClick={() => { setStatus('idle'); setResult(null) }}
                className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Check-in Failed</h2>
              <p className="text-sm text-red-500 mb-6">{error}</p>
              <button
                onClick={() => { setStatus('idle'); setError('') }}
                className="text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Gymmobius
        </p>
      </div>
    </div>
  )
}

/** Reusable full-screen status message */
function StatusScreen({ icon, title, message, children }) {
  const icons = {
    warning: (
      <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    lock: (
      <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">G</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            {icons[icon]}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500 mb-5">{message}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
