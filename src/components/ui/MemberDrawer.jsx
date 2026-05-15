import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../store/AuthContext'
import { fetchAssignedPlans, assignPlan, archiveAssignedPlan } from '../../services/programsService'
import { fetchWorkoutTemplates, fetchDietTemplates } from '../../services/programsService'
import { useDialog } from './Dialog'

function PlanTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
      type === 'workout' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
    }`}>
      {type === 'workout' ? 'Workout' : 'Diet'}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── AssignFromDrawer modal (inline, portal) ──────────────────────────────────
function AssignFromDrawer({ member, gymId, onClose, onAssigned }) {
  const [workoutTemplates, setWorkoutTemplates] = useState([])
  const [dietTemplates, setDietTemplates]       = useState([])
  const [planType, setPlanType]                 = useState('workout')
  const [selected, setSelected]                 = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [error, setError]                       = useState('')

  useEffect(() => {
    Promise.all([fetchWorkoutTemplates(gymId), fetchDietTemplates(gymId)])
      .then(([w, d]) => { setWorkoutTemplates(w); setDietTemplates(d) })
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false))
  }, [gymId])

  const templates = planType === 'workout' ? workoutTemplates : dietTemplates

  async function handleAssign() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      await assignPlan({ gymId, memberId: member.id, template: selected, planType })
      onAssigned()
    } catch (err) {
      setError(err.message || 'Failed to assign')
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Assign Plan — {member.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[['workout', 'Workouts'], ['diet', 'Diets']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setPlanType(val); setSelected(null) }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  planType === val ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
            {loading ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No {planType} templates yet. Create some in Programs.</p>
            ) : templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                  selected?.id === t.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50 border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">
                    {(planType === 'workout' ? t.exercises : t.meals)?.length ?? 0} {planType === 'workout' ? 'exercises' : 'meals'}
                    {planType === 'diet' && t.total_calories ? ` · ${t.total_calories} kcal` : ''}
                  </p>
                </div>
                {selected?.id === t.id && (
                  <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleAssign}
              disabled={!selected || saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Assigning...' : selected ? `Assign "${selected.title}"` : 'Select a template'}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── MemberDrawer ─────────────────────────────────────────────────────────────
export default function MemberDrawer({ member, onClose }) {
  const { gymId }  = useAuth()
  const dialog     = useDialog()

  const [activeTab, setActiveTab]         = useState('info')
  const [plans, setPlans]                 = useState([])
  const [plansLoading, setPlansLoading]   = useState(false)
  const [showAssign, setShowAssign]       = useState(false)
  const [visible, setVisible]             = useState(false)

  // Animate in
  useEffect(() => {
    if (member) { requestAnimationFrame(() => setVisible(true)) }
    else setVisible(false)
  }, [member])

  // Close on Escape
  useEffect(() => {
    if (!member) return
    const fn = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [member])

  const loadPlans = useCallback(async () => {
    if (!member) return
    setPlansLoading(true)
    try {
      const data = await fetchAssignedPlans(member.id)
      setPlans(data.filter(p => p.status === 'active'))
    } catch (err) {
      console.error('Failed to load plans:', err)
    } finally {
      setPlansLoading(false)
    }
  }, [member])

  useEffect(() => {
    if (activeTab === 'plans' && member) loadPlans()
  }, [activeTab, member, loadPlans])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  async function handleArchive(plan) {
    if (!await dialog.confirm(`Archive "${plan.title}"? The member will lose access to this plan.`, 'Archive Plan')) return
    await archiveAssignedPlan(plan.id)
    setPlans(prev => prev.filter(p => p.id !== plan.id))
  }

  if (!member) return null

  const status = member.status ?? (
    member.expiry_date && new Date(member.expiry_date) < new Date() ? 'expired' : 'active'
  )
  const statusCls = status === 'active' ? 'bg-green-50 text-green-700' : status === 'expired' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{member.name}</p>
              <p className="text-xs text-gray-400 truncate">{member.phone || member.email || ''}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {[['info', 'Info'], ['plans', 'Active Plans']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                activeTab === val ? 'text-indigo-700 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {label}
              {val === 'plans' && plans.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{plans.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' ? (
            <div className="px-5 py-5 space-y-4">
              {[
                ['Status', <span key="s" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>],
                ['Plan', member.plan?.name || '—'],
                ['Phone', member.phone || '—'],
                ['Email', member.email || '—'],
                ['Joined', formatDate(member.join_date)],
                ['Expires', formatDate(member.expiry_date)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500 shrink-0">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Programs</p>
                <button
                  onClick={() => setShowAssign(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Assign Plan
                </button>
              </div>

              {plansLoading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
              ) : plans.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-500">No active plans</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Assign Plan" to add one</p>
                </div>
              ) : (
                plans.map(plan => (
                  <div key={plan.id} className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{plan.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Assigned {formatDate(plan.assigned_at)}</p>
                      </div>
                      <PlanTypeBadge type={plan.plan_type} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {Array.isArray(plan.data) ? `${plan.data.length} ${plan.plan_type === 'workout' ? 'exercises' : 'meals'}` : ''}
                    </div>
                    <button
                      onClick={() => handleArchive(plan)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
                    >
                      Archive
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assign from drawer modal */}
      {showAssign && (
        <AssignFromDrawer
          member={member}
          gymId={gymId}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            setShowAssign(false)
            loadPlans()
          }}
        />
      )}
    </>,
    document.body
  )
}
