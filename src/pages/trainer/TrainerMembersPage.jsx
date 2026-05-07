import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import {
  fetchAssignedMembers, fetchMemberAttendance, fetchMemberAssignedPlans,
  fetchGymWorkoutTemplates, fetchGymDietTemplates,
  assignPlanToMember, archiveMemberPlan,
} from '../../services/trainerService'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'

// ─── Plan customise + assign modal ───────────────────────────────────────────
function AssignPlanModal({ member, gymId, onClose, onAssigned }) {
  const [tab, setTab]               = useState('workout')
  const [templates, setTemplates]   = useState([])
  const [selected, setSelected]     = useState(null)
  const [rows, setRows]             = useState([])
  const [title, setTitle]           = useState('')
  const [step, setStep]             = useState('pick')  // 'pick' | 'edit'
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')

  useEffect(() => {
    const fn = tab === 'workout' ? fetchGymWorkoutTemplates : fetchGymDietTemplates
    fn(gymId).then(setTemplates).catch(() => setError('Failed to load templates'))
  }, [tab, gymId])

  function pickTemplate(t) {
    setSelected(t)
    setTitle(t.title)
    setRows(tab === 'workout' ? (t.exercises || []).map(e => ({ ...e })) : (t.meals || []).map(m => ({ ...m })))
    setStep('edit')
    setError('')
  }

  function pickFromDb(item) {
    const nameKey = tab === 'workout' ? 'name' : 'meal_name'
    if (!rows.find(r => r[nameKey] === item[nameKey])) {
      setRows(r => [...r, { ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }])
    }
    setSearch('')
  }

  const db      = tab === 'workout' ? EXERCISES : MEALS
  const nameKey = tab === 'workout' ? 'name' : 'meal_name'
  const dbResults = search.trim()
    ? db.filter(x => x[nameKey].toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : []

  const updateRow = (i, patch) => setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i))
  const inputCls  = 'px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-violet-500 w-full'

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    if (rows.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')
    try {
      await assignPlanToMember({ gymId, memberId: member.id, planType: tab, title: title.trim(), data: rows })
      onAssigned()
    } catch (err) {
      setError(err.message || 'Failed to assign plan')
      setSaving(false)
    }
  }

  return (
    <FormModal title={`Assign Plan — ${member.name}`} onClose={onClose} wide>
      {/* Type tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        {[['workout', 'Workout'], ['diet', 'Diet']].map(([v, l]) => (
          <button key={v} onClick={() => { setTab(v); setStep('pick'); setSelected(null); setRows([]) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === v ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>

      {step === 'pick' ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">Select a template to start from:</p>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No {tab} templates in this gym yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {templates.map(t => (
                <button key={t.id} onClick={() => pickTemplate(t)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-violet-50 border border-transparent hover:border-violet-200 rounded-xl text-left transition-all cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tab === 'workout' ? `${t.exercises?.length ?? 0} exercises` : `${t.meals?.length ?? 0} meals`}
                    </p>
                  </div>
                  <span className="text-xs text-violet-600 font-medium shrink-0">Customise →</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setSelected(null); setTitle(''); setRows([]); setStep('edit') }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            + Start from scratch
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={tab === 'workout' ? 'e.g. Push Day' : 'e.g. High Protein Diet'}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 transition-all" />
          </div>

          {/* DB search */}
          <div className="space-y-1">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab === 'workout' ? 'exercises' : 'meals'} to add...`}
              className="w-full px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs outline-none focus:border-violet-400 transition-all" />
            {dbResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {dbResults.map((item, i) => (
                  <button key={i} onClick={() => pickFromDb(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-50 transition-colors cursor-pointer text-left border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{item[nameKey]}</p>
                      <p className="text-[10px] text-gray-400">
                        {tab === 'workout' ? `${item.sets} sets · ${item.reps}` : `${item.calories} kcal · ${item.protein}g`}
                      </p>
                    </div>
                    <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-lg">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rows */}
          {rows.length > 0 && (
            <div className="space-y-1.5">
              <div className={`grid gap-1 ${tab === 'workout' ? 'grid-cols-[1fr_40px_52px_52px_24px]' : 'grid-cols-[64px_1fr_40px_52px_24px]'}`}>
                {(tab === 'workout' ? ['Exercise', 'Sets', 'Reps', 'Rest', ''] : ['Time', 'Meal', 'Protein', 'Cal', '']).map(h => (
                  <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase px-1">{h}</span>
                ))}
              </div>
              {tab === 'workout'
                ? rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_40px_52px_52px_24px] gap-1 items-center bg-gray-50 rounded-lg px-1.5 py-1">
                      <input value={r.name}  onChange={e => updateRow(i, { name: e.target.value })}  placeholder="Exercise" className={inputCls} />
                      <input value={r.sets}  onChange={e => updateRow(i, { sets: e.target.value })}  placeholder="4" type="number" className={inputCls} />
                      <input value={r.reps}  onChange={e => updateRow(i, { reps: e.target.value })}  placeholder="8-12" className={inputCls} />
                      <input value={r.rest}  onChange={e => updateRow(i, { rest: e.target.value })}  placeholder="60s" className={inputCls} />
                      <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))
                : rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[64px_1fr_40px_52px_24px] gap-1 items-center bg-gray-50 rounded-lg px-1.5 py-1">
                      <input value={r.time}      onChange={e => updateRow(i, { time: e.target.value })}      placeholder="8 AM" className={inputCls} />
                      <input value={r.meal_name} onChange={e => updateRow(i, { meal_name: e.target.value })} placeholder="Meal" className={inputCls} />
                      <input value={r.protein}   onChange={e => updateRow(i, { protein: e.target.value })}   placeholder="30g" type="number" className={inputCls} />
                      <input value={r.calories}  onChange={e => updateRow(i, { calories: e.target.value })}  placeholder="400" type="number" className={inputCls} />
                      <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))
              }
            </div>
          )}

          <button onClick={() => setRows(r => [...r, tab === 'workout' ? { name:'',sets:'',reps:'',rest:'',notes:'' } : { time:'',meal_name:'',items:'',protein:'',calories:'' }])}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add row manually
          </button>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all">
              {saving ? 'Assigning...' : 'Assign to ' + member.name}
            </button>
            <button onClick={() => setStep('pick')} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer">
              Back
            </button>
          </div>
        </div>
      )}
    </FormModal>
  )
}

// ─── Member detail drawer ─────────────────────────────────────────────────────
function MemberDetailPanel({ member, gymId, onClose }) {
  const dialog = useDialog()
  const [tab, setTab]           = useState('plans')
  const [plans, setPlans]       = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading]   = useState(true)
  const [assigning, setAssigning] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([fetchMemberAssignedPlans(member.id), fetchMemberAttendance(gymId, member.id, 20)])
      setPlans(p)
      setAttendance(a)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [member.id, gymId])

  useEffect(() => { loadData() }, [loadData])

  async function handleArchive(plan) {
    if (!await dialog.confirm(`Archive "${plan.title}"?`)) return
    await archiveMemberPlan(plan.id)
    setPlans(prev => prev.filter(p => p.id !== plan.id))
  }

  const activePlans   = plans.filter(p => p.status === 'active')
  const archivedPlans = plans.filter(p => p.status === 'archived')

  const thisMonth = attendance.filter(a => {
    const d = new Date(a.check_in)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{member.name}</p>
          <p className="text-xs text-gray-400">{member.phone || member.email || 'No contact'} · {member.plan?.name || 'No plan'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAssigning(true)} className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 cursor-pointer transition-colors">
            + Assign Plan
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[['plans', 'Plans'], ['attendance', 'Attendance']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${tab === v ? 'text-violet-700 border-violet-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            {l}
            {v === 'plans' && activePlans.length > 0 && <span className="ml-1 text-[10px] bg-violet-100 text-violet-700 rounded-full px-1.5 py-0.5">{activePlans.length}</span>}
            {v === 'attendance' && <span className="ml-1 text-[10px] text-gray-400">{thisMonth} this month</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"/></div>
        ) : tab === 'plans' ? (
          activePlans.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active plans. Assign one above.</p>
          ) : (
            <div className="space-y-2">
              {activePlans.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400">{p.plan_type === 'workout' ? 'Workout' : 'Diet'} · {Array.isArray(p.data) ? p.data.length : 0} items</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.plan_type === 'workout' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.plan_type === 'workout' ? 'Workout' : 'Diet'}
                  </span>
                  <button onClick={() => handleArchive(p)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer shrink-0">Archive</button>
                </div>
              ))}
              {archivedPlans.length > 0 && <p className="text-xs text-gray-400 text-center">{archivedPlans.length} archived</p>}
            </div>
          )
        ) : (
          attendance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No check-in records found.</p>
          ) : (
            <div className="space-y-1.5">
              {attendance.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"/>
                  <p className="text-xs text-gray-700">
                    {new Date(a.check_in).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400 ml-auto">
                    {new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {assigning && (
        <AssignPlanModal member={member} gymId={gymId} onClose={() => setAssigning(false)}
          onAssigned={() => { setAssigning(false); loadData() }} />
      )}
    </div>
  )
}

// ─── TrainerMembersPage ───────────────────────────────────────────────────────
export default function TrainerMembersPage() {
  const { gymId, user } = useAuth()
  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    if (!gymId || !user) { setLoading(false); return }
    let cancelled = false
    fetchAssignedMembers(gymId, user.id)
      .then(m => { if (!cancelled) setMembers(m) })
      .catch(err => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId, user])

  function getStatus(m) {
    if (!m.plan_id) return 'inactive'
    if (!m.expiry_date) return 'inactive'
    return new Date(m.expiry_date) >= new Date() ? 'active' : 'expired'
  }

  const filtered = members.filter(m => {
    if (filter !== 'all' && getStatus(m) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (m.name || '').toLowerCase().includes(q) || (m.phone || '').includes(q)
    }
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Members</h1>
        <p className="text-sm text-gray-500 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {['all', 'active', 'expired', 'inactive'].map(f => {
            const count = f === 'all' ? members.length : members.filter(m => getStatus(m) === f).length
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            )
          })}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-500 w-full sm:w-56" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">{members.length === 0 ? 'No members assigned to you yet.' : 'No matching members.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const st = getStatus(m)
            const isSelected = selectedMember?.id === m.id
            const stCls = st === 'active' ? 'bg-green-50 text-green-700' : st === 'expired' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'
            return (
              <div key={m.id} className="space-y-3">
                <div
                  onClick={() => setSelectedMember(isSelected ? null : m)}
                  className={`flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${isSelected ? 'border-violet-300 shadow-sm' : 'border-gray-200'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.phone || m.email || 'No contact'} · {m.plan?.name || 'No plan'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${stCls}`}>{st.charAt(0).toUpperCase() + st.slice(1)}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
                {isSelected && <MemberDetailPanel member={m} gymId={gymId} onClose={() => setSelectedMember(null)} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
