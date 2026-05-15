import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useTrainerData } from '../../store/TrainerDataContext'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import {
  fetchMemberAttendance, fetchMemberAssignedPlans,
  assignPlanToMember, archiveMemberPlan,
} from '../../services/trainerService'
import MembersSkeleton from '../../components/trainer/skeletons/MembersSkeleton'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'
import {
  TriangleAlert, X, Plus, Search, Check, ChevronDown, ChevronUp,
  Dumbbell, Salad, Loader2, CircleCheck,
} from 'lucide-react'

// ─── Plan customise + assign modal ───────────────────────────────────────────
function AssignPlanModal({ member, gymId, activePlans = [], editingPlan = null, onClose, onAssigned }) {
  const existingActive = activePlans.filter(p => p.status === 'active' && p.id !== editingPlan?.id)
  const initialTab  = editingPlan?.plan_type || 'workout'
  const initialStep = editingPlan ? 'edit' : existingActive.length > 0 ? 'overview' : 'pick'

  const [tab, setTab]               = useState(initialTab)
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

  const { wTemplates, dTemplates, loadTemplates } = useTrainerData()

  useEffect(() => {
    if (step !== 'pick' && step !== 'edit') return
    loadTemplates()
  }, [step, loadTemplates])

  // Derive templates from context (null while loading → empty list)
  const templates = tab === 'workout' ? (wTemplates ?? []) : (dTemplates ?? [])

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

  const inputCls = 'px-2 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs outline-none focus:border-indigo-500/60 w-full placeholder:text-white/25'

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
    <FormModal title={editingPlan ? `Edit Plan — ${member.name}` : `Assign Plan — ${member.name}`} onClose={onClose} wide dark>

      {/* ── Overview ── */}
      {step === 'overview' && (
        <div className="space-y-4">
          <div style={{ borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.07)', padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TriangleAlert size={13} style={{ flexShrink: 0 }} />
              {member.name} already has active plans
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {existingActive.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.plan_type === 'workout' ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)', color: p.plan_type === 'workout' ? '#818cf8' : '#34d399' }}>
                    {p.plan_type === 'workout' ? <Dumbbell size={14} strokeWidth={2} /> : <Salad size={14} strokeWidth={2} />}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f5f5f7', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <button onClick={() => { setReplaceIds([p.id]); setTab(p.plan_type); setStep('pick') }}
                    style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                    Replace
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { setReplaceIds([]); setStep('pick') }}
            style={{ width: '100%', padding: '11px', background: '#818cf8', border: 'none', borderRadius: 14, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={15} /> Add New Plan
          </button>
        </div>
      )}

      {/* Type tabs */}
      {(step === 'pick' || step === 'edit') && !editingPlan && (
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 4 }}>
          {[['workout', 'Workout'], ['diet', 'Diet']].map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setStep('pick'); setRows([]); setTitle('') }}
              style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', background: tab === v ? '#818cf8' : 'transparent', color: tab === v ? '#fff' : 'rgba(255,255,255,0.38)' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Template picker */}
      {step === 'pick' && (
        <div className="space-y-3">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select a template</p>
          {templates.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>No {tab} templates in this gym yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {templates.map(t => (
                <button key={t.id} onClick={() => pickTemplate(t)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                      {tab === 'workout' ? `${t.exercises?.length ?? 0} days` : `${t.meals?.length ?? 0} days`}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>Use →</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setTitle(''); setRows([]); setStep('edit') }}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#f5f5f7', outline: 'none', boxSizing: 'border-box' }} />

            {/* Day tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="trainer-day-tabs" style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
                {days.map((d, di) => (
                  <button key={di} onClick={() => { setActiveDayIdx(di); setDaySearch('') }}
                    style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 0.15s',
                      background: di === safeIdx ? '#818cf8' : d.rest ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
                      color: di === safeIdx ? '#fff' : d.rest ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.55)',
                    }}>
                    {d.name?.trim() || `Day ${di + 1}`}
                    {d.rest && <span style={{ opacity: 0.5, marginLeft: 3 }}>·rest</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => { addDay(); setActiveDayIdx(days.length); setDaySearch('') }}
                style={{ flexShrink: 0, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                title="Add day">
                <Plus size={14} />
              </button>
            </div>

            {/* Active day editor */}
            {activeDay && (
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                {/* Day meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Day {safeIdx + 1}</span>
                  <input value={activeDay.name ?? ''} onChange={e => updateDay(safeIdx, { name: e.target.value })}
                    placeholder={tab === 'workout' ? 'e.g. Push Day' : 'e.g. Monday'}
                    style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#f5f5f7', background: 'transparent', border: 'none', outline: 'none', minWidth: 0 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.38)', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
                    <input type="checkbox" checked={!!activeDay.rest} onChange={e => updateDay(safeIdx, { rest: e.target.checked })} style={{ accentColor: '#818cf8', width: 12, height: 12 }} />
                    Rest
                  </label>
                  <button onClick={() => { removeDay(safeIdx); setActiveDayIdx(Math.max(0, safeIdx - 1)) }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', flexShrink: 0, padding: 2 }} title="Remove day">
                    <X size={14} />
                  </button>
                </div>

                {activeDay.rest ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', textAlign: 'center', padding: '24px 0' }}>Rest day — no exercises scheduled</p>
                ) : (
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.length > 0 && (
                      <div style={{ display: 'grid', gap: 4, paddingLeft: 4, gridTemplateColumns: tab === 'workout' ? '1fr 38px 52px 48px 20px' : '56px 1fr 44px 48px 20px' }}>
                        {(tab === 'workout' ? ['Exercise','Sets','Reps','Rest',''] : ['Time','Meal','Pro.','Cal','']).map(h => (
                          <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                        ))}
                      </div>
                    )}
                    {tab === 'workout'
                      ? items.map((r, ii) => (
                          <div key={ii} style={{ display: 'grid', gridTemplateColumns: '1fr 38px 52px 48px 20px', gap: 4, alignItems: 'center' }}>
                            <input value={r.name ?? ''} onChange={e => updateItem(safeIdx, ii, { name: e.target.value })} placeholder="Exercise" className={inputCls} />
                            <input value={r.sets ?? ''} onChange={e => updateItem(safeIdx, ii, { sets: e.target.value })} placeholder="4" type="number" className={inputCls} />
                            <input value={r.reps ?? ''} onChange={e => updateItem(safeIdx, ii, { reps: e.target.value })} placeholder="8-12" className={inputCls} />
                            <input value={r.rest ?? ''} onChange={e => updateItem(safeIdx, ii, { rest: e.target.value })} placeholder="60s" className={inputCls} />
                            <button onClick={() => removeItem(safeIdx, ii)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: 0 }}>
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      : items.map((r, ii) => (
                          <div key={ii} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 44px 48px 20px', gap: 4, alignItems: 'center' }}>
                            <input value={r.time ?? ''} onChange={e => updateItem(safeIdx, ii, { time: e.target.value })} placeholder="8 AM" className={inputCls} />
                            <input value={r.meal_name ?? ''} onChange={e => updateItem(safeIdx, ii, { meal_name: e.target.value })} placeholder="Meal" className={inputCls} />
                            <input value={r.protein ?? ''} onChange={e => updateItem(safeIdx, ii, { protein: e.target.value })} placeholder="30g" type="number" className={inputCls} />
                            <input value={r.calories ?? ''} onChange={e => updateItem(safeIdx, ii, { calories: e.target.value })} placeholder="400" type="number" className={inputCls} />
                            <button onClick={() => removeItem(safeIdx, ii)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: 0 }}>
                              <X size={13} />
                            </button>
                          </div>
                        ))
                    }
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 10 }}>
                        <Search size={13} style={{ color: 'rgba(129,140,248,0.6)', flexShrink: 0 }} />
                        <input value={daySearch} onChange={e => setDaySearch(e.target.value)}
                          placeholder={`Search ${tab === 'workout' ? 'exercises' : 'meals'}…`}
                          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#f5f5f7' }} />
                      </div>
                      {dbResults.length > 0 && (
                        <div style={{ marginTop: 4, background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                          {dbResults.map((item, i) => (
                            <button key={i} type="button" onMouseDown={() => addFromDb(item)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', borderBottom: i < dbResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', textAlign: 'left', cursor: 'pointer' }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#f5f5f7', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item[nameKey]}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0, margin: 0 }}>
                                {tab === 'workout' ? `${item.sets}×${item.reps}` : `${item.calories}kcal`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => addItem(safeIdx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Plus size={12} /> Add {tab === 'workout' ? 'exercise' : 'meal'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editingPlan ? 'Save Changes' : replaceIds.length > 0 ? 'Replace & Assign' : `Assign to ${member.name}`}
              </button>
              {!editingPlan && (
                <button onClick={() => setStep(existingActive.length > 0 ? 'overview' : 'pick')}
                  style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
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
function parseTS(ts) {
  if (!ts) return new Date(NaN)
  return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts + 'Z')
}

function MemberDetailPanel({ member, gymId, onClose, onPlanAssigned }) {
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
    const d = parseTS(a.check_in)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

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
            <Loader2 size={22} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'plans' ? (
          activePlans.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', margin: 0 }}>No active plans. Tap + Plan to assign one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activePlans.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.plan_type === 'workout' ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)', color: p.plan_type === 'workout' ? '#818cf8' : '#34d399' }}>
                    {p.plan_type === 'workout' ? <Dumbbell size={16} strokeWidth={2} /> : <Salad size={16} strokeWidth={2} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                      {Array.isArray(p.data) ? p.data.length : 0} days
                    </p>
                  </div>
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
                    {parseTS(a.check_in).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 0 auto' }}>
                    {parseTS(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
          onAssigned={() => { setAssigning(false); setEditingPlan(null); loadData(); onPlanAssigned?.() }}
        />
      )}
    </div>
  )
}

// ─── TrainerMembersPage ───────────────────────────────────────────────────────
export default function TrainerMembersPage() {
  const { gymId } = useAuth()
  const { members, refreshMembers } = useTrainerData()
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)

  if (members === null) return <MembersSkeleton />

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
                {isSelected && <MemberDetailPanel member={m} gymId={gymId} onClose={() => setSelectedMember(null)} onPlanAssigned={refreshMembers} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
