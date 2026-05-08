import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Salad, Moon, ChevronDown, Info, Loader2, Calendar } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { fetchMyMember, fetchMyActivePlans } from '../../services/memberService'

// Day 1 = Monday (JS getDay: 0=Sun,1=Mon,...6=Sat → map to 1-7)
function todayDayNumber() {
  const d = new Date().getDay()
  return d === 0 ? 7 : d // Sun→7, Mon→1 … Sat→6
}

function ExerciseRow({ row, i }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
        {i + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{row.name}</p>
        {row.notes && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '3px' }}>{row.notes}</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        {[['sets', row.sets], ['reps', row.reps], ['rest', row.rest]].filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 800, lineHeight: 1 }}>{val}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MealRow({ row, i }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
        {i + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          {row.time && <span style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '6px' }}>{row.time}</span>}
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{row.meal_name}</p>
        </div>
        {row.items && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '3px' }}>{row.items}</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        {[['prot', row.protein ? `${row.protein}g` : null], ['kcal', row.calories]].filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 800, lineHeight: 1 }}>{val}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeeklyPlanView({ plan }) {
  const isWorkout   = plan.plan_type === 'workout'
  const itemKey     = isWorkout ? 'exercises' : 'meals'
  const todayNum    = todayDayNumber()

  // Detect old flat-array format (items have no `day` property) and normalize
  const raw  = Array.isArray(plan.data) ? plan.data : []
  const days = raw.length > 0 && raw[0]?.day === undefined
    ? [{ day: 1, name: plan.title || 'Plan', rest: false, [itemKey]: raw }]
    : raw

  // Default active: today's day index, fallback to first non-rest day
  const defaultIdx  = (() => {
    const todayIdx = days.findIndex(d => d.day === todayNum)
    if (todayIdx >= 0) return todayIdx
    return days.findIndex(d => !d.rest) ?? 0
  })()
  const [activeIdx, setActiveIdx] = useState(defaultIdx)

  const activeDay  = days[activeIdx]
  const items      = activeDay ? (activeDay[itemKey] || []) : []
  const accent     = isWorkout ? { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.18)' } : { color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' }

  if (days.length === 0) return null

  return (
    <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent.border}` }}>
      {/* Plan header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isWorkout
            ? <Zap size={20} color={accent.color} strokeWidth={2} />
            : <Salad size={20} color={accent.color} strokeWidth={2} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{plan.title}</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '2px' }}>
            <span style={{ color: accent.color, fontWeight: 600 }}>{isWorkout ? 'Workout' : 'Diet'}</span>
            {' · '}{days.filter(d => !d.rest).length} {days.length > 1 ? 'training days' : 'day'}
          </p>
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ display: 'flex', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px' }}>
        {days.map((d, i) => {
          const isToday  = d.day === todayNum
          const isActive = activeIdx === i
          const count    = (d[itemKey] || []).length
          return (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 4px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                ...(isActive
                  ? { background: isWorkout ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.2)', color: accent.color }
                  : d.rest
                  ? { background: 'transparent', color: 'rgba(255,255,255,0.2)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
                ),
                outline: isToday ? `2px solid ${accent.color}` : 'none',
                outlineOffset: '1px',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{d.name?.slice(0, 3) || `D${d.day}`}</span>
              <span style={{ fontSize: '9px', marginTop: '2px', opacity: 0.7 }}>
                {isToday ? 'Today' : d.rest ? 'Rest' : `${count} ${isWorkout ? 'ex' : 'ml'}`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active day content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeDay?.rest ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', gap: '10px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={22} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '14px' }}>Rest Day</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '4px' }}>Focus on recovery, hydration and sleep</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No {isWorkout ? 'exercises' : 'meals'} for this day</p>
            </div>
          ) : (
            <div style={{ padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 4px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700 }}>{activeDay.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>{items.length} {isWorkout ? 'exercise' : 'meal'}{items.length !== 1 ? 's' : ''}</p>
              </div>
              {isWorkout
                ? items.map((r, i) => <ExerciseRow key={i} row={r} i={i} />)
                : items.map((r, i) => <MealRow key={i} row={r} i={i} />)
              }
              <div style={{ height: '4px' }} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function MemberWorkoutsPage() {
  const { gymId, profile } = useAuth()
  const [plans, setPlans]       = useState([])
  const [memberStatus, setMemberStatus] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!gymId || !profile) { setLoading(false); return }
    let dead = false
    fetchMyMember({ gymId, phone: profile.phone, email: profile.email })
      .then(async m => {
        if (!dead && m) setMemberStatus(m.status)
        return m ? fetchMyActivePlans(m.id) : []
      })
      .then(p => { if (!dead) setPlans(p) })
      .catch(e => console.error(e))
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [gymId, profile])

  const workouts = plans.filter(p => p.plan_type === 'workout')
  const diets    = plans.filter(p => p.plan_type === 'diet')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={36} color="#6366f1" style={{ animation: 'mspin .75s linear infinite' }} />
      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const isLocked = memberStatus === 'inactive' || memberStatus === 'expired' || memberStatus === 'pending_payment'

  if (isLocked) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', padding: '32px 24px', textAlign: 'center', gap: '16px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Calendar size={28} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '18px' }}>Plans locked</p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
          An active membership is required to access your workout and diet plans.
        </p>
      </div>
      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>My Plans</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '3px' }}>
          Weekly schedule assigned by your trainer
        </p>
      </motion.div>

      {plans.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={26} color="rgba(129,140,248,0.6)" strokeWidth={1.6} />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: '16px' }}>No plans assigned yet</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
              Your trainer will assign a weekly workout &amp; diet plan here.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)', width: '100%' }}>
            <Info size={16} color="rgba(129,140,248,0.6)" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.6 }}>
              Ask your trainer to assign a weekly plan from the trainer portal.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {workouts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Workout Plans</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workouts.map(p => <WeeklyPlanView key={p.id} plan={p} />)}
              </div>
            </motion.div>
          )}
          {diets.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: 'linear-gradient(180deg,#10b981,#34d399)' }} />
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Diet Plans</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {diets.map(p => <WeeklyPlanView key={p.id} plan={p} />)}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
