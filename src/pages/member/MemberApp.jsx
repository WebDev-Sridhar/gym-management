import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Flame, MapPin, Check, CreditCard,
  Zap, Salad, ChevronRight, Lightbulb, Droplets,
  AlertCircle, ClipboardList, CheckCircle2, Loader2, X,
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { fetchMyMember, selfCheckIn, fetchMyAttendance, fetchMyActivePlans } from '../../services/memberService'
import { fetchMyPendingPayment } from '../../services/memberPaymentService'
import { createPublicOrder, openPublicCheckout } from '../../services/publicCheckoutService'
import { supabaseData, supabaseAnon } from '../../services/supabaseClient'

function daysLeft(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StreakDot({ date, attendance }) {
  const ds = new Date(date).toISOString().split('T')[0]
  const hit = attendance.some(a => a.check_in.startsWith(ds))
  const today = ds === new Date().toISOString().split('T')[0]
  return (
    <div style={{
      width: '10px', height: '10px', borderRadius: '3px',
      background: hit ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : today ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
      border: today ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
    }} />
  )
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, type: 'spring', stiffness: 300, damping: 28 },
})

// ─── Renewal modal ────────────────────────────────────────────────────────────
function fmtDuration(days) {
  if (!days) return ''
  if (days < 30) return `${days} days`
  const m = Math.round(days / 30)
  if (m === 12) return '1 year'
  return `${m} month${m !== 1 ? 's' : ''}`
}

function PlanRow({ plan, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(plan.id)}
      style={{
        width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: '12px', border: 'none',
        background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'background 0.15s',
      }}>
      {/* Radio dot */}
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s' }}>
        {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '14px' }}>{plan.name}</p>
        {plan.duration_days && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '1px' }}>{fmtDuration(plan.duration_days)}</p>}
      </div>
      <p style={{ color: selected ? '#818cf8' : 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
        ₹{Number(plan.price).toLocaleString('en-IN')}
      </p>
    </button>
  )
}

