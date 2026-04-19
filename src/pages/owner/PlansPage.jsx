import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchPlans, createPlan, deletePlan, fetchMembers } from '../../services/membershipService'

export default function PlansPage() {
  const { gymId } = useAuth()
  const [plans, setPlans] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [durationDays, setDurationDays] = useState('')

  useEffect(() => {
    if (!gymId) {
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    Promise.all([fetchPlans(gymId), fetchMembers(gymId)])
      .then(([p, m]) => {
        if (cancelled) return
        setPlans(p)
        setMembers(m)
      })
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [gymId])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Plan name is required')
    if (!price || Number(price) <= 0) return setError('Enter a valid price')
    if (!durationDays || Number(durationDays) <= 0) return setError('Enter duration in days')

    setSubmitting(true)
    try {
      const newPlan = await createPlan({
        gymId,
        name: name.trim(),
        price: Number(price),
        durationDays: Number(durationDays),
      })
      setPlans((prev) => [...prev, newPlan])
      setName('')
      setPrice('')
      setDurationDays('')
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Failed to create plan')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(plan) {
    const assignedCount = members.filter((m) => m.plan_id === plan.id).length
    const warning = assignedCount > 0
      ? `${assignedCount} member${assignedCount !== 1 ? 's are' : ' is'} currently on "${plan.name}". Deleting will unassign them and set their status to inactive. Continue?`
      : `Delete plan "${plan.name}"?`

    if (!confirm(warning)) return

    try {
      await deletePlan(plan.id)
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } catch (err) {
      alert(err.message || 'Failed to delete plan')
    }
  }

  function formatDuration(days) {
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    const months = Math.round(days / 30)
    return months === 1 ? '1 month' : `${months} months`
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
          <h1 className="text-xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-sm text-gray-500 mt-1">{plans.length} plan{plans.length !== 1 ? 's' : ''} created</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create New Plan</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Basic"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ({'\u20B9'})</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  min="1"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="e.g. 30"
                  min="1"
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
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
          </form>
        </div>
      )}

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No plans yet</h3>
          <p className="text-sm text-gray-500">Create your first membership plan to start adding members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{formatDuration(plan.duration_days)}</p>
              <p className="text-2xl font-bold text-gray-900 mt-3">
                {'\u20B9'}{Number(plan.price).toLocaleString('en-IN')}
              </p>
              <div className="mt-auto pt-4">
                <button
                  onClick={() => handleDelete(plan)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Delete plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
