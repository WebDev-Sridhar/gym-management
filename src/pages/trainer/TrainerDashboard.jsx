import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { fetchTrainerStats, fetchAssignedMembers } from '../../services/trainerService'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function memberStatus(m) {
  if (!m.plan_id) return { label: 'No Plan', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' }
  if (!m.expiry_date) return { label: 'Inactive', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' }
  const expired = new Date(m.expiry_date) < new Date()
  if (expired) return { label: 'Expired', color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  const daysLeft = Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000)
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  return { label: 'Active', color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
}

export default function TrainerDashboard() {
  const { gymId, user, profile } = useAuth()
  const [stats, setStats]     = useState({ totalMembers: 0, activeToday: 0, plansAssigned: 0 })
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId || !user) { setLoading(false); return }
    let cancelled = false
    Promise.all([fetchTrainerStats(gymId, user.id), fetchAssignedMembers(gymId, user.id)])
      .then(([s, m]) => { if (!cancelled) { setStats(s); setMembers(m.slice(0, 6)) } })
      .catch(err => console.error('Trainer dashboard:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId, user])

  const firstName = profile?.name?.split(' ')[0] || 'Trainer'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(129,140,248,0.3)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const statCards = [
    { label: 'Members', value: stats.totalMembers, accent: '#818cf8', glow: 'rgba(129,140,248,0.15)', icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    )},
    { label: 'Active Today', value: stats.activeToday, accent: '#34d399', glow: 'rgba(52,211,153,0.15)', icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )},
    { label: 'Active Plans', value: stats.plansAssigned, accent: '#60a5fa', glow: 'rgba(96,165,250,0.15)', icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    )},
  ]

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 8 }}>

      {/* Hero greeting */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{
          position: 'absolute', top: -20, right: -16, width: 180, height: 180,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '0.2px' }}>
          {todayDate()}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.6px', lineHeight: 1.2, margin: 0 }}>
          {greeting()},<br />{firstName} 👋
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 500 }}>
          {stats.activeToday > 0
            ? `${stats.activeToday} member${stats.activeToday !== 1 ? 's' : ''} checked in today`
            : 'No check-ins yet today'}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {statCards.map(({ label, value, accent, glow, icon }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: glow,
              border: `1px solid ${accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent,
            }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f7', margin: 0, letterSpacing: '-0.5px' }}>{value}</p>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', margin: 0, marginTop: 1 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <Link to="/trainer-dashboard/members" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'rgba(129,140,248,0.06)',
            border: '1px solid rgba(129,140,248,0.18)',
            borderRadius: 20, padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'background 0.15s',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: 'rgba(129,140,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#818cf8',
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>My Members</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, marginTop: 2 }}>{stats.totalMembers} assigned</p>
            </div>
          </div>
        </Link>

        <Link to="/trainer-dashboard/workouts" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'rgba(52,211,153,0.05)',
            border: '1px solid rgba(52,211,153,0.16)',
            borderRadius: 20, padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'background 0.15s',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: 'rgba(52,211,153,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#34d399',
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Assign Plans</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, marginTop: 2 }}>Workouts & diets</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Members list */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 22,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Members</p>
          <Link to="/trainer-dashboard/members" style={{
            fontSize: 12, fontWeight: 600, color: '#818cf8', textDecoration: 'none',
          }}>See all →</Link>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'rgba(255,255,255,0.2)',
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No members assigned yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: '4px 0 0' }}>Ask your gym owner to assign members</p>
          </div>
        ) : (
          <div>
            {members.map((m, idx) => {
              const st = memberStatus(m)
              const lastSeen = m.last_checkin
                ? new Date(m.last_checkin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Never'
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: idx < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', shrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontWeight: 500 }}>
                      {m.plan?.name || 'No plan'} · {lastSeen}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: st.color, background: st.bg,
                    padding: '3px 9px', borderRadius: 20,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
