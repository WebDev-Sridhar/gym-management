import { useLocation } from 'react-router-dom'

const routeTitles = {
  '/owner-dashboard': 'Owner Dashboard',
  '/trainer-dashboard': 'Trainer Dashboard',
  '/member-app': 'Member App',
  '/checkin': 'Check-in',
}

export default function Topbar({ title }) {
  const location = useLocation()
  const pageTitle = title || routeTitles[location.pathname] || 'Dashboard'

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 w-64">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center cursor-pointer">
          <span className="text-white text-xs font-bold">U</span>
        </div>
      </div>
    </header>
  )
}
