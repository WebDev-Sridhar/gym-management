import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { fetchTrainerStats, fetchAssignedMembers } from '../../services/trainerService'

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function memberStatus(m) {
  if (!m.plan_id) return { label: 'No Plan', cls: 'bg-gray-100 text-gray-500' }
  if (!m.expiry_date) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }
  return new Date(m.expiry_date) >= new Date()
    ? { label: 'Active', cls: 'bg-green-50 text-green-700' }
    : { label: 'Expired', cls: 'bg-red-50 text-red-700' }
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Welcome, {profile?.name?.split(' ')[0] || 'Trainer'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's how your members are doing today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Assigned Members" value={stats.totalMembers} color="bg-violet-50"
          icon={<svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
        />
        <StatCard label="Active Today" value={stats.activeToday} color="bg-green-50"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Active Plans" value={stats.plansAssigned} color="bg-blue-50"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/trainer-dashboard/members', color: 'bg-violet-50 group-hover:bg-violet-100', iconColor: 'text-violet-600', label: 'My Members', sub: 'View & manage', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { to: '/trainer-dashboard/workouts', color: 'bg-emerald-50 group-hover:bg-emerald-100', iconColor: 'text-emerald-600', label: 'Assign Plans', sub: 'Workouts & diets', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        ].map(({ to, color, iconColor, label, sub, icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-violet-200 hover:shadow-sm transition-all group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${color}`}>
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={icon}/></svg>
            </div>
            <div><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-xs text-gray-400">{sub}</p></div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Members</h2>
          <Link to="/trainer-dashboard/members" className="text-xs text-violet-600 font-medium hover:text-violet-800">View all →</Link>
        </div>
        {members.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500">No members assigned yet.</p>
            <p className="text-xs text-gray-400 mt-1">Ask your gym owner to assign members to you.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => {
              const st = memberStatus(m)
              const lastSeen = m.last_checkin
                ? new Date(m.last_checkin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Never'
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.plan?.name || 'No plan'} · Last seen {lastSeen}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