function RenewModal({ member, gymSlug, gymName, plans, onClose, onSuccess }) {
  const isExpired    = member.status === 'expired'
  const currentPlan  = plans.find(p => p.id === member.plan?.id)
  const defaultId    = isExpired && currentPlan ? currentPlan.id : plans[0]?.id ?? null
  const [selectedId, setSelectedId] = useState(defaultId)
  const [showChange,  setShowChange] = useState(false)
  const [paying, setPaying]          = useState(false)
  const [error, setError]            = useState('')
  const listRef = useRef(null)
  const [listHeight, setListHeight]  = useState(0)

  useEffect(() => {
    if (listRef.current) setListHeight(listRef.current.scrollHeight)
  }, [plans.length])

  const selectedPlan = plans.find(p => p.id === selectedId)
  const otherPlans   = plans.filter(p => p.id !== selectedId)

  async function handlePay() {
    if (!selectedPlan || paying) return
    setPaying(true); setError('')
    try {
      const order = await createPublicOrder({ gymSlug, planId: selectedPlan.id, memberId: member.id })
      const result = await openPublicCheckout({
        orderId: order.orderId, amount: order.amount, currency: order.currency,
        razorpayKeyId: order.razorpayKeyId,
        gymName: order.gymName || gymName, planName: order.planName || selectedPlan.name,
        prefill: order.prefill, themeColor: '#6366f1',
      })
      onSuccess(result)
    } catch (err) {
      if (err.message !== 'checkout_dismissed') setError(err.message || 'Payment failed. Please try again.')
    } finally { setPaying(false) }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 38 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', background: '#0f1023', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isExpired ? 'Renew Membership' : 'Activate Membership'}
              </p>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginTop: '3px' }}>
                {isExpired ? 'Continue with your plan' : 'Choose a plan'}
              </p>
            </div>
            <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} color="rgba(255,255,255,0.5)" strokeWidth={2} />
            </button>
          </div>

          {plans.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
              No plans available. Contact your gym.
            </p>
          ) : isExpired ? (
            /* ── Expired: show selected plan + optional change ── */
            <>
              {/* Selected plan card */}
              {selectedPlan && (
                <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>{selectedPlan.name}</p>
                      {selectedPlan.duration_days && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{fmtDuration(selectedPlan.duration_days)}</p>}
                    </div>
                    <p style={{ color: '#818cf8', fontWeight: 800, fontSize: '20px' }}>₹{Number(selectedPlan.price).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}

              {/* Change plan toggle */}
              {plans.length > 1 && (
                <>
                  <button onClick={() => setShowChange(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 12px', fontFamily: 'inherit' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600 }}>Change plan</span>
                    <ChevronRight size={14} color="rgba(255,255,255,0.3)" strokeWidth={2}
                      style={{ transform: showChange ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                  <motion.div
                    animate={{ height: showChange ? listHeight : 0, opacity: showChange ? 1 : 0 }}
                    transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                    style={{ overflow: 'hidden', marginBottom: '12px' }}>
                    <div ref={listRef} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {otherPlans.map(plan => (
                          <PlanRow key={plan.id} plan={plan} selected={false}
                            onSelect={id => { setSelectedId(id); setShowChange(false) }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </>
          ) : (
            /* ── Inactive: compact scrollable plan list ── */
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {plans.map((plan, i) => (
                  <div key={plan.id} style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <PlanRow plan={plan} selected={plan.id === selectedId} onSelect={setSelectedId} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 600 }}>{error}</p>
            </div>
          )}

          {/* Pay button */}
          {plans.length > 0 && (
            <motion.button whileTap={{ scale: paying ? 1 : 0.97 }}
              onClick={handlePay} disabled={!selectedPlan || paying}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                background: paying || !selectedPlan ? 'rgba(99,102,241,0.25)' : '#6366f1',
                color: '#fff', fontSize: '15px', fontWeight: 800,
                cursor: paying || !selectedPlan ? 'default' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
              {paying
                ? <><Loader2 size={18} style={{ animation: 'mspin .75s linear infinite' }} />Processing…</>
                : <><CreditCard size={18} strokeWidth={2} />Pay ₹{selectedPlan ? Number(selectedPlan.price).toLocaleString('en-IN') : '—'}</>
              }
            </motion.button>
          )}

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '14px' }}>
            Secured by Razorpay · 100% safe & encrypted
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function MemberApp() {
  const { gymId, profile } = useAuth()
  const [member, setMember]             = useState(null)
  const [attendance, setAtt]            = useState([])
  const [plans, setPlans]               = useState([])
  const [pending, setPending]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState('')
  const [checkingIn, setCheckingIn]     = useState(false)
  const [checkedToday, setCheckedToday] = useState(false)
  const [justChecked, setJustChecked]   = useState(false)

  // Gym + renewal state
  const [gymSlug, setGymSlug]           = useState(null)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)
  const [gymName, setGymName]           = useState('')
  const [gymPlans, setGymPlans]         = useState([])
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewSuccess, setRenewSuccess] = useState(false)

  useEffect(() => {
    if (!gymId || !profile) { setLoading(false); return }
    let dead = false

    // Fetch gym info (slug, razorpay_enabled) and pricing plans in parallel
    supabaseData.from('gyms').select('slug, razorpay_enabled, name').eq('id', gymId).single()
      .then(({ data }) => { if (!dead && data) { setGymSlug(data.slug); setRazorpayEnabled(data.razorpay_enabled ?? false); setGymName(data.name || '') } })
      .catch(() => {})
    supabaseAnon.from('plans').select('id, name, price, duration_days').eq('gym_id', gymId).order('price')
      .then(({ data }) => { if (!dead && data) setGymPlans(data) })
      .catch(() => {})

    fetchMyMember({ gymId, phone: profile.phone, email: profile.email })
      .then(async m => {
        if (dead) return
        setMember(m)
        if (m) {
          const [att, pl, pay] = await Promise.all([
            fetchMyAttendance({ memberId: m.id, limit: 90 }),
            fetchMyActivePlans(m.id),
            fetchMyPendingPayment(m.id).catch(() => null),
          ])
          if (!dead) {
            setAtt(att); setPlans(pl); setPending(pay)
            setCheckedToday(att.some(a => a.check_in.startsWith(new Date().toISOString().split('T')[0])))
          }
        }
      })
      .catch(e => { console.error(e); setLoadError(e.message || 'Failed to load') })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [gymId, profile])

  async function doCheckIn() {
    if (!member || checkedToday || checkingIn) return
    setCheckingIn(true)
    try {
      await selfCheckIn({ gymId, memberId: member.id })
      setCheckedToday(true); setJustChecked(true)
      setAtt(p => [{ check_in: new Date().toISOString() }, ...p])
      setTimeout(() => setJustChecked(false), 4000)
    } catch (e) { console.error(e) }
    finally { setCheckingIn(false) }
  }

  function handleRenewSuccess(result) {
    setShowRenewModal(false)
    setRenewSuccess(true)
    setPending(null)
    if (result?.expiresAt) {
      setMember(m => m ? { ...m, status: 'active', expiry_date: result.expiresAt } : m)
    }
    setTimeout(() => setRenewSuccess(false), 5000)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '16px' }}>
      <Loader2 size={36} color="#6366f1" style={{ animation: 'mspin .75s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 500 }}>Loading your profile…</p>
      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!member) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', padding: '32px 24px', textAlign: 'center', gap: '14px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={28} color="#f59e0b" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ color: 'white', fontWeight: 800, fontSize: '18px' }}>Profile not found</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '6px', lineHeight: 1.6 }}>
          {loadError || "Your gym owner hasn't added your details yet. Contact them to get started."}
        </p>
      </div>
    </div>
  )

  const days = daysLeft(member.expiry_date)
  const expired  = member.status === 'expired'
  const expiring = !expired && days !== null && days <= 7 && days >= 0
  const needsAction = expired || expiring

  const streak = (() => {
    let n = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      if (attendance.some(a => a.check_in.startsWith(d.toISOString().split('T')[0]))) n++
      else if (i > 0) break
    }
    return n
  })()

  const monthCheckins = attendance.filter(a => {
    const d = new Date(a.check_in), n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const streakGrid = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (34 - i)); return d
  })

  const workout = plans.find(p => p.plan_type === 'workout')
  const diet    = plans.find(p => p.plan_type === 'diet')

  const inactive    = member.status === 'inactive' || member.status === 'pending_payment'
  const cardBg      = expired ? 'linear-gradient(145deg,#1c0a0a,#2a1010)' : expiring ? 'linear-gradient(145deg,#1c1500,#2a1f00)' : inactive ? 'linear-gradient(145deg,#111118,#18181f)' : 'linear-gradient(145deg,#0e1035,#16104a,#0e1035)'
  const accentColor = expired ? '#f87171' : expiring ? '#fbbf24' : inactive ? 'rgba(255,255,255,0.35)' : '#818cf8'
  const statusLabel = expired ? 'Expired' : expiring ? `${days}d left` : inactive ? 'Inactive' : 'Active'
  const statusBg    = expired ? 'rgba(239,68,68,0.15)' : expiring ? 'rgba(251,191,36,0.15)' : inactive ? 'rgba(255,255,255,0.06)' : 'rgba(129,140,248,0.15)'

  return (
    <>
      <div style={{ padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Greeting */}
        <motion.div {...fadeUp(0)}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>{greeting()},</p>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.6px', marginTop: '2px', lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {member.name.split(' ')[0]}
            <Dumbbell size={22} color="#818cf8" strokeWidth={2} />
          </h1>
        </motion.div>

        {/* Renewal success banner */}
        {renewSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)' }}>
            <CheckCircle2 size={20} color="#4ade80" strokeWidth={2} />
            <div>
              <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>Membership renewed!</p>
              <p style={{ color: 'rgba(74,222,128,0.6)', fontSize: '11px', marginTop: '1px' }}>Your membership is now active.</p>
            </div>
          </motion.div>
        )}

        {/* Pending payment banner */}
        {pending?.razorpay_link_url && (
          <motion.a href={pending.razorpay_link_url} target="_blank" rel="noopener noreferrer"
            {...fadeUp(0.05)} whileTap={{ scale: 0.98 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={18} color="#fbbf24" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '13px' }}>Payment pending — ₹{(pending.amount / 100).toLocaleString('en-IN')}</p>
              <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '11px', marginTop: '1px' }}>Tap to complete your renewal</p>
            </div>
            <ChevronRight size={16} color="rgba(251,191,36,0.5)" strokeWidth={2} />
          </motion.a>
        )}

        {/* Membership card */}
        <motion.div {...fadeUp(0.08)} style={{ position: 'relative', borderRadius: '24px', padding: '22px', background: cardBg, border: `1px solid ${accentColor}22`, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '140px', height: '140px', borderRadius: '50%', background: `${accentColor}0a`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '50%', width: '100px', height: '100px', borderRadius: '50%', background: `${accentColor}06`, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Member</p>
              <p style={{ color: '#fff', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.3px', marginTop: '3px' }}>{member.name}</p>
            </div>
            <span style={{ padding: '5px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: statusBg, color: accentColor, border: `1px solid ${accentColor}33`, letterSpacing: '0.3px' }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Plan', value: member.plan?.name || 'No plan' },
              member.expiry_date && { label: expired ? 'Expired' : 'Expires', value: new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) },
              !expired && days !== null && { label: 'Days Left', value: String(days) },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</p>
                <p style={{ color: label === 'Days Left' && days <= 7 ? accentColor : 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 700, marginTop: '3px' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Renewal CTA */}
          {(needsAction || inactive) && !pending?.razorpay_link_url && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${accentColor}18` }}>
              {(expired || inactive) && razorpayEnabled && gymSlug ? (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowRenewModal(true)}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
                    background: '#6366f1',
                    color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                  <CreditCard size={16} strokeWidth={2.2} />
                  {inactive ? 'Activate Membership' : 'Renew Membership Now'}
                </motion.button>
              ) : (
                <p style={{ color: accentColor, fontSize: '12px', fontWeight: 600, lineHeight: 1.55 }}>
                  {inactive
                    ? 'No active membership. Contact your gym to get started.'
                    : expired
                    ? 'Your membership has expired. Contact your gym to renew.'
                    : `Expiring in ${days} day${days !== 1 ? 's' : ''}. Contact your gym owner to renew.`}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Check-in */}
        <motion.div {...fadeUp(0.13)}>
          {(inactive || expired) ? (
            <div style={{ width: '100%', padding: '17px', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <MapPin size={20} color="rgba(255,255,255,0.15)" strokeWidth={2} />
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '15px', fontWeight: 700 }}>Check-in unavailable</span>
            </div>
          ) : (
            <motion.button onClick={doCheckIn} disabled={checkedToday || checkingIn}
              whileTap={checkedToday ? {} : { scale: 0.96 }}
              style={{
                width: '100%', padding: '17px', borderRadius: '20px', border: 'none',
                cursor: checkedToday ? 'default' : 'pointer', fontFamily: 'inherit',
                fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'box-shadow 0.3s',
                ...(checkedToday
                  ? { background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.25)', color: '#4ade80' }
                  : { background: '#6366f1', color: '#fff' }),
              }}>
              {checkingIn ? (
                <><Loader2 size={20} style={{ animation: 'mspin .75s linear infinite' }} />Checking in…</>
              ) : checkedToday ? (
                <><CheckCircle2 size={22} strokeWidth={2.5} />{justChecked ? "You're in! Keep it up" : 'Checked In Today'}</>
              ) : (
                <><MapPin size={21} strokeWidth={2} />Check In to Gym</>
              )}
            </motion.button>
          )}
          {!inactive && !expired && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '12px', fontWeight: 500, marginTop: '9px' }}>
              {monthCheckins} visit{monthCheckins !== 1 ? 's' : ''} this month
              {streak > 1 && (
                <span style={{ marginLeft: '8px', color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Flame size={13} color="#f97316" fill="#f97316" />
                  {streak}-day streak
                </span>
              )}
            </p>
          )}
        </motion.div>

        {/* Streak grid */}
        <motion.div {...fadeUp(0.18)} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '16px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Attendance Heatmap</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Last 35 days</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
            {streakGrid.map((d, i) => <StreakDot key={i} date={d} attendance={attendance} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Visited</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Missed</span>
            </div>
          </div>
        </motion.div>

        {/* Plans */}
        {(inactive || expired) ? (
          <motion.div {...fadeUp(0.22)} style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardList size={22} color="rgba(255,255,255,0.15)" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '14px' }}>Plans locked</p>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', marginTop: '3px' }}>Active membership required to access workout & diet plans.</p>
            </div>
          </motion.div>
        ) : (workout || diet) ? (
          <motion.div {...fadeUp(0.22)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>My Plans</p>
              <Link to="/member-app/workouts" style={{ color: '#818cf8', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workout && (
                <Link to="/member-app/workouts" style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)', textDecoration: 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={20} color="#818cf8" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workout.title}</p>
                    <p style={{ color: '#818cf8', fontSize: '12px', marginTop: '2px' }}>{Array.isArray(workout.data) ? workout.data.length : 0} training days</p>
                  </div>
                  <ChevronRight size={16} color="rgba(255,255,255,0.25)" strokeWidth={2} />
                </Link>
              )}
              {diet && (
                <Link to="/member-app/workouts" style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.14)', textDecoration: 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Salad size={20} color="#34d399" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{diet.title}</p>
                    <p style={{ color: '#34d399', fontSize: '12px', marginTop: '2px' }}>{Array.isArray(diet.data) ? diet.data.length : 0} days</p>
                  </div>
                  <ChevronRight size={16} color="rgba(255,255,255,0.25)" strokeWidth={2} />
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div {...fadeUp(0.22)} style={{ borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.08)', padding: '28px 16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ClipboardList size={24} color="rgba(129,140,248,0.7)" strokeWidth={1.8} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '14px' }}>No plans assigned yet</p>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '12px', marginTop: '5px', lineHeight: 1.5 }}>Your trainer will assign workout & diet plans here</p>
          </motion.div>
        )}

        {/* Recent check-ins */}
        {attendance.length > 0 && (
          <motion.div {...fadeUp(0.26)}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Recent Activity</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {attendance.slice(0, 5).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Check size={14} color="#818cf8" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', flex: 1 }}>
                    {new Date(a.check_in).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                    {new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tips */}
        <motion.div {...fadeUp(0.3)} style={{ borderRadius: '20px', background: 'linear-gradient(145deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06))', border: '1px solid rgba(99,102,241,0.12)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
            <Lightbulb size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Today's Tip</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Droplets size={16} color="#60a5fa" strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.6 }}>
              Stay hydrated — drink at least 3–4L of water on training days. Recovery starts with hydration.
            </p>
          </div>
        </motion.div>

        <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Renew modal — rendered outside the scroll container */}
      {showRenewModal && (
        <RenewModal
          member={member}
          gymSlug={gymSlug}
          gymName={gymName}
          plans={gymPlans}
          onClose={() => setShowRenewModal(false)}
          onSuccess={handleRenewSuccess}
        />
      )}
    </>
  )
}
