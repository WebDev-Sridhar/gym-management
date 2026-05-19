import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import {
  fetchWorkoutTemplates, createWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate,
  fetchDietTemplates, createDietTemplate, updateDietTemplate, deleteDietTemplate,
  assignPlan, fetchAssignedPlans, archiveAssignedPlan,
} from '../../services/programsService'
import { fetchMembers } from '../../services/membershipService'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'
import { Sk } from '../../components/ui/Skeleton'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'
import { Dumbbell, Utensils, TriangleAlert, Search, Plus, X, Loader2, Copy } from 'lucide-react'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ProgramsSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={140} /><Sk h={14} w={300} /></div>
        <Sk h={38} w={140} r={10} />
      </div>
      <Sk h={42} w={220} r={12} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Sk h={40} w={40} r={12} />
              <Sk h={22} w={56} r={20} />
            </div>
            <div className="space-y-2"><Sk h={18} w="65%" /><Sk h={13} w="45%" /></div>
            <div className="flex gap-2 pt-2 border-t border-gray-50">
              <Sk h={32} w="33%" r={8} /><Sk h={32} w="33%" r={8} /><Sk h={32} w="33%" r={8} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const emptyExercise = () => ({ name: '', sets: '', reps: '', rest: '', notes: '' })
const emptyMeal     = () => ({ time: '', meal_name: '', items: '', protein: '', calories: '' })

function defaultDays(type) {
  return DAY_NAMES.map((name, i) => ({
    day: i + 1,
    name,
    rest: i >= 5, // Sat + Sun default to rest
    ...(type === 'workout' ? { exercises: [] } : { meals: [] }),
  }))
}

// Parse existing template back into days array (handles old flat-array format gracefully)
function parseDays(template, type) {
  const raw = type === 'workout' ? template.exercises : template.meals
  if (!Array.isArray(raw) || raw.length === 0) return defaultDays(type)
  // New weekly format: array of objects with `day` property
  if (raw[0]?.day !== undefined) return raw
  // Old flat format: wrap into a single day
  return [{ day: 1, name: 'Day 1', rest: false, ...(type === 'workout' ? { exercises: raw } : { meals: raw }) }]
}

