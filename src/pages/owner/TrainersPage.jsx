import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchTrainerInvites, createTrainerInvite, deleteTrainerInvite } from '../../services/membershipService'

export default function TrainersPage() {
  const { gymId } = useAuth()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

    fetchTrainerInvites(gymId)
      .then((data) => { if (!cancelled) setInvites(data) })
      .catch((err) => console.error('Failed to load trainers:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Trainer name is required')

    setSubmitting(true)
    try {
      const invite = await createTrainerInvite({ gymId, name: name.trim(), phone: phone.trim() })
      setInvites((prev) => [invite, ...prev])
      setName('')
      setPhone('')
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Failed to add trainer')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(inviteId) {
    if (!confirm('Remove this trainer invite?')) return
    try {
      await deleteTrainerInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (err) {
      alert(err.message || 'Failed to remove trainer')
    }
  }

  const statusCounts = {
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trainers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {invites.length} trainer{invites.length !== 1 ? 's' : ''} {'\u2014'} {statusCounts.accepted} active, {statusCounts.pending} pending
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError('') }}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          {showForm ? 'Cancel' : '+ Add Trainer'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add Trainer</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Trainer name"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number"
                  maxLength={10}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Trainer'}
            </button>
          </form>
        </div>
      )}

      {/* Trainers list */}
      {invites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No trainers yet</h3>
          <p className="text-sm text-gray-500">Add trainers to help manage your gym members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {invites.map((invite) => (
            <div key={invite.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0">
                  {invite.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{invite.name}</h3>
                  <p className="text-xs text-gray-400">{invite.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  invite.status === 'accepted' ? 'bg-green-50 text-green-700' :
                  invite.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                </span>
                <button
                  onClick={() => handleDelete(invite.id)}
                  className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
