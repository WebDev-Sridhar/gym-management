import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, RefreshCw } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useOwnerDashboard } from '../../hooks/useOwnerDashboard'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'
import ActionCenter from '../../components/dashboard/ActionCenter'
import TodaySnapshot from '../../components/dashboard/TodaySnapshot'
import MoneyPanel from '../../components/dashboard/MoneyPanel'
import MembershipHealth from '../../components/dashboard/MembershipHealth'
import AttendanceHealth from '../../components/dashboard/AttendanceHealth'
import GhostIntelligence from '../../components/dashboard/GhostIntelligence'
import AutomationIntelligence from '../../components/dashboard/AutomationIntelligence'
import QuickActions from '../../components/dashboard/QuickActions'
import DashboardMemberDrawer from '../../components/dashboard/DashboardMemberDrawer'
import { Sk } from '../../components/ui/Skeleton'

// ─── P1 redesign — the "triage core" of OWNER_DASHBOARD_REDESIGN.md ───────────
// Decision-first ordering: Alert → Action Center → Today → Money → Quick Actions.
// Membership/Attendance/Ghost/Automation/Subscription health sections (P2/P3)
// land next, fed by the same useOwnerDashboard snapshot.

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function updatedAgo(ts) {
  if (!ts) return ''
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={26} w={200} /><Sk h={14} w={160} /></div>
        <Sk h={36} w={120} r={10} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Sk h={18} w={180} />
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5">
            <Sk h={36} w={36} r={10} />
            <div className="flex-1 space-y-1.5"><Sk h={14} w="55%" /><Sk h={11} w="35%" /></div>
            <Sk h={34} w={84} r={8} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-6">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="space-y-2"><Sk h={12} w="70%" /><Sk h={24} w="55%" /></div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Sk h={18} w={120} />
        <div className="flex gap-4">{Array(3).fill(0).map((_, i) => <div key={i} className="flex-1 space-y-2"><Sk h={12} w="60%" /><Sk h={28} w="80%" /></div>)}</div>
        <Sk h={8} r={99} />
      </div>
    </div>
  )
}

export default function OwnerDashboard() {
  const { subscription, profile, gymId } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refreshing, refresh, lastUpdated } = useOwnerDashboard()
  const [drawerMemberId, setDrawerMemberId] = useState(null)

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null
  const daysLeft  = expiresAt ? Math.max(0, Math.floor((expiresAt - new Date()) / 86400000)) : null
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7

  if (loading && !data) return <DashboardSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-24 sm:pb-0">

      {/* 0. Alert strip — subscription expiring */}
      {isExpiringSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-amber-800">
            Your subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — renew to keep access.
          </p>
          <button onClick={() => navigate('/owner-dashboard/subscription')}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors cursor-pointer shrink-0">
            Renew Now
          </button>
        </div>
      )}

      {/* Contextual onboarding / activation banner.
          No context passed — BannerSlot self-fetches the legacy gym+stats
          snapshot its predicates expect (totalMembers / trainerCount / etc.). */}
      <BannerSlot pageKey="dashboard" />

      {/* 1. Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors cursor-pointer shrink-0 disabled:cursor-default"
          title="Refresh data"
        >
          <RefreshCw size={13} className={(loading || refreshing) ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">
            {refreshing ? 'Refreshing…' : lastUpdated ? `Updated ${updatedAgo(lastUpdated)}` : 'Refresh'}
          </span>
        </button>
      </div>

      {error && !data ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Clock size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Couldn't load your dashboard.</p>
          <button onClick={refresh} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">Try again</button>
        </div>
      ) : (
        <>
          {/* 2. Action Center */}
          <ActionCenter items={data?.actions || []} urgentCount={data?.urgentCount || 0} />

          {/* 3. Today's Snapshot */}
          <TodaySnapshot today={data?.today} />

          {/* 4. Money */}
          <MoneyPanel money={data?.money} membership={data?.membership} />

          {/* 5 + 6. Membership Health | Attendance Health */}
          <div className="grid lg:grid-cols-2 gap-6">
            <MembershipHealth membership={data?.membership} />
            <AttendanceHealth attendance={data?.attendance} />
          </div>

          {/* 7. Ghost Member Intelligence */}
          <GhostIntelligence ghosts={data?.ghosts} onViewMember={setDrawerMemberId} />

          {/* 8. Automation Intelligence (WhatsApp headroom folded in) */}
          <AutomationIntelligence automation={data?.automation} quota={data?.quota} />

          {/* 10. Quick Actions (sticky bottom bar on mobile) */}
          <QuickActions />
        </>
      )}

      {/* Member drawer — opened in place from At-risk "View" */}
      {drawerMemberId && (
        <DashboardMemberDrawer
          memberId={drawerMemberId}
          gymId={gymId}
          onClose={() => setDrawerMemberId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
