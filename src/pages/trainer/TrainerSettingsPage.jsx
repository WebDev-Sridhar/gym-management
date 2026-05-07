import { useAuth } from '../../store/AuthContext'

export default function TrainerSettingsPage() {
  const { profile, gymId } = useAuth()

  const fields = [
    ['Name', profile?.name || '—'],
    ['Phone', profile?.phone || '—'],
    ['Email', profile?.email || '—'],
    ['Role', 'Trainer'],
    ['Gym ID', gymId || '—'],
  ]

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your trainer profile. Contact your gym owner to update details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xl">
            {profile?.name?.charAt(0).toUpperCase() || 'T'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile?.name || 'Trainer'}</p>
            <p className="text-sm text-gray-400 capitalize">{profile?.role || 'trainer'}</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        To update your profile, contact your gym owner.
      </p>
    </div>
  )
}
