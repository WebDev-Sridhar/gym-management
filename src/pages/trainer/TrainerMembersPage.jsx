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
function AssignPlanModal({ member, gymId, activePlans = [], editingPlan = null, onClose, onAssigned }) {
  const existingActive = activePlans.filter(p => p.status === 'active' && p.id !== editingPlan?.id)
  const initialTab  = editingPlan?.plan_type || 'workout'
  const initialStep = editingPlan ? 'edit' : existingActive.length > 0 ? 'overview' : 'pick'

  const [tab, setTab]               = useState(initialTab)
  const [templates, setTemplates]   = useState([])
  const [days, setDays]             = useState([])   // [{name, rest, exercises/meals:[]}]
  const [title, setTitle]           = useState('')
  const [step, setStep]             = useState(initialStep)
  const [replaceIds, setReplaceIds]   = useState([])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [daySearch, setDaySearch]     = useState('')

  const itemKey   = tab === 'workout' ? 'exercises' : 'meals'
  const db        = tab === 'workout' ? EXERCISES : MEALS
  const nameKey   = tab === 'workout' ? 'name' : 'meal_name'
  const emptyItem = () => tab === 'workout'
    ? { name: '', sets: '', reps: '', rest: '' }
    : { time: '', meal_name: '', protein: '', calories: '' }
  const emptyDay  = () => ({ name: '', rest: false, [itemKey]: [] })

  // Convert any data format → day-wise array
  function toDays(data, planType) {
    if (!Array.isArray(data) || data.length === 0) return [{ name: 'Day 1', rest: false, [itemKey]: [] }]
    const ik = planType === 'workout' ? 'exercises' : 'meals'
    const isWeekly = data[0] && Array.isArray(data[0][ik])
    if (isWeekly) return data.map(d => ({ ...d, [ik]: (d[ik] || []).map(i => ({ ...i })) }))
    // Flat list → single day
    return [{ name: 'Day 1', rest: false, [ik]: data.map(i => ({ ...i })) }]
  }

  useEffect(() => {
    if (!editingPlan) return
    setTitle(editingPlan.title || '')
    setDays(toDays(editingPlan.data, editingPlan.plan_type))
  }, [editingPlan])

  useEffect(() => {
    if (step !== 'pick' && step !== 'edit') return
    const fn = tab === 'workout' ? fetchGymWorkoutTemplates : fetchGymDietTemplates
    fn(gymId).then(setTemplates).catch(() => setError('Failed to load templates'))
  }, [tab, gymId, step])

  function pickTemplate(t) {
    setTitle(t.title)
    const src = tab === 'workout' ? t.exercises : t.meals
    setDays(toDays(src || [], tab))
    setStep('edit')
    setError('')
  }

  // Day-level operations
  const addDay        = () => setDays(d => [...d, emptyDay()])
  const removeDay     = (di) => setDays(d => d.filter((_, i) => i !== di))
  const updateDay     = (di, patch) => setDays(d => d.map((day, i) => i === di ? { ...day, ...patch } : day))
  const addItem       = (di) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: [...(day[itemKey] || []), emptyItem()] }))
  const removeItem    = (di, ii) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).filter((_, j) => j !== ii) }))
  const updateItem    = (di, ii, patch) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).map((item, j) => j !== ii ? item : { ...item, ...patch }) }))
  const addFromDb     = (item) => {
    setDays(d => d.map((day, i) => i !== activeDayIdx ? day : { ...day, [itemKey]: [...(day[itemKey] || []), { ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }] }))
    setDaySearch('')
  }

  const inputCls = 'px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-violet-500 w-full'

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    const hasItems = days.some(d => !d.rest && (d[itemKey] || []).length > 0)
    if (!hasItems) { setError('Add at least one exercise/meal to a day'); return }
    setSaving(true); setError('')
    try {
      if (editingPlan) await archiveMemberPlan(editingPlan.id)
      await Promise.all(replaceIds.map(id => archiveMemberPlan(id)))
      await assignPlanToMember({ gymId, memberId: member.id, planType: tab, title: title.trim(), data: days })
      onAssigned()
    } catch (err) {
      setError(err.message || 'Failed to assign plan')
      setSaving(false)
    }
  }

  return (
    <FormModal title={editingPlan ? `Edit Plan — ${member.name}` : `Assign Plan — ${member.name}`} onClose={onClose} wide>

      {/* ── Overview: show existing plans before creating ── */}
      {step === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              {member.name} already has these active plans
            </p>
            <div className="space-y-2">
              {existingActive.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${p.plan_type === 'workout' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.plan_type === 'workout' ? 'Workout' : 'Diet'}
                  </span>
                  <p className="text-xs font-medium text-gray-900 flex-1 truncate">{p.title}</p>
                  <button
                    onClick={() => { setReplaceIds([p.id]); setTab(p.plan_type); setStep('pick') }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 cursor-pointer shrink-0 border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors"
                  >
                    Replace
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setReplaceIds([]); setStep('pick') }}
            className="w-full py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 cursor-pointer transition-colors"
          >
            + Add New Plan
          </button>
        </div>
      )}

      {/* Type tabs — hidden when editing an existing plan (type is fixed) */}
      {(step === 'pick' || step === 'edit') && !editingPlan && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
          {[['workout', 'Workout'], ['diet', 'Diet']].map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setStep('pick'); setRows([]); setTitle('') }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === v ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      )}

      {/* Template picker */}
      {step === 'pick' && (
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
          <button onClick={() => { setTitle(''); setRows([]); setStep('edit') }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            + Start from scratch
          </button>
        </div>
      )}

      {/* Edit form — day navigator */}
      {step === 'edit' && (() => {
        const safeIdx  = Math.min(activeDayIdx, days.length - 1)
        const activeDay = days[safeIdx]
        const items    = activeDay?.[itemKey] || []
        const dbResults = daySearch.trim()
          ? db.filter(x => x[nameKey].toLowerCase().includes(daySearch.toLowerCase())).slice(0, 5)
          : []
        return (
          <div className="space-y-3">
            {/* Plan title */}
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={tab === 'workout' ? 'Plan title e.g. Push/Pull/Legs' : 'Plan title e.g. High Protein Diet'}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-violet-500 transition-all" />

            {/* Day tab bar */}
            <div className="flex items-center gap-1">
              <div className="flex gap-1 overflow-x-auto flex-1 pb-0.5 no-scrollbar">
                {days.map((d, di) => (
                  <button key={di} onClick={() => { setActiveDayIdx(di); setDaySearch('') }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      di === safeIdx
                        ? 'bg-violet-600 text-white'
                        : d.rest
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                    }`}>
                    {d.name?.trim() || `Day ${di + 1}`}
                    {d.rest && <span className="ml-1 opacity-60">·rest</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => { addDay(); setActiveDayIdx(days.length); setDaySearch('') }}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-violet-50 text-gray-500 hover:text-violet-600 cursor-pointer transition-colors"
                title="Add day">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>

            {/* Active day editor */}
            {activeDay && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Day meta row */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    Day {safeIdx + 1}
                  </span>
                  <input
                    value={activeDay.name ?? ''}
                    onChange={e => updateDay(safeIdx, { name: e.target.value })}
                    placeholder={tab === 'workout' ? 'e.g. Push Day' : 'e.g. Monday'}
                    className="flex-1 text-xs font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-300 min-w-0"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!activeDay.rest} onChange={e => updateDay(safeIdx, { rest: e.target.checked })} className="accent-violet-600 w-3 h-3" />
                    Rest day
                  </label>
                  <button onClick={() => { removeDay(safeIdx); setActiveDayIdx(Math.max(0, safeIdx - 1)) }}
                    title="Remove this day" className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                {activeDay.rest ? (
                  <p className="text-xs text-gray-400 text-center py-6">Rest day — no exercises scheduled</p>
                ) : (
                  <div className="px-3 py-2.5 space-y-1.5">
                    {/* Column headers */}
                    {items.length > 0 && (
                      <div className={`grid gap-1 px-1 ${tab === 'workout' ? 'grid-cols-[1fr_38px_52px_48px_20px]' : 'grid-cols-[56px_1fr_44px_48px_20px]'}`}>
                        {(tab === 'workout' ? ['Exercise','Sets','Reps','Rest',''] : ['Time','Meal','Pro.','Cal','']).map(h => (
                          <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase">{h}</span>
                        ))}
                      </div>
                    )}

                    {/* Item rows */}
                    {tab === 'workout'
                      ? items.map((r, ii) => (
                          <div key={ii} className="grid grid-cols-[1fr_38px_52px_48px_20px] gap-1 items-center">
                            <input value={r.name ?? ''} onChange={e => updateItem(safeIdx, ii, { name: e.target.value })} placeholder="Exercise" className={inputCls} />
                            <input value={r.sets ?? ''} onChange={e => updateItem(safeIdx, ii, { sets: e.target.value })} placeholder="4"    type="number" className={inputCls} />
                            <input value={r.reps ?? ''} onChange={e => updateItem(safeIdx, ii, { reps: e.target.value })} placeholder="8-12" className={inputCls} />
                            <input value={r.rest ?? ''} onChange={e => updateItem(safeIdx, ii, { rest: e.target.value })} placeholder="60s"  className={inputCls} />
                            <button onClick={() => removeItem(safeIdx, ii)} className="text-gray-300 hover:text-red-400 cursor-pointer flex justify-center">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))
                      : items.map((r, ii) => (
                          <div key={ii} className="grid grid-cols-[56px_1fr_44px_48px_20px] gap-1 items-center">
                            <input value={r.time ?? ''}      onChange={e => updateItem(safeIdx, ii, { time: e.target.value })}      placeholder="8 AM" className={inputCls} />
                            <input value={r.meal_name ?? ''} onChange={e => updateItem(safeIdx, ii, { meal_name: e.target.value })} placeholder="Meal" className={inputCls} />
                            <input value={r.protein ?? ''}   onChange={e => updateItem(safeIdx, ii, { protein: e.target.value })}   placeholder="30g"  type="number" className={inputCls} />
                            <input value={r.calories ?? ''}  onChange={e => updateItem(safeIdx, ii, { calories: e.target.value })}  placeholder="400"  type="number" className={inputCls} />
                            <button onClick={() => removeItem(safeIdx, ii)} className="text-gray-300 hover:text-red-400 cursor-pointer flex justify-center">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))
                    }

                    {/* Search */}
                    <div className="relative mt-1">
                      <input value={daySearch}
                        onChange={e => setDaySearch(e.target.value)}
                        placeholder={`Search ${tab === 'workout' ? 'exercises' : 'meals'} to add…`}
                        className="w-full px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-lg text-xs outline-none focus:border-violet-400" />
                      {dbResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                          {dbResults.map((item, i) => (
                            <button key={i} type="button" onMouseDown={() => addFromDb(item)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-50 text-left cursor-pointer border-b border-gray-50 last:border-0">
                              <p className="text-xs font-medium text-gray-900 flex-1 truncate">{item[nameKey]}</p>
                              <p className="text-[10px] text-gray-400 shrink-0">
                                {tab === 'workout' ? `${item.sets}×${item.reps}` : `${item.calories}kcal`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => addItem(safeIdx)}
                      className="text-[11px] text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                      Add {tab === 'workout' ? 'exercise' : 'meal'} manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all">
                {saving ? 'Saving...' : editingPlan ? 'Save Changes' : replaceIds.length > 0 ? 'Replace & Assign' : 'Assign to ' + member.name}
              </button>
              {!editingPlan && (
                <button onClick={() => setStep(existingActive.length > 0 ? 'overview' : 'pick')}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer">
                  Back
                </button>
              )}
            </div>
          </div>
        )
      })()}
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
  const [editingPlan, setEditingPlan] = useState(null)

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

  const stColor = (st) => {
    if (st === 'active') return { color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
    if (st === 'expired') return { color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
    return { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', fontWeight: 500 }}>{member.phone || member.email || 'No contact'} · {member.plan?.name || 'No plan'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setAssigning(true)} style={{ padding: '6px 12px', background: '#818cf8', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Plan
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[['plans', 'Plans'], ['attendance', 'Attendance']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: 'none', border: 'none',
            borderBottom: tab === v ? '2px solid #818cf8' : '2px solid transparent',
            color: tab === v ? '#818cf8' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.15s',
          }}>
            {l}
            {v === 'plans' && activePlans.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: 'rgba(129,140,248,0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: 20 }}>{activePlans.length}</span>
            )}
            {v === 'attendance' && thisMonth > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{thisMonth} mo</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', maxHeight: 280, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(129,140,248,0.3)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'plans' ? (
          activePlans.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', margin: 0 }}>No active plans. Tap + Plan to assign one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activePlans.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                      {p.plan_type === 'workout' ? 'Workout' : 'Diet'} · {Array.isArray(p.data) ? p.data.length : 0} days
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0, background: p.plan_type === 'workout' ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)', color: p.plan_type === 'workout' ? '#818cf8' : '#34d399' }}>
                    {p.plan_type === 'workout' ? 'Workout' : 'Diet'}
                  </span>
                  <button onClick={() => { setEditingPlan(p); setAssigning(true) }} style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Edit</button>
                  <button onClick={() => handleArchive(p)} style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Archive</button>
                </div>
              ))}
              {archivedPlans.length > 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '4px 0 0' }}>{archivedPlans.length} archived</p>}
            </div>
          )
        ) : (
          attendance.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', margin: 0 }}>No check-in records found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attendance.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600 }}>
                    {new Date(a.check_in).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 0 auto' }}>
                    {new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {assigning && (
        <AssignPlanModal
          member={member} gymId={gymId} activePlans={activePlans} editingPlan={editingPlan}
          onClose={() => { setAssigning(false); setEditingPlan(null) }}
          onAssigned={() => { setAssigning(false); setEditingPlan(null); loadData() }}
        />
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

  function statusStyle(st) {
    if (st === 'active') return { color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
    if (st === 'expired') return { color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
    return { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(129,140,248,0.3)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f7', margin: 0, letterSpacing: '-0.5px' }}>Members</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0', fontWeight: 500 }}>
          {members.length} member{members.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '10px 14px',
      }}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f5f5f7', fontFamily: 'inherit' }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {['all', 'active', 'expired', 'inactive'].map(f => {
          const count = f === 'all' ? members.length : members.filter(m => getStatus(m) === f).length
          const isActive = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: isActive ? 'rgba(129,140,248,0.15)' : 'transparent',
              borderColor: isActive ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.08)',
              color: isActive ? '#818cf8' : 'rgba(255,255,255,0.38)',
              transition: 'all 0.15s',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 20px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20,
        }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            {members.length === 0 ? 'No members assigned to you yet.' : 'No matching members.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => {
            const st = getStatus(m)
            const stStyle = statusStyle(st)
            const isSelected = selectedMember?.id === m.id
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  onClick={() => setSelectedMember(isSelected ? null : m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px',
                    background: isSelected ? 'rgba(129,140,248,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 18, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0', fontWeight: 500 }}>{m.phone || m.email || 'No contact'} · {m.plan?.name || 'No plan'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: stStyle.color, background: stStyle.bg }}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </span>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{ color: 'rgba(255,255,255,0.25)', transform: isSelected ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
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
