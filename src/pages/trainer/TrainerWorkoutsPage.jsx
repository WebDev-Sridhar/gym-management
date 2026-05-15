import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useTrainerData } from '../../store/TrainerDataContext'
import {
  assignPlanToMember, fetchMemberAssignedPlans, archiveMemberPlan,
} from '../../services/trainerService'
import WorkoutsSkeleton from '../../components/trainer/skeletons/WorkoutsSkeleton'
import { EXERCISES } from '../../data/exercisesDb'
import { MEALS } from '../../data/mealsDb'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import { TriangleAlert, X, Plus, Search, Check, Clock, Loader2 } from 'lucide-react'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const inputCls = 'px-2 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs outline-none focus:border-indigo-500/60 w-full placeholder:text-white/25'

function AssignModal({ template, planType, members, gymId, onClose, onAssigned }) {
  const dialog = useDialog()
  const itemKey  = planType === 'workout' ? 'exercises' : 'meals'
  const db       = planType === 'workout' ? EXERCISES : MEALS
  const nameKey  = planType === 'workout' ? 'name' : 'meal_name'
  const emptyItem = () => planType === 'workout'
    ? { name: '', sets: '', reps: '', rest: '' }
    : { time: '', meal_name: '', protein: '', calories: '' }
  const emptyDay = () => ({ name: '', rest: false, [itemKey]: [] })

  function templateToDays(t) {
    const src = t.exercises ?? t.meals ?? []
    return src.map(d => ({ ...d, [itemKey]: (d[itemKey] || []).map(i => ({ ...i })) }))
  }

  const [step, setStep]               = useState('pick-member')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected]       = useState(null)
  const [memberPlans, setMemberPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [replaceId, setReplaceId]     = useState(null)
  const [days, setDays]               = useState(templateToDays(template))
  const [customTitle, setCustomTitle] = useState(template.title)
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [daySearch, setDaySearch]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

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

  const addDay     = () => setDays(d => [...d, emptyDay()])
  const removeDay  = (di) => setDays(d => d.filter((_, i) => i !== di))
  const updateDay  = (di, patch) => setDays(d => d.map((day, i) => i === di ? { ...day, ...patch } : day))
  const addItem    = (di) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: [...(day[itemKey] || []), emptyItem()] }))
  const removeItem = (di, ii) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).filter((_, j) => j !== ii) }))
  const updateItem = (di, ii, patch) => setDays(d => d.map((day, i) => i !== di ? day : { ...day, [itemKey]: (day[itemKey] || []).map((item, j) => j !== ii ? item : { ...item, ...patch }) }))
  const addFromDb  = (item) => {
    setDays(d => d.map((day, i) => i !== safeIdx ? day : { ...day, [itemKey]: [...(day[itemKey] || []), { ...item, sets: String(item.sets ?? ''), protein: String(item.protein ?? ''), calories: String(item.calories ?? '') }] }))
    setDaySearch('')
  }

  const safeIdx   = Math.min(activeDayIdx, Math.max(0, days.length - 1))
  const activeDay = days[safeIdx]
  const items     = activeDay?.[itemKey] || []
  const dbResults = daySearch.trim()
    ? db.filter(x => x[nameKey].toLowerCase().includes(daySearch.toLowerCase())).slice(0, 5)
    : []

  return (
    <FormModal title={`Assign — ${template.title}`} onClose={onClose} wide dark>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Step 1: Pick member / conflict ── */}
        {(step === 'pick-member' || step === 'conflict') && (
          <>
            {/* Weekly preview mini-chart */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Weekly Plan Preview</p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(templateDays.length, 7)}, 1fr)`, gap: 4 }}>
                {templateDays.map((d, i) => {
                  const count = (d[itemKey] || []).length
                  return (
                    <div key={i} style={{
                      borderRadius: 10, padding: '6px 4px', textAlign: 'center',
                      background: d.rest ? 'rgba(255,255,255,0.03)' : count > 0 ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.03)',
                      border: d.rest ? '1px solid rgba(255,255,255,0.06)' : count > 0 ? '1px solid rgba(129,140,248,0.25)' : '1px dashed rgba(255,255,255,0.1)',
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{DAY_ABBR[i] || `D${i+1}`}</p>
                      {d.rest
                        ? <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '2px 0 0' }}>Rest</p>
                        : <p style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', margin: '2px 0 0' }}>{count}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Member picker */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Assign to Member
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  value={memberSearch}
                  onChange={e => { setMemberSearch(e.target.value); setSelected(null); setStep('pick-member') }}
                  placeholder="Search member…"
                  autoFocus
                  style={{
                    width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.length === 0
                  ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>No members</p>
                  : filtered.map(m => (
                    <button key={m.id} onClick={() => selectMember(m)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 12, textAlign: 'left', cursor: 'pointer', border: 'none',
                      background: selected?.id === m.id ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)',
                      outline: selected?.id === m.id ? '1px solid rgba(129,140,248,0.3)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: '#fff',
                      }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{m.name}</p>
                      {loadingPlans && selected?.id === m.id && (
                        <Loader2 size={14} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      )}
                      {selected?.id === m.id && !loadingPlans && (
                        <Check size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Conflict warning */}
            {step === 'conflict' && selected && (() => {
              const conflict = memberPlans.find(p => p.plan_type === planType)
              return conflict ? (
                <div style={{
                  borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)',
                  background: 'rgba(251,191,36,0.08)', padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <TriangleAlert size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', margin: 0 }}>
                        {selected.name} already has a {planType} plan
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.65)', margin: '3px 0 0' }}>
                        "{conflict.title}" is currently active
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setReplaceId(conflict.id); setStep('pick-member') }} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 12, fontWeight: 700,
                    }}>
                      Replace existing
                    </button>
                    <button onClick={() => { setReplaceId(null); setStep('pick-member') }} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'rgba(129,140,248,0.2)', color: '#818cf8', fontSize: 12, fontWeight: 700,
                    }}>
                      Add alongside
                    </button>
                  </div>
                </div>
              ) : null
            })()}

            {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>}

            {step !== 'conflict' && (
              <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => setStep('customize')} disabled={!selected || loadingPlans} style={{
                  flex: 1, padding: '11px 0', border: '1px solid rgba(129,140,248,0.3)',
                  borderRadius: 12, background: 'transparent', color: '#818cf8',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!selected || loadingPlans) ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}>
                  Customize & Assign
                </button>
                <button onClick={doAssign} disabled={saving || !selected || loadingPlans} style={{
                  flex: 1, padding: '11px 0', border: 'none', borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: (saving || !selected || loadingPlans) ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}>
                  {saving ? 'Assigning…' : selected ? `Assign to ${selected.name}` : 'Select a member'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Customize ── */}
        {step === 'customize' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Title */}
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} style={{
              width: '100%', padding: '10px 14px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff',
              outline: 'none', fontFamily: 'inherit',
            }} />

            {/* Day tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="trainer-day-tabs" style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
                {days.map((d, di) => (
                  <button key={di} onClick={() => { setActiveDayIdx(di); setDaySearch('') }} style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 10, border: 'none',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: di === safeIdx ? '#818cf8' : d.rest ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
                    color: di === safeIdx ? '#fff' : d.rest ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                    {d.name?.trim() || DAY_ABBR[di] || `Day ${di + 1}`}
                    {d.rest && <span style={{ marginLeft: 4, opacity: 0.6 }}>·rest</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => { addDay(); setActiveDayIdx(days.length); setDaySearch('') }} style={{
                flexShrink: 0, padding: '6px 10px', borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Add day">
                <Plus size={14} />
              </button>
            </div>

            {/* Active day editor */}
            {activeDay && (
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                {/* Day meta row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Day {safeIdx + 1}</span>
                  <input
                    value={activeDay.name ?? ''}
                    onChange={e => updateDay(safeIdx, { name: e.target.value })}
                    placeholder={planType === 'workout' ? 'e.g. Push Day' : 'e.g. Monday'}
                    style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#f5f5f7', background: 'transparent', border: 'none', outline: 'none', minWidth: 0, fontFamily: 'inherit' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={!!activeDay.rest} onChange={e => updateDay(safeIdx, { rest: e.target.checked })} style={{ accentColor: '#818cf8', width: 11, height: 11 }} />
                    Rest day
                  </label>
                  <button onClick={() => { removeDay(safeIdx); setActiveDayIdx(Math.max(0, safeIdx - 1)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 0, display: 'flex', flexShrink: 0 }} title="Remove day">
                    <X size={14} />
                  </button>
                </div>

                {activeDay.rest ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', margin: 0 }}>Rest day — no activities scheduled</p>
                ) : (
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.length > 0 && (
                      <div style={{ display: 'grid', gap: 4, paddingLeft: 2, gridTemplateColumns: planType === 'workout' ? '1fr 38px 52px 48px 20px' : '56px 1fr 44px 48px 20px' }}>
                        {(planType === 'workout' ? ['Exercise','Sets','Reps','Rest',''] : ['Time','Meal','Pro.','Cal','']).map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{h}</span>
                        ))}
                      </div>
                    )}

                    {planType === 'workout'
                      ? items.map((r, ii) => (
                          <div key={ii} style={{ display: 'grid', gridTemplateColumns: '1fr 38px 52px 48px 20px', gap: 4, alignItems: 'center' }}>
                            <input value={r.name ?? ''} onChange={e => updateItem(safeIdx, ii, { name: e.target.value })} placeholder="Exercise" className={inputCls} />
                            <input value={r.sets ?? ''} onChange={e => updateItem(safeIdx, ii, { sets: e.target.value })} placeholder="4" type="number" className={inputCls} />
                            <input value={r.reps ?? ''} onChange={e => updateItem(safeIdx, ii, { reps: e.target.value })} placeholder="8-12" className={inputCls} />
                            <input value={r.rest ?? ''} onChange={e => updateItem(safeIdx, ii, { rest: e.target.value })} placeholder="60s" className={inputCls} />
                            <button onClick={() => removeItem(safeIdx, ii)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 0, display: 'flex', justifyContent: 'center' }}>
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
                            <button onClick={() => removeItem(safeIdx, ii)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 0, display: 'flex', justifyContent: 'center' }}>
                              <X size={13} />
                            </button>
                          </div>
                        ))
                    }

                    {/* Per-day search */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                        <input value={daySearch} onChange={e => setDaySearch(e.target.value)}
                          placeholder={`Search ${planType === 'workout' ? 'exercises' : 'meals'} to add…`}
                          style={{
                            width: '100%', paddingLeft: 28, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                            background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)',
                            borderRadius: 10, fontSize: 12, color: '#fff', outline: 'none',
                            boxSizing: 'border-box', fontFamily: 'inherit',
                          }} />
                      </div>
                      {dbResults.length > 0 && (
                        <div style={{
                          marginTop: 2,
                          background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10, overflow: 'hidden',
                        }}>
                          {dbResults.map((item, i) => (
                            <button key={i} type="button" onMouseDown={() => addFromDb(item)} style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                              padding: '9px 12px', border: 'none', borderBottom: i < dbResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                              background: 'transparent', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#f5f5f7', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item[nameKey]}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0, margin: 0 }}>
                                {planType === 'workout' ? `${item.sets}×${item.reps}` : `${item.calories}kcal`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button onClick={() => addItem(safeIdx)} style={{
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#818cf8',
                      background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit',
                    }}>
                      <Plus size={12} />
                      Add {planType === 'workout' ? 'exercise' : 'meal'} manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={doAssign} disabled={saving} style={{
                flex: 1, padding: '11px 0', border: 'none', borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit',
              }}>
                {saving ? 'Assigning…' : replaceId ? `Replace & Assign to ${selected?.name}` : `Assign to ${selected?.name}`}
              </button>
              <button onClick={() => setStep('pick-member')} style={{
                padding: '11px 18px', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, background: 'transparent', color: 'rgba(255,255,255,0.5)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
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
  const itemKey   = planType === 'workout' ? 'exercises' : 'meals'
  const days      = (template.exercises ?? template.meals) || []
  const [activeIdx, setActiveIdx] = useState(0)
  const safeIdx   = Math.min(activeIdx, Math.max(0, days.length - 1))
  const activeDay = days[safeIdx]
  const items     = activeDay?.[itemKey] || []

  return (
    <FormModal title={template.title} onClose={onClose} wide dark>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Summary bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px',
          fontSize: 12, color: 'rgba(255,255,255,0.4)',
        }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            background: planType === 'workout' ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.12)',
            color: planType === 'workout' ? '#818cf8' : '#34d399',
          }}>
            {planType === 'workout' ? 'Workout' : 'Diet'}
          </span>
          <span>{days.filter(d => !d.rest).length} training days</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{days.reduce((s, d) => s + (d[itemKey] || []).length, 0)} {planType === 'workout' ? 'exercises' : 'meals'} total</span>
        </div>

        {/* Day tabs */}
        <div className="trainer-day-tabs" style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => setActiveIdx(i)} style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 10, border: 'none',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: i === safeIdx ? '#818cf8' : d.rest ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
              color: i === safeIdx ? '#fff' : d.rest ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {d.name?.trim() || DAY_ABBR[i] || `Day ${i + 1}`}
              {d.rest && <span style={{ marginLeft: 4, opacity: 0.6 }}>·rest</span>}
            </button>
          ))}
        </div>

        {/* Active day content */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                Day {safeIdx + 1}{activeDay?.name ? ` — ${activeDay.name}` : ''}
              </p>
              {activeDay?.rest && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>Rest day</p>}
            </div>
            {!activeDay?.rest && items.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {items.length} {planType === 'workout' ? 'exercise' : 'meal'}{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {activeDay?.rest ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
              <Clock size={32} strokeWidth={1.5} />
              <p style={{ fontSize: 12, margin: 0 }}>Rest day — no activities scheduled</p>
            </div>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0', margin: 0 }}>No items added for this day</p>
          ) : planType === 'workout' ? (
            <div>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 56px 52px', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.02)' }}>
                {['Exercise', 'Sets', 'Reps', 'Rest'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {items.map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 44px 56px 52px', gap: 8, padding: '10px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{r.name || '—'}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.sets || '—'}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.reps || '—'}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.rest || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 52px 56px', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.02)' }}>
                {['Time', 'Meal', 'Protein', 'Calories'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {items.map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 52px 56px', gap: 8, padding: '10px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.time || '—'}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{r.meal_name || '—'}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.protein ? `${r.protein}g` : '—'}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.calories ? `${r.calories} kcal` : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, background: 'transparent', color: 'rgba(255,255,255,0.5)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Close
        </button>
      </div>
    </FormModal>
  )
}

export default function TrainerWorkoutsPage() {
  const { gymId } = useAuth()
  const { members, wTemplates, dTemplates, loadTemplates } = useTrainerData()
  const dialog = useDialog()
  const [tab, setTab]             = useState('workout')
  const [assigning, setAssigning] = useState(null)
  const [viewing, setViewing]     = useState(null)

  useEffect(() => { loadTemplates() }, [loadTemplates])

  if (wTemplates === null || dTemplates === null || members === null) return <WorkoutsSkeleton />

  const templates = tab === 'workout' ? wTemplates : dTemplates
  const itemKey   = tab === 'workout' ? 'exercises' : 'meals'

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
            transition: 'all 0.15s', fontFamily: 'inherit',
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
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    View
                  </button>
                  <button onClick={() => setAssigning(t)} style={{
                    flex: 1, padding: '9px 0', border: 'none',
                    borderRadius: 12, background: '#818cf8', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
