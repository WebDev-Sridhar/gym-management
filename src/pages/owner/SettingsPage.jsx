import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'

export default function SettingsPage() {
  const { gymId, profile } = useAuth()
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Form fields
  const [gymName, setGymName] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [themeColor, setThemeColor] = useState('#8B5CF6')

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

    fetchGymDetails(gymId)
      .then((data) => {
        if (cancelled) return
        setGym(data)
        setGymName(data.name || '')
        setCity(data.city || '')
        setDescription(data.description || '')
        setThemeColor(data.theme_color || '#8B5CF6')
      })
      .catch((err) => console.error('Failed to load gym settings:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    try {
      const updated = await updateGymDetails({
        gymId,
        name: gymName.trim(),
        city: city.trim(),
        description: description.trim(),
        theme_color: themeColor,
      })
      setGym(updated)
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your gym profile and preferences</p>
      </div>

      {/* Gym Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Gym Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gym Name</label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A short description of your gym..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Theme Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <span className="text-sm text-gray-500">{themeColor}</span>
            </div>
          </div>

          {success && <p className="text-green-600 text-sm font-medium">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account Info (read-only) */}
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
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-medium text-gray-900 capitalize">{profile?.role || '\u2014'}</span>
          </div>
          {gym?.slug && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Public Page</span>
              <a
                href={`/${gym.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
              >
                /{gym.slug}
              </a>
            </div>
          )}
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
