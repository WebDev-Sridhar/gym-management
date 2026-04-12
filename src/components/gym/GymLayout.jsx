import { Outlet } from 'react-router-dom'
import { GymProvider, useGym } from '../../store/GymContext'
import GymNavbar from './GymNavbar'

export default function GymLayout() {
  return (
    <GymProvider>
      <GymLayoutInner />
    </GymProvider>
  )
}

function GymLayoutInner() {
  const { gym, loading, error } = useGym()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gym Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            The gym you're looking for doesn't exist or may have been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors text-sm"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  const themeColor = gym.theme_color || '#8B5CF6'

  return (
    <div
      className="min-h-screen bg-white"
      style={{ '--gym-color': themeColor }}
    >
      <GymNavbar />
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {gym.name}. All rights reserved.
          </p>
          <p className="text-xs text-gray-300">
            Powered by GymOS
          </p>
        </div>
      </footer>
    </div>
  )
}
