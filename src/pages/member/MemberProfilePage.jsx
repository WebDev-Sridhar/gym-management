import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, CreditCard, ChevronRight, AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useMemberData } from '../../store/MemberDataContext'
import ProfileSkeleton from '../../components/member/skeletons/ProfileSkeleton'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, type: 'spring', stiffness: 300, damping: 28 },
})

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent || 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 700 }}>{value || '—'}</span>
    </div>
  )
}

function StatBox({ value, label, accent }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p style={{ color: accent || '#818cf8', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{label}</p>
    </div>
  )
}

export default function MemberProfilePage() {
  const { profile, logout } = useAuth()
  const { member, attendance, pending, isLoading } = useMemberData()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } catch (e) { console.error(e); setLoggingOut(false) }
  }

  if (isLoading) return <ProfileSkeleton />

  // Force UTC interpretation — Supabase timestamps may lack 'Z' suffix
  function parseTS(ts) {
    if (!ts) return new Date(NaN)
    return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts + 'Z')
  }

  const safeAtt = attendance ?? []
  const now = new Date()
  const thisMonth = safeAtt.filter(a => { const d = parseTS(a.check_in); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length
  const lastMonth = safeAtt.filter(a => { const d = parseTS(a.check_in); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() }).length

  const streak = (() => {
    let n = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      if (safeAtt.some(a => parseTS(a.check_in).toLocaleDateString('en-CA') === d.toLocaleDateString('en-CA'))) n++
      else if (i > 0) break
    }
    return n
  })()

  const name = member?.name || profile?.name || 'Member'
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const expiry = member?.expiry_date ? new Date(member.expiry_date) : null
  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / 86400000) : null
  const expired = member?.status === 'expired'
  const expiring = !expired && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
  const needsRenewal = expired || expiring

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ textAlign: 'center', paddingBottom: '4px' }}>
        <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
          {initials}
        </div>
        <p style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.4px' }}>{name}</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '3px', fontWeight: 500 }}>
          {member?.plan?.name || 'No active plan'}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp(0.06)} style={{ display: 'flex', gap: '8px' }}>
        <StatBox value={thisMonth} label="This Month" accent="#818cf8" />
        <StatBox value={lastMonth} label="Last Month" accent="rgba(255,255,255,0.6)" />
        <StatBox value={streak > 0 ? streak : safeAtt.length} label={streak > 0 ? 'Day Streak' : 'Total Visits'} accent={streak > 1 ? '#f97316' : '#818cf8'} />
      </motion.div>

      {/* Pending payment */}
      {pending?.razorpay_link_url && (
        <motion.a
          href={pending.razorpay_link_url} target="_blank" rel="noopener noreferrer"
          {...fadeUp(0.1)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', textDecoration: 'none' }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={19} color="#fbbf24" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '14px' }}>Pay Now — ₹{(pending.amount / 100).toLocaleString('en-IN')}</p>
            <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '12px', marginTop: '1px' }}>{pending.plan?.name} · Tap to complete renewal</p>
          </div>
          <ChevronRight size={16} color="rgba(251,191,36,0.5)" strokeWidth={2} />
        </motion.a>
      )}

      {/* Renewal notice (no pending link) */}
      {needsRenewal && !pending && (
        <motion.div {...fadeUp(0.1)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: expired ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${expired ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
          {expired
            ? <AlertTriangle size={18} color="#f87171" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
            : <Clock size={18} color="#fbbf24" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
          }
          <div>
            <p style={{ color: expired ? '#f87171' : '#fbbf24', fontWeight: 700, fontSize: '14px' }}>
              {expired ? 'Membership Expired' : `Expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>Contact your gym owner to renew your membership.</p>
          </div>
        </motion.div>
      )}

      {/* Membership info */}
      <motion.div {...fadeUp(0.12)} style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '4px 16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '14px', paddingBottom: '4px' }}>Membership</p>
        <Row label="Plan" value={member?.plan?.name} />
        <Row label="Status" value={member?.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : null} accent={expired ? '#f87171' : expiring ? '#fbbf24' : '#4ade80'} />
        <Row label="Joined" value={member?.join_date ? new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
        <Row label="Expires" value={expiry ? expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} accent={expired ? '#f87171' : expiring ? '#fbbf24' : null} />
      </motion.div>

      {/* Contact info */}
      <motion.div {...fadeUp(0.16)} style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '4px 16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '14px', paddingBottom: '4px' }}>Contact</p>
        <Row label="Phone" value={member?.phone || profile?.phone} />
        <Row label="Email" value={member?.email || profile?.email} />
      </motion.div>

      {/* Trainer */}
      {member?.trainer && (
        <motion.div {...fadeUp(0.2)} style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>My Trainer</p>

          {/* Trainer info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: member.trainer.phone ? '14px' : '0' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
              {member.trainer.name?.charAt(0).toUpperCase() || 'T'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{member.trainer.name}</p>
              {member.trainer.email && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.trainer.email}
                </p>
              )}
            </div>
          </div>

          {/* Contact buttons — only if phone exists */}
          {member.trainer.phone && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={`tel:${member.trainer.phone}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', textDecoration: 'none', transition: 'all 0.2s' }}
              >
                {/* Phone icon */}
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
                </svg>
                <span style={{ color: '#818cf8', fontSize: '13px', fontWeight: 700 }}>Call</span>
              </a>

              <a
                href={`https://wa.me/${member.trainer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none', transition: 'all 0.2s' }}
              >
                {/* WhatsApp icon */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#25d366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span style={{ color: '#25d366', fontSize: '13px', fontWeight: 700 }}>WhatsApp</span>
              </a>
            </div>
          )}
        </motion.div>
      )}

      {/* Logout */}
      <motion.div {...fadeUp(0.24)}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ width: '100%', padding: '15px', borderRadius: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '14px', fontWeight: 700, cursor: loggingOut ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', opacity: loggingOut ? 0.6 : 1 }}
        >
          {loggingOut
            ? <><Loader2 size={16} style={{ animation: 'mspin .75s linear infinite' }} />Signing out…</>
            : <><LogOut size={17} strokeWidth={2} />Sign Out</>
          }
        </button>
      </motion.div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', paddingBottom: '4px' }}>
        Powered by Gymmobius
      </p>

      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
