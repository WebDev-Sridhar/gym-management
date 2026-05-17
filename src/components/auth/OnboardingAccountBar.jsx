import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { LogOut, RefreshCw } from 'lucide-react'

/**
 * Top-right bar shown on onboarding pages (CreateGym, Billing) so a user
 * who isn't fully onboarded can still sign out and switch accounts.
 *
 * Without this, a user stuck mid-onboarding becomes trapped: any visit to
 * /login bounces them back here via PublicRoute → /create-gym | /billing.
 */
export default function OnboardingAccountBar() {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const email = profile?.email || user?.email || 'your account'

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex items-center justify-end gap-3 mb-6 text-xs">
      <span className="text-gray-400 hidden sm:inline">Signed in as</span>
      <span className="font-medium text-gray-700 truncate max-w-[200px]" title={email}>{email}</span>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
      >
        {signingOut
          ? <><RefreshCw size={11} className="animate-spin" /> Signing out…</>
          : <><LogOut size={11} /> Sign out</>
        }
      </button>
    </div>
  )
}
