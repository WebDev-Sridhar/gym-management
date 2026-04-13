import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchDashboardStats, fetchRecentActivity } from '../../services/membershipService'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function OwnerDashboard() {
  const { gymId, subscription } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null
  const daysLeft = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : null
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7

  useEffect(() => {
    if (!gymId) { setLoading(false); return }

    let cancelled = false
    setLoading(true)

    Promise.all([fetchDashboardStats(gymId), fetchRecentActivity(gymId)])
      .then(([s, a]) => {
        if (cancelled) return
        setStats(s)
        setActivities(a)
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId])

  // Refetch on tab focus
  useEffect(() => {
    if (!gymId) return
    const onFocus = () => {
      Promise.all([fetchDashboardStats(gymId), fetchRecentActivity(gymId)])
        .then(([s, a]) => { setStats(s); setActivities(a) })
        .catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [gymId])

  function formatRevenue(amount) {
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `\u20B9${(amount / 1000).toFixed(1)}K`
    return `\u20B9${amount}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Members', value: stats.totalMembers, icon: 'members' },
    { label: 'Active Members', value: stats.activeMembers, icon: 'active' },
    { label: 'Revenue', value: formatRevenue(stats.totalRevenue), icon: 'revenue' },
    { label: 'Expiring Soon', value: stats.expiringSoon, icon: 'expiring' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Subscription warning banner */}
      {isExpiringSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Your subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Renew now to avoid losing access to your dashboard.
            </p>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
          >
            Renew Now
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                stat.icon === 'members' ? 'bg-violet-50' :
                stat.icon === 'active' ? 'bg-green-50' :
                stat.icon === 'revenue' ? 'bg-blue-50' : 'bg-amber-50'
              }`}>
                {stat.icon === 'members' && (
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {stat.icon === 'active' && (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {stat.icon === 'revenue' && (
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {stat.icon === 'expiring' && (
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No recent activity yet. Add members and start collecting payments!</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      activity.type === 'checkin' ? 'bg-green-400' :
                      activity.type === 'payment' ? 'bg-blue-400' :
                      activity.type === 'new' ? 'bg-violet-400' : 'bg-amber-400'
                    }`} />
                    <span className="text-sm text-gray-700">{activity.text}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">{timeAgo(activity.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription status card */}
          {subscription && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Subscription</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="text-sm font-semibold text-gray-900">{subscription.plan_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.status === 'active' ? 'bg-green-50 text-green-700' :
                    subscription.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>
                {expiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Expires</span>
                    <span className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-gray-700'}`}>
                      {expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/billing')}
                className="w-full mt-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer"
              >
                Manage Subscription
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/owner-dashboard/members')}
                className="w-full py-2.5 px-4 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer"
              >
                Add Member
              </button>
              <button
                onClick={() => navigate('/owner-dashboard/payments')}
                className="w-full py-2.5 px-4 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer"
              >
                Collect Payment
              </button>
              <button
                onClick={() => navigate('/owner-dashboard/checkin')}
                className="w-full py-2.5 px-4 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer"
              >
                Mark Attendance
              </button>
              <button
                onClick={() => navigate('/owner-dashboard/analytics')}
                className="w-full py-2.5 px-4 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer"
              >
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
