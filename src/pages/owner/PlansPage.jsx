import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchPlans, createPlan, updatePlan, deletePlan, fetchMembers } from '../../services/membershipService'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500'

function PlanForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [durationDays, setDurationDays] = useState(initial?.duration_days != null ? String(initial.duration_days) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Plan name is required')
    if (!price || Number(price) <= 0) return setError('Enter a valid price')
    if (!durationDays || Number(durationDays) <= 0) return setError('Enter duration in days')

    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), price: Number(price), durationDays: Number(durationDays) })
    } catch (err) {
      setError(err.message || 'Failed to save plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monthly Basic"
            className={inputCls}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 1500"
            min="1"
            className={inputCls}
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
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? 'Saving...' : (initial ? 'Save Changes' : 'Create Plan')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function PlansPage() {
  const dialog = useDialog()
  const { gymId } = useAuth()
  const [plans, setPlans] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false
    Promise.all([fetchPlans(gymId), fetchMembers(gymId)])
      .then(([p, m]) => { if (cancelled) return; setPlans(p); setMembers(m) })
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  async function handleCreate({ name, price, durationDays }) {
    const newPlan = await createPlan({ gymId, name, price, durationDays })
    setPlans((prev) => [...prev, newPlan])
    setShowCreate(false)
  }

  async function handleUpdate({ name, price, durationDays }) {
    const updated = await updatePlan(editingPlan.id, { name, price, durationDays })
    setPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setEditingPlan(null)
  }

  async function handleDelete(plan) {
    const assignedCount = members.filter((m) => m.plan_id === plan.id).length
    const warning = assignedCount > 0
      ? `${assignedCount} member${assignedCount !== 1 ? 's are' : ' is'} currently on "${plan.name}". Deleting will unassign them. Continue?`
      : `Delete plan "${plan.name}"?`
    if (!await dialog.confirm(warning)) return
    try {
      await deletePlan(plan.id)
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } catch (err) {
      dialog.alert(err.message || 'Failed to delete plan')
    }
  }

  function formatDuration(days) {
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    const months = Math.round(days / 30)
    return months === 1 ? '1 month' : months === 12 ? '1 year' : `${months} months`
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
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          + New Plan
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <FormModal title="New Plan" onClose={() => setShowCreate(false)}>
          <PlanForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </FormModal>
      )}

      {/* Edit modal */}
      {editingPlan && (
        <FormModal title="Edit Plan" onClose={() => setEditingPlan(null)}>
          <PlanForm initial={editingPlan} onSave={handleUpdate} onCancel={() => setEditingPlan(null)} />
        </FormModal>
      )}

      {/* Plans grid */}
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
          {plans.map((plan) => {
            const memberCount = members.filter((m) => m.plan_id === plan.id).length
            return (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 leading-tight">{plan.name}</h3>
                  {memberCount > 0 && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{formatDuration(plan.duration_days)}</p>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  ₹{Number(plan.price).toLocaleString('en-IN')}
                </p>
                <div className="mt-auto pt-4 flex items-center gap-4">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
