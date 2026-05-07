import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import {
  fetchWorkoutTemplates, createWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate,
  fetchDietTemplates, createDietTemplate, updateDietTemplate, deleteDietTemplate,
  assignPlan,
} from '../../services/programsService'
import { fetchMembers } from '../../services/membershipService'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'

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
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
        <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${type === 'workout' ? 'exercises' : 'meals'} from library…`}
          className="flex-1 bg-transparent text-xs text-gray-700 placeholder-violet-300 outline-none" />
        {query && <button type="button" onClick={() => setQuery('')} className="text-violet-300 hover:text-violet-500 cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>}
      </div>
      {query.trim() && results.length === 0 && <p className="text-xs text-gray-400 px-3 py-1">No matches — add manually below</p>}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {results.map((item, i) => (
            <button key={i} type="button"
              onClick={() => { onAdd({ ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }); setQuery('') }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-50 cursor-pointer text-left border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{item[nameKey]}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {type === 'workout' ? `${item.sets} sets · ${item.reps} reps · ${item.rest} rest` : `${item.calories} kcal · ${item.protein}g protein`}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg shrink-0">+ Add</span>
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
  const inputCls = 'px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-violet-500 w-full transition-all'

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
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Description <span className="text-gray-300 font-normal normal-case">optional</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="Brief overview of the plan…"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 resize-none transition-all" />
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
                  isActive ? 'bg-violet-600 text-white border-violet-600 shadow-sm' :
                  d.rest ? 'bg-gray-50 text-gray-400 border-gray-200' :
                  count > 0 ? 'bg-violet-50 text-violet-700 border-violet-200' :
                  'bg-white text-gray-500 border-gray-200 hover:border-violet-200'
                }`}>
                <span>{d.name.slice(0, 3)}</span>
                <span className={`text-[9px] mt-0.5 font-normal ${isActive ? 'text-violet-200' : d.rest ? 'text-gray-300' : count > 0 ? 'text-violet-400' : 'text-gray-300'}`}>
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
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 transition-all" />
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
          className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
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
function AssignModal({ template, planType, gymId, onClose, onAssigned }) {
  const [members, setMembers]   = useState([])
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetchMembers(gymId).then(setMembers).catch(() => setError('Failed to load members')).finally(() => setLoading(false))
  }, [gymId])

  const filtered = members.filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()) || (m.phone || '').includes(query))
  const days     = template.exercises ?? template.meals ?? []
  const itemKey  = planType === 'workout' ? 'exercises' : 'meals'

  async function handleAssign() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      await assignPlan({ gymId, memberId: selected.id, template, planType })
      onAssigned()
    } catch (err) {
      setError(err.message || 'Failed to assign plan')
      setSaving(false)
    }
  }

  return (
    <FormModal title={`Assign — ${template.title}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Plan preview */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Weekly Schedule</p>
          {days.map((d, i) => {
            const count = (d[itemKey] || []).length
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-16 font-semibold text-gray-500 shrink-0">{d.name?.slice(0, 3) || `Day ${d.day}`}</span>
                {d.rest ? (
                  <span className="text-gray-300 italic">Rest day</span>
                ) : (
                  <span className="text-gray-600">{count} {planType === 'workout' ? 'exercise' : 'meal'}{count !== 1 ? 's' : ''}</span>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign to Member</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or phone…" autoFocus
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 transition-all" />
        </div>

        <div className="max-h-52 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No members found</p>
          ) : filtered.map(m => (
            <button key={m.id} type="button" onClick={() => setSelected(m)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer border transition-all ${selected?.id === m.id ? 'bg-violet-50 border-violet-200' : 'hover:bg-gray-50 border-transparent'}`}>
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
              </div>
              {selected?.id === m.id && <svg className="w-4 h-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={handleAssign} disabled={!selected || saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all">
            {saving ? 'Assigning…' : selected ? `Assign to ${selected.name}` : 'Select a member'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer">Cancel</button>
        </div>
      </div>
    </FormModal>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────
function TemplateCard({ template, type, onEdit, onDelete, onAssign }) {
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
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${type === 'workout' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {type === 'workout' ? 'Workout' : 'Diet'}
        </span>
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
        <button onClick={() => onAssign(template)} className="flex-1 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 cursor-pointer transition-colors">Assign</button>
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

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([fetchWorkoutTemplates(gymId), fetchDietTemplates(gymId)])
      .then(([w, d]) => { if (!cancelled) { setWorkout(w); setDiet(d) } })
      .catch(err => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  const templates = activeTab === 'workout' ? workoutTemplates : dietTemplates

  async function handleCreate({ title, description, days }) {
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Programs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create weekly workout and diet templates, then assign them to members.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 cursor-pointer shadow-sm shadow-violet-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Template
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[['workout', 'Workouts'], ['diet', 'Diet Plans']].map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${activeTab === val ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            <span className={`ml-2 text-xs font-normal ${activeTab === val ? 'text-violet-400' : 'text-gray-400'}`}>
              {val === 'workout' ? workoutTemplates.length : dietTemplates.length}
            </span>
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No {activeTab === 'workout' ? 'workout' : 'diet'} templates yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a weekly template and assign it to your members</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id} template={t} type={activeTab}
              onEdit={setEditing} onDelete={handleDelete} onAssign={setAssigning} />
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
      {assigningTemplate && (
        <AssignModal template={assigningTemplate} planType={activeTab} gymId={gymId}
          onClose={() => setAssigning(null)}
          onAssigned={async () => { setAssigning(null); await dialog.alert('Weekly plan assigned successfully.') }} />
      )}
    </div>
  )
}