// ─── DbSearch ─────────────────────────────────────────────────────────────────
function DbSearch({ type, onAdd }) {
  const [query, setQuery] = useState('')
  const db      = type === 'workout' ? EXERCISES : MEALS
  const nameKey = type === 'workout' ? 'name' : 'meal_name'
  const results = query.trim() ? db.filter(i => i[nameKey].toLowerCase().includes(query.toLowerCase())).slice(0, 8) : []

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
        <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${type === 'workout' ? 'exercises' : 'meals'} from library…`}
          className="flex-1 bg-transparent text-xs text-gray-900 placeholder-indigo-300 outline-none" />
        {query && <button type="button" onClick={() => setQuery('')} className="text-indigo-300 hover:text-indigo-500 cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
      </div>
      {query.trim() && results.length === 0 && <p className="text-xs text-gray-400 px-3 py-1">No matches — add manually below</p>}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {results.map((item, i) => (
            <button key={i} type="button"
              onClick={() => { onAdd({ ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }); setQuery('') }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer text-left border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{item[nameKey]}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {type === 'workout' ? `${item.sets} sets · ${item.reps} reps · ${item.rest} rest` : `${item.calories} kcal · ${item.protein}g protein`}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg shrink-0">+ Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DayEditor — exercises or meals for one day ───────────────────────────────
function DayEditor({ type, day, onChange }) {
  const items   = type === 'workout' ? (day.exercises || []) : (day.meals || [])
  const itemKey = type === 'workout' ? 'exercises' : 'meals'
  const inputCls = 'px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full transition-all'

  const setItems = (fn) => onChange({ ...day, [itemKey]: fn(items) })
  const addItem  = (item) => setItems(r => [...r, item])
  const addEmpty = () => setItems(r => [...r, type === 'workout' ? emptyExercise() : emptyMeal()])
  const remove   = (i) => setItems(r => r.filter((_, idx) => idx !== i))
  const update   = (i, patch) => setItems(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))

  if (day.rest) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">Rest Day</p>
        <p className="text-xs text-gray-400 mt-1">Toggle off "Rest Day" above to add exercises</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <DbSearch type={type} onAdd={addItem} />

      {items.length > 0 && (
        <div className="space-y-1.5">
          <div className={`grid gap-1.5 px-1 ${type === 'workout' ? 'grid-cols-[1fr_44px_52px_52px_1fr_20px]' : 'grid-cols-[68px_1fr_1fr_48px_52px_20px]'}`}>
            {(type === 'workout' ? ['Exercise', 'Sets', 'Reps', 'Rest', 'Notes', ''] : ['Time', 'Meal', 'Items', 'Prot.g', 'Kcal', ''])
              .map(h => <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</span>)}
          </div>
          {type === 'workout'
            ? items.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_44px_52px_52px_1fr_20px] gap-1.5 items-center bg-gray-50 rounded-lg px-1.5 py-1">
                  <input value={row.name}  onChange={e => update(i, { name: e.target.value })}  placeholder="Exercise name" className={inputCls} />
                  <input value={row.sets}  onChange={e => update(i, { sets: e.target.value })}  placeholder="4"    className={inputCls} type="number" min="0" />
                  <input value={row.reps}  onChange={e => update(i, { reps: e.target.value })}  placeholder="8-12" className={inputCls} />
                  <input value={row.rest}  onChange={e => update(i, { rest: e.target.value })}  placeholder="60s"  className={inputCls} />
                  <input value={row.notes} onChange={e => update(i, { notes: e.target.value })} placeholder="Notes" className={inputCls} />
                  <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))
            : items.map((row, i) => (
                <div key={i} className="grid grid-cols-[68px_1fr_1fr_48px_52px_20px] gap-1.5 items-center bg-gray-50 rounded-lg px-1.5 py-1">
                  <input value={row.time}      onChange={e => update(i, { time: e.target.value })}      placeholder="7 AM"  className={inputCls} />
                  <input value={row.meal_name} onChange={e => update(i, { meal_name: e.target.value })} placeholder="Meal name" className={inputCls} />
                  <input value={row.items}     onChange={e => update(i, { items: e.target.value })}     placeholder="Items / ingredients" className={inputCls} />
                  <input value={row.protein}   onChange={e => update(i, { protein: e.target.value })}   placeholder="30"  className={inputCls} type="number" min="0" />
                  <input value={row.calories}  onChange={e => update(i, { calories: e.target.value })}  placeholder="400" className={inputCls} type="number" min="0" />
                  <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))
          }
        </div>
      )}

      <button type="button" onClick={addEmpty}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Add {type === 'workout' ? 'exercise' : 'meal'} manually
      </button>
    </div>
  )
}

// ─── TemplateForm (weekly) ────────────────────────────────────────────────────
function TemplateForm({ type, initial, onSave, onCancel }) {
  const [title, setTitle]             = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [days, setDays]               = useState(() => initial ? parseDays(initial, type) : defaultDays(type))
  const [activeDay, setActiveDay]     = useState(0) // 0-indexed
  const [error, setError]             = useState('')
  const [saving, setSaving]           = useState(false)

  const updateDay = (i, patch) => setDays(d => d.map((day, idx) => idx === i ? { ...day, ...patch } : day))

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    const activeDays = days.filter(d => !d.rest)
    const itemKey = type === 'workout' ? 'exercises' : 'meals'
    const nameKey = type === 'workout' ? 'name' : 'meal_name'
    if (activeDays.every(d => (d[itemKey] || []).length === 0)) {
      setError(`Add at least one ${type === 'workout' ? 'exercise' : 'meal'} to a non-rest day`); return
    }
    for (const d of activeDays) {
      if ((d[itemKey] || []).some(r => !r[nameKey]?.trim())) {
        setError(`All ${type === 'workout' ? 'exercises' : 'meals'} need a name`); return
      }
    }
    setError(''); setSaving(true)
    try {
      await onSave({ title: title.trim(), description, days })
    } catch (err) {
      setError(err.message || 'Failed to save')
      setSaving(false)
    }
  }

  const currentDay = days[activeDay]
  const itemKey    = type === 'workout' ? 'exercises' : 'meals'
  const totalItems = days.reduce((sum, d) => sum + (d[itemKey] || []).length, 0)

  return (
    <div className="space-y-5">
      {/* Title + description */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Template Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder={type === 'workout' ? 'e.g. 5-Day Strength Split' : 'e.g. High Protein Cut — Weekly'}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Description <span className="text-gray-300 font-normal normal-case">optional</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="Brief overview of the plan…"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all" />
        </div>
      </div>

      {/* Weekly day tabs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weekly Schedule</label>
          <span className="text-xs text-gray-400">{totalItems} {type === 'workout' ? 'exercises' : 'meals'} total</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d, i) => {
            const count = (d[itemKey] || []).length
            const isActive = activeDay === i
            return (
              <button key={i} type="button" onClick={() => setActiveDay(i)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border ${
                  isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' :
                  d.rest ? 'bg-gray-50 text-gray-400 border-gray-200' :
                  count > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'
                }`}>
                <span>{d.name.slice(0, 3)}</span>
                <span className={`text-[9px] mt-0.5 font-normal ${isActive ? 'text-indigo-200' : d.rest ? 'text-gray-300' : count > 0 ? 'text-indigo-400' : 'text-gray-300'}`}>
                  {d.rest ? 'Rest' : count > 0 ? `${count} ${type === 'workout' ? 'ex' : 'ml'}` : 'Empty'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Current day editor */}
      <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
        {/* Day header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Day Name</label>
            <input value={currentDay.name} onChange={e => updateDay(activeDay, { name: e.target.value })}
              placeholder="e.g. Chest & Triceps"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
          </div>
          <div className="shrink-0 pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => updateDay(activeDay, { rest: !currentDay.rest })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${currentDay.rest ? 'bg-gray-400' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${currentDay.rest ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-semibold text-gray-600">Rest Day</span>
            </label>
          </div>
        </div>

        {/* Exercises / meals for this day */}
        <DayEditor type={type} day={currentDay} onChange={d => updateDay(activeDay, d)} />
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex gap-3 pt-1 border-t border-gray-100">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
          {saving ? 'Saving…' : initial ? 'Update Template' : 'Create Template'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── AssignModal ──────────────────────────────────────────────────────────────
// Three-step flow:
//   1. pick     — search/pick a member; loads their active plans on select.
//   2. conflict — surfaced inline when the member already has an active plan
//                 of the same type; owner picks Replace or Add alongside.
//   3. customize — optional pre-assign editor (title + days + items) so the
//                  assigned copy can drift from the catalog template without
//                  mutating it.
function AssignModal({ template, planType, gymId, onClose, onAssigned }) {
  const itemKey  = planType === 'workout' ? 'exercises' : 'meals'
  const nameKey  = planType === 'workout' ? 'name'      : 'meal_name'
  const db       = planType === 'workout' ? EXERCISES   : MEALS
  const emptyItem = () => planType === 'workout'
    ? { name: '', sets: '', reps: '', rest: '' }
    : { time: '', meal_name: '', protein: '', calories: '' }
  const emptyDay = () => ({ name: '', rest: false, [itemKey]: [] })

  function templateToDays(t) {
    const src = t.exercises ?? t.meals ?? []
    return src.map(d => ({ ...d, [itemKey]: (d[itemKey] || []).map(i => ({ ...i })) }))
  }

  const [members, setMembers]       = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [query, setQuery]           = useState('')
  const [selected, setSelected]     = useState(null)
  const [memberPlans, setMemberPlans]       = useState([])
  const [loadingPlans, setLoadingPlans]     = useState(false)
  const [replaceId, setReplaceId]   = useState(null)
  const [step, setStep]             = useState('pick')        // 'pick' | 'customize'
  const [showConflict, setShowConflict] = useState(false)

  // Customize-step state
  const [customTitle, setCustomTitle]     = useState(template.title)
  const [days, setDays]                   = useState(templateToDays(template))
  const [activeDayIdx, setActiveDayIdx]   = useState(0)
  const [daySearch, setDaySearch]         = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetchMembers(gymId)
      .then(setMembers)
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoadingMembers(false))
  }, [gymId])

  const filtered = members.filter(m =>
    !query
      || m.name.toLowerCase().includes(query.toLowerCase())
      || (m.phone || '').includes(query)
  )

  const conflict = memberPlans.find(p => p.plan_type === planType)

  async function selectMember(m) {
    setSelected(m); setReplaceId(null); setShowConflict(false); setError('')
    setLoadingPlans(true)
    try {
      const plans = await fetchAssignedPlans(m.id)
      const active = (plans || []).filter(p => p.status === 'active')
      setMemberPlans(active)
      if (active.find(p => p.plan_type === planType)) setShowConflict(true)
    } catch { setMemberPlans([]) } finally {
      setLoadingPlans(false)
    }
  }

  async function doAssign(useCustom) {
    if (!selected) return
    setSaving(true); setError('')
    try {
      if (replaceId) await archiveAssignedPlan(replaceId)
      const payload = useCustom
        ? { ...template, title: customTitle.trim() || template.title, [itemKey]: days }
        : template
      await assignPlan({ gymId, memberId: selected.id, template: payload, planType })
      onAssigned(selected.name)
    } catch (err) {
      setError(err.message || 'Failed to assign plan')
      setSaving(false)
    }
  }

  // Customize-step helpers
  const safeIdx   = Math.min(activeDayIdx, Math.max(0, days.length - 1))
  const activeDay = days[safeIdx]
  const items     = activeDay?.[itemKey] || []
  const dbResults = daySearch.trim()
    ? db.filter(x => x[nameKey]?.toLowerCase().includes(daySearch.toLowerCase())).slice(0, 5)
    : []

  const addDay     = () => setDays(d => [...d, emptyDay()])
  const removeDay  = (di) => setDays(d => d.filter((_, i) => i !== di))
  const updateDay  = (di, patch) => setDays(d => d.map((day, i) => i === di ? { ...day, ...patch } : day))
  const addItem    = (di) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: [...(day[itemKey] || []), emptyItem()] }))
  const removeItem = (di, ii) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).filter((_, j) => j !== ii) }))
  const updateItem = (di, ii, patch) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).map((item, j) => j !== ii ? item : { ...item, ...patch }) }))
  const addFromDb  = (item) => {
    setDays(d => d.map((day, i) => i !== safeIdx ? day : {
      ...day,
      [itemKey]: [...(day[itemKey] || []), {
        ...item,
        sets: String(item.sets ?? ''),
        protein: String(item.protein ?? ''),
        calories: String(item.calories ?? ''),
      }],
    }))
    setDaySearch('')
  }

  const previewDays = template.exercises ?? template.meals ?? []
  const lightInput = 'px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full placeholder:text-gray-400 text-gray-900'

  return (
    <FormModal title={`Assign — ${template.title}`} onClose={onClose} wide>
      <div className="space-y-4">

        {/* ── Step 1: Pick member ── */}
        {step === 'pick' && (
          <>
            {/* Weekly preview mini-chart */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Weekly Plan Preview</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(previewDays.length, 7)}, minmax(0,1fr))` }}>
                {previewDays.map((d, i) => {
                  const count = (d[itemKey] || []).length
                  return (
                    <div key={i}
                      className={
                        'rounded-lg py-1.5 text-center border ' +
                        (d.rest ? 'bg-gray-100 border-gray-200'
                          : count > 0 ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-gray-100 border-dashed border-gray-200')
                      }
                    >
                      <p className="text-[10px] font-bold text-gray-400 m-0">{DAY_ABBR[i] || `D${i+1}`}</p>
                      {d.rest
                        ? <p className="text-[9px] text-gray-300 m-0 mt-0.5">Rest</p>
                        : <p className="text-[10px] font-bold text-indigo-600 m-0 mt-0.5">{count}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Member picker */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Assign to Member
              </label>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(null); setShowConflict(false); setReplaceId(null) }}
                  placeholder="Search member by name or phone…"
                  autoFocus
                  className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1">
                {loadingMembers ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No members found</p>
                ) : filtered.map(m => (
                  <button key={m.id} type="button" onClick={() => selectMember(m)}
                    className={
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer border transition-all ' +
                      (selected?.id === m.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50 border-transparent')
                    }>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                    </div>
                    {loadingPlans && selected?.id === m.id && (
                      <Loader2 size={14} className="text-indigo-500 animate-spin shrink-0" />
                    )}
                    {!loadingPlans && selected?.id === m.id && (
                      <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict warning */}
            {showConflict && selected && conflict && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3">
                <div className="flex items-start gap-2.5">
                  <TriangleAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 m-0">
                      {selected.name} already has a {planType} plan
                    </p>
                    <p className="text-xs text-amber-700 mt-1 m-0">
                      "{conflict.title}" is currently active
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setReplaceId(conflict.id); setShowConflict(false) }}
                    className="flex-1 py-2 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer hover:bg-amber-200 border border-amber-200">
                    Replace existing
                  </button>
                  <button type="button" onClick={() => { setReplaceId(null); setShowConflict(false) }}
                    className="flex-1 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer hover:bg-indigo-200 border border-indigo-200">
                    Add alongside
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            {/* Action buttons — hidden while the conflict warning awaits a choice */}
            {!showConflict && (
              <div className="flex gap-3 pt-1 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setStep('customize')}
                  disabled={!selected || loadingPlans}
                  className="flex-1 py-2.5 border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 disabled:opacity-40 cursor-pointer">
                  Customize & Assign
                </button>
                <button type="button" onClick={() => doAssign(false)}
                  disabled={!selected || saving || loadingPlans}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-all">
                  {saving
                    ? 'Assigning…'
                    : selected
                      ? (replaceId ? `Replace & Assign to ${selected.name}` : `Assign to ${selected.name}`)
                      : 'Select a member'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Customize ── */}
        {step === 'customize' && (
          <div className="space-y-3">
            {/* Title */}
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
              placeholder="Plan title"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />

            {/* Day tabs */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1 overflow-x-auto flex-1 pb-1 no-scrollbar">
                {days.map((d, di) => (
                  <button key={di} type="button" onClick={() => { setActiveDayIdx(di); setDaySearch('') }}
                    className={
                      'shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ' +
                      (di === safeIdx
                        ? 'bg-indigo-600 text-white'
                        : d.rest
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                    }>
                    {d.name?.trim() || DAY_ABBR[di] || `Day ${di + 1}`}
                    {d.rest && <span className="ml-1 opacity-60">·rest</span>}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { addDay(); setActiveDayIdx(days.length); setDaySearch('') }}
                title="Add day"
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200">
                <Plus size={14} />
              </button>
            </div>

            {/* Active day editor */}
            {activeDay && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Day {safeIdx + 1}</span>
                  <input
                    value={activeDay.name ?? ''}
                    onChange={e => updateDay(safeIdx, { name: e.target.value })}
                    placeholder={planType === 'workout' ? 'e.g. Push Day' : 'e.g. Monday'}
                    className="flex-1 text-[11px] font-semibold text-gray-700 bg-transparent border-none outline-none min-w-0"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!activeDay.rest}
                      onChange={e => updateDay(safeIdx, { rest: e.target.checked })}
                      className="accent-indigo-600 w-3 h-3" />
                    Rest day
                  </label>
                  <button type="button" onClick={() => { removeDay(safeIdx); setActiveDayIdx(Math.max(0, safeIdx - 1)) }}
                    className="text-gray-300 cursor-pointer hover:text-gray-500 p-0 flex shrink-0" title="Remove day">
                    <X size={14} />
                  </button>
                </div>

                {activeDay.rest ? (
                  <p className="text-xs text-gray-400 text-center py-6 m-0">Rest day — no activities scheduled</p>
                ) : (
                  <div className="p-3 flex flex-col gap-1.5">
                    {items.length > 0 && (
                      <div
                        className="grid gap-1 pl-0.5"
                        style={{ gridTemplateColumns: planType === 'workout' ? '1fr 38px 52px 48px 20px' : '56px 1fr 44px 48px 20px' }}
                      >
                        {(planType === 'workout' ? ['Exercise','Sets','Reps','Rest',''] : ['Time','Meal','Pro.','Cal','']).map(h => (
                          <span key={h} className="text-[10px] font-bold text-gray-400 uppercase">{h}</span>
                        ))}
                      </div>
                    )}

                    {planType === 'workout'
                      ? items.map((r, ii) => (
                          <div key={ii} className="grid gap-1 items-center" style={{ gridTemplateColumns: '1fr 38px 52px 48px 20px' }}>
                            <input value={r.name ?? ''} onChange={e => updateItem(safeIdx, ii, { name: e.target.value })} placeholder="Exercise" className={lightInput} />
                            <input value={r.sets ?? ''} onChange={e => updateItem(safeIdx, ii, { sets: e.target.value })} placeholder="4" type="number" className={lightInput} />
                            <input value={r.reps ?? ''} onChange={e => updateItem(safeIdx, ii, { reps: e.target.value })} placeholder="8-12" className={lightInput} />
                            <input value={r.rest ?? ''} onChange={e => updateItem(safeIdx, ii, { rest: e.target.value })} placeholder="60s" className={lightInput} />
                            <button type="button" onClick={() => removeItem(safeIdx, ii)} className="text-gray-300 hover:text-gray-500 cursor-pointer flex justify-center p-0">
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      : items.map((r, ii) => (
                          <div key={ii} className="grid gap-1 items-center" style={{ gridTemplateColumns: '56px 1fr 44px 48px 20px' }}>
                            <input value={r.time ?? ''} onChange={e => updateItem(safeIdx, ii, { time: e.target.value })} placeholder="8 AM" className={lightInput} />
                            <input value={r.meal_name ?? ''} onChange={e => updateItem(safeIdx, ii, { meal_name: e.target.value })} placeholder="Meal" className={lightInput} />
                            <input value={r.protein ?? ''} onChange={e => updateItem(safeIdx, ii, { protein: e.target.value })} placeholder="30g" type="number" className={lightInput} />
                            <input value={r.calories ?? ''} onChange={e => updateItem(safeIdx, ii, { calories: e.target.value })} placeholder="400" type="number" className={lightInput} />
                            <button type="button" onClick={() => removeItem(safeIdx, ii)} className="text-gray-300 hover:text-gray-500 cursor-pointer flex justify-center p-0">
                              <X size={13} />
                            </button>
                          </div>
                        ))
                    }

                    {/* Per-day DB search */}
                    <div className="mt-1">
                      <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={daySearch} onChange={e => setDaySearch(e.target.value)}
                          placeholder={`Search ${planType === 'workout' ? 'exercises' : 'meals'} to add…`}
                          className="w-full pl-8 pr-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      {dbResults.length > 0 && (
                        <div className="mt-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          {dbResults.map((item, i) => (
                            <button key={i} type="button" onMouseDown={() => addFromDb(item)}
                              className={
                                'w-full flex items-center gap-2 px-3 py-2 border-0 text-left cursor-pointer hover:bg-gray-50 ' +
                                (i < dbResults.length - 1 ? 'border-b border-gray-100' : '')
                              }>
                              <p className="text-xs font-semibold text-gray-800 flex-1 truncate m-0">{item[nameKey]}</p>
                              <p className="text-[10px] text-gray-400 shrink-0 m-0">
                                {planType === 'workout' ? `${item.sets}×${item.reps}` : `${item.calories}kcal`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={() => addItem(safeIdx)}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold cursor-pointer p-0 bg-transparent border-0 mt-0.5">
                      <Plus size={12} />
                      Add {planType === 'workout' ? 'exercise' : 'meal'} manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setStep('pick')}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer">
                Back
              </button>
              <button type="button" onClick={() => doAssign(true)} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {saving
                  ? 'Assigning…'
                  : replaceId
                    ? `Replace & Assign to ${selected?.name}`
                    : `Assign to ${selected?.name}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────
function TemplateCard({ template, type, onEdit, onDelete, onAssign, onDuplicate }) {
  const days    = (type === 'workout' ? template.exercises : template.meals) || []
  const itemKey = type === 'workout' ? 'exercises' : 'meals'
  const activeDays = days.filter(d => !d.rest)
  const totalItems = days.reduce((sum, d) => sum + (d[itemKey] || []).length, 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{template.title}</p>
          {template.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${type === 'workout' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {type === 'workout' ? 'Workout' : 'Diet'}
          </span>
          <button
            onClick={() => onDuplicate(template)}
            title="Duplicate as new template"
            className="p-1 rounded-md text-gray-500 hover:text-indigo-700 hover:bg-gray-100 cursor-pointer transition-colors flex items-center"
          >
            <Copy size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {activeDays.length} training day{activeDays.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          {totalItems} {type === 'workout' ? 'exercises' : 'meals'} total
        </span>
      </div>

      {/* Day breakdown */}
      <div className="space-y-1">
        {days.slice(0, 5).map((d, i) => {
          const count = (d[itemKey] || []).length
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0 text-[10px]">
                {d.name?.slice(0, 1) || d.day}
              </span>
              <span className="font-medium text-gray-700 truncate flex-1">{d.name || `Day ${d.day}`}</span>
              {d.rest
                ? <span className="text-gray-300 italic shrink-0">Rest</span>
                : <span className="text-gray-400 shrink-0">{count} {type === 'workout' ? 'ex' : 'ml'}</span>
              }
            </div>
          )
        })}
        {days.length > 5 && <p className="text-xs text-gray-400 pl-8">+{days.length - 5} more days</p>}
      </div>

      <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
        <button onClick={() => onAssign(template)} className="flex-1 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors">Assign</button>
        <button onClick={() => onEdit(template)} className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">Edit</button>
        <button onClick={() => onDelete(template)} className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors">Delete</button>
      </div>
    </div>
  )
}

// ─── ProgramsPage ─────────────────────────────────────────────────────────────
export default function ProgramsPage() {
  const { gymId } = useAuth()
  const dialog    = useDialog()

  const [activeTab, setActiveTab]             = useState('workout')
  const [workoutTemplates, setWorkout]        = useState([])
  const [dietTemplates, setDiet]              = useState([])
  const [loading, setLoading]                 = useState(true)
  const [showCreate, setShowCreate]           = useState(false)
  const [editingTemplate, setEditing]         = useState(null)
  const [assigningTemplate, setAssigning]     = useState(null)
  // Source template to fork from. When set, opens the create modal pre-filled
  // with the source's title (with " (Copy)" appended) + days. Save creates a
  // new row — the source is untouched.
  const [duplicatingTemplate, setDuplicating] = useState(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchWorkoutTemplates(gymId),
      fetchDietTemplates(gymId),
    ])
      .then(([w, d]) => { if (!cancelled) { setWorkout(w); setDiet(d) } })
      .catch(err => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  const templates = activeTab === 'workout' ? workoutTemplates : dietTemplates

  async function handleCreate({ title, description, days }) {
    // Programs are org-wide — every branch sees them. (See programsService.js)
    if (activeTab === 'workout') {
      const t = await createWorkoutTemplate({ gymId, title, description, days })
      setWorkout(prev => [t, ...prev])
    } else {
      const t = await createDietTemplate({ gymId, title, description, days })
      setDiet(prev => [t, ...prev])
    }
    setShowCreate(false)
  }

  async function handleUpdate({ title, description, days }) {
    if (activeTab === 'workout') {
      const t = await updateWorkoutTemplate(editingTemplate.id, { title, description, days })
      setWorkout(prev => prev.map(x => x.id === t.id ? t : x))
    } else {
      const t = await updateDietTemplate(editingTemplate.id, { title, description, days })
      setDiet(prev => prev.map(x => x.id === t.id ? t : x))
    }
    setEditing(null)
  }

  async function handleDelete(template) {
    if (!await dialog.confirm(`Delete "${template.title}"? This cannot be undone.`, 'Delete Template')) return
    if (activeTab === 'workout') {
      await deleteWorkoutTemplate(template.id)
      setWorkout(prev => prev.filter(x => x.id !== template.id))
    } else {
      await deleteDietTemplate(template.id)
      setDiet(prev => prev.filter(x => x.id !== template.id))
    }
  }

  if (loading) return <ProgramsSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <BannerSlot pageKey="programs" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create weekly workout and diet templates, then assign them to members.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          + New Template
        </button>
      </div>

      {/* Tabs — same pill style as Members/Filters */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { val: 'workout', label: 'Workouts',   count: workoutTemplates.length, Icon: Dumbbell },
          { val: 'diet',    label: 'Diet Plans', count: dietTemplates.length,    Icon: Utensils },
        ].map(({ val, label, count, Icon }) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              activeTab === val
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} className={activeTab === val ? 'text-indigo-600' : 'text-gray-400'} />
            {label}
            <span className="text-xs text-gray-400 font-normal">({count})</span>
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            {activeTab === 'workout'
              ? <Dumbbell size={22} className="text-indigo-500" strokeWidth={1.8} />
              : <Utensils size={22} className="text-indigo-500" strokeWidth={1.8} />
            }
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            No {activeTab === 'workout' ? 'workout' : 'diet'} templates yet
          </h3>
          <p className="text-sm text-gray-500">Create a weekly template and assign it to your members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id} template={t} type={activeTab}
              onEdit={setEditing} onDelete={handleDelete} onAssign={setAssigning}
              onDuplicate={tpl => setDuplicating({ ...tpl, title: `${tpl.title} (Copy)`, id: undefined })} />
          ))}
        </div>
      )}

      {showCreate && (
        <FormModal title={`New Weekly ${activeTab === 'workout' ? 'Workout' : 'Diet'} Template`} onClose={() => setShowCreate(false)} wide>
          <TemplateForm type={activeTab} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </FormModal>
      )}
      {editingTemplate && (
        <FormModal title="Edit Template" onClose={() => setEditing(null)} wide>
          <TemplateForm type={activeTab} initial={editingTemplate} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        </FormModal>
      )}
      {duplicatingTemplate && (
        <FormModal title="Duplicate Template" onClose={() => setDuplicating(null)} wide>
          <TemplateForm
            type={activeTab}
            initial={duplicatingTemplate}
            onSave={async (fields) => { await handleCreate(fields); setDuplicating(null) }}
            onCancel={() => setDuplicating(null)}
          />
        </FormModal>
      )}
      {assigningTemplate && (
        <AssignModal template={assigningTemplate} planType={activeTab} gymId={gymId}
          onClose={() => setAssigning(null)}
          onAssigned={async () => { setAssigning(null); await dialog.alert('Weekly plan assigned successfully.') }} />
      )}
    </div>
  )
}
