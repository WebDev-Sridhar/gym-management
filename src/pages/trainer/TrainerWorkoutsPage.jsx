import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import {
  fetchGymWorkoutTemplates, fetchGymDietTemplates, fetchAssignedMembers,
  assignPlanToMember, fetchMemberAssignedPlans, archiveMemberPlan,
} from '../../services/trainerService'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function AssignModal({ template, planType, members, gymId, onClose, onAssigned }) {
  const dialog = useDialog()
  const itemKey  = planType === 'workout' ? 'exercises' : 'meals'
  const db       = planType === 'workout' ? EXERCISES : MEALS
  const nameKey  = planType === 'workout' ? 'name' : 'meal_name'
  const emptyItem = () => planType === 'workout'
    ? { name: '', sets: '', reps: '', rest: '' }
    : { time: '', meal_name: '', protein: '', calories: '' }
  const emptyDay = () => ({ name: '', rest: false, [itemKey]: [] })

  // Build initial days from template (already week-structured)
  function templateToDays(t) {
    const src = t.exercises ?? t.meals ?? []
    return src.map(d => ({ ...d, [itemKey]: (d[itemKey] || []).map(i => ({ ...i })) }))
  }

  const [step, setStep]             = useState('pick-member')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected]     = useState(null)
  const [memberPlans, setMemberPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [replaceId, setReplaceId]   = useState(null)
  const [days, setDays]             = useState(templateToDays(template))
  const [customTitle, setCustomTitle] = useState(template.title)
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [daySearch, setDaySearch]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const templateDays = template.exercises ?? template.meals ?? []
  const filtered = members.filter(m =>
    !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )

  async function selectMember(m) {
    setSelected(m)
    setLoadingPlans(true)
    try {
      const plans = await fetchMemberAssignedPlans(m.id)
      const active = plans.filter(p => p.status === 'active')
      setMemberPlans(active)
      if (active.find(p => p.plan_type === planType)) setStep('conflict')
    } catch { /* silent */ } finally {
      setLoadingPlans(false)
    }
  }

  async function doAssign() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      if (replaceId) await archiveMemberPlan(replaceId)
      await assignPlanToMember({ gymId, memberId: selected.id, planType, title: customTitle, data: days })
      onAssigned(selected.name)
    } catch (err) {
      setError(err.message || 'Failed to assign')
      setSaving(false)
    }
  }

  // Day operations
  const addDay        = () => setDays(d => [...d, emptyDay()])
  const removeDay     = (di) => setDays(d => d.filter((_, i) => i !== di))
  const updateDay     = (di, patch) => setDays(d => d.map((day, i) => i === di ? { ...day, ...patch } : day))
  const addItem       = (di) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: [...(day[itemKey] || []), emptyItem()] }))
  const removeItem    = (di, ii) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).filter((_, j) => j !== ii) }))
  const updateItem    = (di, ii, patch) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).map((item, j) => j !== ii ? item : { ...item, ...patch }) }))
  const addFromDb     = (item) => {
    setDays(d => d.map((day, i) => i !== safeIdx ? day : { ...day, [itemKey]: [...(day[itemKey] || []), { ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }] }))
    setDaySearch('')
  }

  const safeIdx   = Math.min(activeDayIdx, Math.max(0, days.length - 1))
  const activeDay = days[safeIdx]
  const items     = activeDay?.[itemKey] || []
  const dbResults = daySearch.trim()
    ? db.filter(x => x[nameKey].toLowerCase().includes(daySearch.toLowerCase())).slice(0, 5)
    : []

  const inputCls = 'px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-violet-500 w-full'

  return (
    <FormModal title={`Assign — ${template.title}`} onClose={onClose} wide>
      <div className="space-y-4">

        {/* ── Step 1: Pick member ── */}
        {(step === 'pick-member' || step === 'conflict') && (
          <>
            {/* Weekly preview mini-chart */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Weekly Plan Preview</p>
              <div className="grid grid-cols-7 gap-1">
                {templateDays.map((d, i) => {
                  const count = (d[itemKey] || []).length
                  return (
                    <div key={i} className={`rounded-lg p-1.5 text-center ${d.rest ? 'bg-white' : count > 0 ? 'bg-violet-50 border border-violet-100' : 'bg-white border border-dashed border-gray-200'}`}>
                      <p className="text-[10px] font-bold text-gray-500">{DAY_ABBR[i] || `D${i+1}`}</p>
                      {d.rest
                        ? <p className="text-[9px] text-gray-300 mt-0.5">Rest</p>
                        : <p className="text-[10px] font-semibold text-violet-600 mt-0.5">{count}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Member picker */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign to Member</label>
              <input value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelected(null); setStep('pick-member') }}
                placeholder="Search member…" autoFocus
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 mb-2" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filtered.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">No members</p>
                  : filtered.map(m => (
                    <button key={m.id} onClick={() => selectMember(m)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer border transition-all ${selected?.id === m.id ? 'bg-violet-50 border-violet-200' : 'hover:bg-gray-50 border-transparent'}`}>
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate flex-1">{m.name}</p>
                      {loadingPlans && selected?.id === m.id && (
                        <span className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      {selected?.id === m.id && !loadingPlans && (
                        <svg className="w-4 h-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Conflict warning */}
            {step === 'conflict' && selected && (() => {
              const conflict = memberPlans.find(p => p.plan_type === planType)
              return conflict ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-amber-800">{selected.name} already has a {planType} plan</p>
                      <p className="text-xs text-amber-600 mt-0.5">"{conflict.title}" is currently active</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setReplaceId(conflict.id); setStep('pick-member') }}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      Replace existing
                    </button>
                    <button onClick={() => { setReplaceId(null); setStep('pick-member') }}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      Add alongside
                    </button>
                  </div>
                </div>
              ) : null
            })()}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            {step !== 'conflict' && (
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setStep('customize')} disabled={!selected || loadingPlans}
                  className="flex-1 py-2.5 border border-violet-300 text-violet-700 text-sm font-semibold rounded-xl hover:bg-violet-50 disabled:opacity-40 cursor-pointer transition-colors">
                  Customize & Assign
                </button>
                <button onClick={doAssign} disabled={saving || !selected || loadingPlans}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer">
                  {saving ? 'Assigning…' : selected ? `Assign to ${selected.name}` : 'Select a member'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Customize (day navigator) ── */}
        {step === 'customize' && (
          <div className="space-y-3">
            {/* Title */}
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-violet-500" />

            {/* Day tab bar */}
            <div className="flex items-center gap-1">
              <div className="flex gap-1 overflow-x-auto flex-1 pb-0.5">
                {days.map((d, di) => (
                  <button key={di} onClick={() => { setActiveDayIdx(di); setDaySearch('') }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      di === safeIdx
                        ? 'bg-violet-600 text-white'
                        : d.rest
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                    }`}>
                    {d.name?.trim() || DAY_ABBR[di] || `Day ${di + 1}`}
                    {d.rest && <span className="ml-1 opacity-60">·rest</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => { addDay(); setActiveDayIdx(days.length); setDaySearch('') }}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-violet-50 text-gray-500 hover:text-violet-600 cursor-pointer transition-colors" title="Add day">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>

            {/* Active day editor */}
            {activeDay && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Day meta row */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Day {safeIdx + 1}</span>
                  <input
                    value={activeDay.name ?? ''}
                    onChange={e => updateDay(safeIdx, { name: e.target.value })}
                    placeholder={planType === 'workout' ? 'e.g. Push Day' : 'e.g. Monday'}
                    className="flex-1 text-xs font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-300 min-w-0"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!activeDay.rest} onChange={e => updateDay(safeIdx, { rest: e.target.checked })} className="accent-violet-600 w-3 h-3" />
                    Rest day
                  </label>
                  <button onClick={() => { removeDay(safeIdx); setActiveDayIdx(Math.max(0, safeIdx - 1)) }}
                    className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0" title="Remove day">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                {activeDay.rest ? (
                  <p className="text-xs text-gray-400 text-center py-6">Rest day — no exercises scheduled</p>
                ) : (
                  <div className="px-3 py-2.5 space-y-1.5">
                    {items.length > 0 && (
                      <div className={`grid gap-1 px-1 ${planType === 'workout' ? 'grid-cols-[1fr_38px_52px_48px_20px]' : 'grid-cols-[56px_1fr_44px_48px_20px]'}`}>
                        {(planType === 'workout' ? ['Exercise','Sets','Reps','Rest',''] : ['Time','Meal','Pro.','Cal','']).map(h => (
                          <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase">{h}</span>
                        ))}
                      </div>
                    )}

                    {planType === 'workout'
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

                    {/* Per-day search */}
                    <div className="relative mt-1">
                      <input value={daySearch} onChange={e => setDaySearch(e.target.value)}
                        placeholder={`Search ${planType === 'workout' ? 'exercises' : 'meals'} to add…`}
                        className="w-full px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-lg text-xs outline-none focus:border-violet-400" />
                      {dbResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                          {dbResults.map((item, i) => (
                            <button key={i} type="button" onMouseDown={() => addFromDb(item)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-50 text-left cursor-pointer border-b border-gray-50 last:border-0">
                              <p className="text-xs font-medium text-gray-900 flex-1 truncate">{item[nameKey]}</p>
                              <p className="text-[10px] text-gray-400 shrink-0">
                                {planType === 'workout' ? `${item.sets}×${item.reps}` : `${item.calories}kcal`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => addItem(safeIdx)}
                      className="text-[11px] text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                      Add {planType === 'workout' ? 'exercise' : 'meal'} manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={doAssign} disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer">
                {saving ? 'Assigning…' : replaceId ? `Replace & Assign to ${selected?.name}` : `Assign to ${selected?.name}`}
              </button>
              <button onClick={() => setStep('pick-member')} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  )
}

// ─── View plan modal ──────────────────────────────────────────────────────────
function ViewPlanModal({ template, planType, onClose }) {
  const itemKey = planType === 'workout' ? 'exercises' : 'meals'
  const days    = (template.exercises ?? template.meals) || []
  const [activeIdx, setActiveIdx] = useState(0)
  const safeIdx  = Math.min(activeIdx, Math.max(0, days.length - 1))
  const activeDay = days[safeIdx]
  const items     = activeDay?.[itemKey] || []

  return (
    <FormModal title={template.title} onClose={onClose} wide>
      <div className="space-y-3">

        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${planType === 'workout' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {planType === 'workout' ? 'Workout' : 'Diet'}
          </span>
          <span>{days.filter(d => !d.rest).length} training days</span>
          <span>·</span>
          <span>{days.reduce((s, d) => s + (d[itemKey] || []).length, 0)} {planType === 'workout' ? 'exercises' : 'meals'} total</span>
        </div>

        {/* Day tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {days.map((d, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                i === safeIdx
                  ? 'bg-violet-600 text-white'
                  : d.rest
                    ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
              }`}>
              {d.name?.trim() || DAY_ABBR[i] || `Day ${i + 1}`}
              {d.rest && <span className="ml-1 opacity-60">·rest</span>}
            </button>
          ))}
        </div>

        {/* Active day content */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Day header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-800">
                Day {safeIdx + 1}{activeDay?.name ? ` — ${activeDay.name}` : ''}
              </p>
              {activeDay?.rest && <p className="text-[11px] text-gray-400 mt-0.5">Rest day</p>}
            </div>
            {!activeDay?.rest && items.length > 0 && (
              <span className="ml-auto text-[11px] text-gray-400">{items.length} {planType === 'workout' ? 'exercise' : 'meal'}{items.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {activeDay?.rest ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs">Rest day — no activities scheduled</p>
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No items added for this day</p>
          ) : planType === 'workout' ? (
            <div className="divide-y divide-gray-50">
              {/* Header */}
              <div className="grid grid-cols-[1fr_44px_56px_52px] gap-2 px-4 py-2 bg-gray-50/50">
                {['Exercise', 'Sets', 'Reps', 'Rest'].map(h => (
                  <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase">{h}</span>
                ))}
              </div>
              {items.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_44px_56px_52px] gap-2 px-4 py-2.5 hover:bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.name || '—'}</p>
                  <p className="text-sm text-gray-600">{r.sets || '—'}</p>
                  <p className="text-sm text-gray-600">{r.reps || '—'}</p>
                  <p className="text-sm text-gray-600">{r.rest || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="grid grid-cols-[60px_1fr_52px_56px] gap-2 px-4 py-2 bg-gray-50/50">
                {['Time', 'Meal', 'Protein', 'Calories'].map(h => (
                  <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase">{h}</span>
                ))}
              </div>
              {items.map((r, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_52px_56px] gap-2 px-4 py-2.5 hover:bg-gray-50/50">
                  <p className="text-sm text-gray-600">{r.time || '—'}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{r.meal_name || '—'}</p>
                  <p className="text-sm text-gray-600">{r.protein ? `${r.protein}g` : '—'}</p>
                  <p className="text-sm text-gray-600">{r.calories ? `${r.calories} kcal` : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
          Close
        </button>
      </div>
    </FormModal>
  )
}

export default function TrainerWorkoutsPage() {
  const { gymId, user } = useAuth()
  const dialog = useDialog()
  const [tab, setTab]             = useState('workout')
  const [wTemplates, setWT]       = useState([])
  const [dTemplates, setDT]       = useState([])
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [viewing, setViewing]     = useState(null)

  useEffect(() => {
    if (!gymId || !user) { setLoading(false); return }
    let dead = false
    Promise.all([fetchGymWorkoutTemplates(gymId), fetchGymDietTemplates(gymId), fetchAssignedMembers(gymId, user.id)])
      .then(([w, d, m]) => { if (!dead) { setWT(w); setDT(d); setMembers(m) } })
      .catch(err => console.error(err))
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [gymId, user])

  const templates = tab === 'workout' ? wTemplates : dTemplates
  const itemKey   = tab === 'workout' ? 'exercises' : 'meals'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(129,140,248,0.3)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f7', margin: 0, letterSpacing: '-0.5px' }}>Plans</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0', fontWeight: 500 }}>Assign workout & diet plans to your members</p>
      </div>

      {/* Tab toggle */}
      <div style={{
        display: 'flex', gap: 4, padding: 4,
        background: 'rgba(255,255,255,0.05)', borderRadius: 14,
        alignSelf: 'flex-start',
      }}>
        {[['workout', 'Workouts', wTemplates.length], ['diet', 'Diet Plans', dTemplates.length]].map(([v, l, count]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            background: tab === v ? '#818cf8' : 'transparent',
            color: tab === v ? '#fff' : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s',
          }}>
            {l} <span style={{ fontWeight: 500, opacity: 0.7 }}>{count}</span>
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 22,
        }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No {tab} templates yet</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: '6px 0 0' }}>Ask your gym owner to create templates in Programs</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {templates.map(t => {
            const days = (t.exercises ?? t.meals) || []
            const activeDays = days.filter(d => !d.rest)
            const total = days.reduce((sum, d) => sum + (d[itemKey] || []).length, 0)
            const isWorkout = tab === 'workout'
            return (
              <div key={t.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '16px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
                    padding: '3px 8px', borderRadius: 20,
                    background: isWorkout ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)',
                    color: isWorkout ? '#818cf8' : '#34d399',
                  }}>
                    {isWorkout ? 'Workout' : 'Diet'}
                  </span>
                </div>
                {t.description && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                  <span>{activeDays.length} training days</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{total} {isWorkout ? 'exercises' : 'meals'}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {days.map((d, i) => (
                    <span key={i} style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                      background: d.rest ? 'rgba(255,255,255,0.06)' : isWorkout ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)',
                      color: d.rest ? 'rgba(255,255,255,0.28)' : isWorkout ? '#818cf8' : '#34d399',
                    }}>
                      {d.name?.slice(0, 3) || DAY_ABBR[i]}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button onClick={() => setViewing(t)} style={{
                    flex: 1, padding: '9px 0', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    View
                  </button>
                  <button onClick={() => setAssigning(t)} style={{
                    flex: 1, padding: '9px 0', border: 'none',
                    borderRadius: 12, background: '#818cf8', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Assign
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewing && (
        <ViewPlanModal template={viewing} planType={tab} onClose={() => setViewing(null)} />
      )}
      {assigning && (
        <AssignModal template={assigning} planType={tab} members={members} gymId={gymId}
          onClose={() => setAssigning(null)}
          onAssigned={async name => { setAssigning(null); await dialog.alert(`Plan assigned to ${name}.`) }} />
      )}
    </div>
  )
}
