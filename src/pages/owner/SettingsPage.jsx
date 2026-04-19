import { useAuth } from '../../store/AuthContext'

export default function SettingsPage() {
  const { gymId, profile } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your account information</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{profile?.name || '\u2014'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{profile?.email || '\u2014'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Phone</span>
            <span className="text-sm font-medium text-gray-900">{profile?.phone || '\u2014'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-medium text-gray-900 capitalize">{profile?.role || '\u2014'}</span>
          </div>
        </div>
      </div>

      {/* Gym ID (for support) */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-400">
          Gym ID: <span className="font-mono text-gray-500">{gymId}</span>
        </p>
      </div>
    </div>
  )
}
