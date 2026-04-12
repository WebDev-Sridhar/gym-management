import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchMembers, createMember, assignPlan, deleteMember } from '../../services/membershipService'
import { fetchPlans } from '../../services/membershipService'

export default function MembersPage() {
  const { gymId } = useAuth()
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'expired' | 'inactive'

  // Add member form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Assign plan form
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    if (!gymId) return
    Promise.all([fetchMembers(gymId), fetchPlans(gymId)])
      .then(([m, p]) => { setMembers(m); setPlans(p) })
      .catch((err) => console.error('Failed to load:', err))
      .finally(() => setLoading(false))
  }, [gymId])

  async function handleAddMember(e) {
    e.preventDefault()
    setError('')
    if (!newName.trim()) return setError('Name is required')

    setSubmitting(true)
    try {
      const member = await createMember({
        gymId,
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
      })
      setMembers((prev) => [member, ...prev])
      setNewName('')
      setNewPhone('')
      setNewEmail('')
      setShowAddForm(false)
    } catch (err) {
      setError(err.message || 'Failed to add member')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignPlan(memberId) {
    if (!selectedPlanId) return
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (!plan) return

    setSubmitting(true)
    try {
      const updated = await assignPlan({
        memberId,
        planId: plan.id,
        durationDays: plan.duration_days,
      })
      setMembers((prev) => prev.map((m) => m.id === memberId ? updated : m))
      setAssigningId(null)
      setSelectedPlanId('')
    } catch (err) {
      alert(err.message || 'Failed to assign plan')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(memberId) {
    if (!confirm('Remove this member?')) return
    try {
      await deleteMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      alert(err.message || 'Failed to delete member')
    }
  }

  function getMemberStatus(member) {
    if (!member.plan_id) return 'inactive'
    if (!member.expiry_date) return member.status || 'inactive'
    const today = new Date().toISOString().split('T')[0]
    if (member.expiry_date < today) return 'expired'
    return 'active'
  }

  function daysLeft(expiryDate) {
    if (!expiryDate) return null
    const diff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const filteredMembers = members.filter((m) => {
    if (filter === 'all') return true
    return getMemberStatus(m) === filter
  })

  const counts = {
    all: members.length,
    active: members.filter((m) => getMemberStatus(m) === 'active').length,
    expired: members.filter((m) => getMemberStatus(m) === 'expired').length,
    inactive: members.filter((m) => getMemberStatus(m) === 'inactive').length,
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
          <h1 className="text-xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">{members.length} total member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError('') }}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          {showAddForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number"
                  maxLength={10}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['all', 'active', 'expired', 'inactive']).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
              filter === f
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Members table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {filter === 'all' ? 'No members yet' : `No ${filter} members`}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'all' ? 'Add your first member to get started.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Expiry</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMembers.map((member) => {
                  const status = getMemberStatus(member)
                  const remaining = daysLeft(member.expiry_date)

                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Member info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0">
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-400">{member.phone || member.email || 'No contact'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        {member.plan ? (
                          <span className="text-sm text-gray-700">{member.plan.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">No plan</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === 'active' ? 'bg-green-50 text-green-700' :
                          status === 'expired' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-5 py-4">
                        {member.expiry_date ? (
                          <div>
                            <p className="text-sm text-gray-700">
                              {new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {remaining !== null && remaining > 0 && remaining <= 7 && (
                              <p className="text-xs text-amber-600 font-medium">{remaining} day{remaining !== 1 ? 's' : ''} left</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Assign plan button */}
                          {assigningId === member.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 outline-none focus:border-violet-500"
                              >
                                <option value="">Select plan...</option>
                                {plans.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {'\u20B9'}{Number(p.price).toLocaleString('en-IN')}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignPlan(member.id)}
                                disabled={!selectedPlanId || submitting}
                                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
                              >
                                {submitting ? '...' : 'Assign'}
                              </button>
                              <button
                                onClick={() => { setAssigningId(null); setSelectedPlanId('') }}
                                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setAssigningId(member.id); setSelectedPlanId(member.plan_id || '') }}
                                className="text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer"
                              >
                                {member.plan_id ? 'Change Plan' : 'Assign Plan'}
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                className="text-xs text-red-400 hover:text-red-600 cursor-pointer ml-2"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
