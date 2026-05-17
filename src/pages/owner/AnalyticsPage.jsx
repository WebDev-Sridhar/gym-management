import { useState, useEffect, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import MemberDrawer from '../../components/ui/MemberDrawer'
import { useAuth } from '../../store/AuthContext'
import {
  fetchRevenueAnalytics,
  fetchMembershipAnalytics,
  fetchAttendanceAnalytics,
  fetchInactiveMembers,
  fetchPaymentInsights,
} from '../../services/analyticsService'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  IndianRupee, Users, TrendingUp, TrendingDown, Activity,
  UserCheck, AlertTriangle, RefreshCw, Download, Clock,
  Zap, Eye, Target, BarChart3, ShieldAlert,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { label: 'Today', days: 0 },
  { label: '7D',    days: 7 },
  { label: '30D',   days: 30 },
  { label: '90D',   days: 90 },
  { label: '1Y',    days: 365 },
]

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4']
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toYYYYMMDD(d) { return d.toISOString().substring(0, 10) }

function getDateRange(days) {
  const end   = new Date()
  const start = days === 0 ? new Date() : new Date(Date.now() - days * 86400000)
  return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(end) }
}

function formatRupee(v) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v}`
}

function formatRelDate(iso) {
  if (!iso) return 'Never'
  const s = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ h = '100%', w = '100%', r = 10 }) {
  return (
    <div className="skeleton-shimmer" style={{ height: h, width: w, borderRadius: r }} />
  )
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <Sk h={12} w="60%" /><Sk h={28} w="80%" /><Sk h={24} />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6"><Sk h={240} /></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6"><Sk h={240} /></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[0,1].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-6"><Sk h={200} /></div>)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6"><Sk h={100} /></div>
      <div className="bg-white rounded-xl border border-gray-200 p-6"><Sk h={200} /></div>
    </div>
  )
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function RupeeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{formatRupee(p.value)}</p>)}
    </div>
  )
}

function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.value}</p>)}
    </div>
  )
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

const MiniSparkline = memo(function MiniSparkline({ data, color = '#6366f1' }) {
  if (!data?.length) return null
  return (
    <BarChart width={80} height={24} data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
      <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
    </BarChart>
  )
})

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ pct }) {
  if (pct === null || pct === undefined || isNaN(pct)) return null
  const up = pct >= 0
  return (
    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard = memo(function KPICard({ label, value, sub, Icon, iconBg, iconColor, trend, sparkData, sparkColor, warning }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex flex-col gap-2 ${warning ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={15} className={iconColor} strokeWidth={1.9} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {trend !== undefined && <TrendBadge pct={trend} />}
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
        {sparkData && <MiniSparkline data={sparkData} color={sparkColor} />}
      </div>
    </div>
  )
})

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function EmptyChart({ message = 'No data for this period' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2">
      <BarChart3 size={32} className="text-gray-200" strokeWidth={1.5} />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

// ─── Smart Insights ───────────────────────────────────────────────────────────

function generateInsights(revenue, membership, attend, inactive, payIns) {
  const insights = []

  if (revenue) {
    const months = Object.entries(revenue.byMonth).sort(([a], [b]) => a.localeCompare(b))
    if (months.length >= 2) {
      const prev = months[months.length - 2][1]
      const curr = months[months.length - 1][1]
      if (prev > 0) {
        const pct = ((curr - prev) / prev) * 100
        insights.push(pct >= 0
          ? { type: 'positive', Icon: TrendingUp,  text: `Revenue grew ${pct.toFixed(0)}% vs last month (${formatRupee(curr)} vs ${formatRupee(prev)}).` }
          : { type: 'warning',  Icon: TrendingDown, text: `Revenue dropped ${Math.abs(pct).toFixed(0)}% vs last month. Consider running a promotion.` }
        )
      }
    }
  }

  if (inactive) {
    const high = inactive.filter(m => m.riskLevel === 'high').length
    insights.push(high > 0
      ? { type: 'warning',  Icon: ShieldAlert, text: `${high} member${high > 1 ? 's are' : ' is'} at high churn risk — expired or inactive 30+ days.` }
      : { type: 'positive', Icon: UserCheck,   text: 'No high-risk churn detected. Member retention looks healthy.' }
    )
  }

  if (attend?.total > 0 && attend.busiestHour !== undefined) {
    const h = attend.busiestHour
    const dow = DOW_LABELS[attend.busiestDow] || ''
    insights.push({ type: 'info', Icon: Zap, text: `Peak gym hour is ${h}:00–${h + 1}:00.${dow ? ` ${dow}s are the busiest day.` : ''}` })
  }

  if (payIns?.revenueByPlan?.length > 0) {
    const top = payIns.revenueByPlan[0]
    insights.push({ type: 'info', Icon: Target, text: `"${top.planName}" generates the most revenue — ${formatRupee(top.revenue)} from ${top.count} payment${top.count !== 1 ? 's' : ''}.` })
  }

  if (membership) {
    const rate = membership.totalMembers > 0
      ? ((membership.statusCounts.active / membership.totalMembers) * 100).toFixed(1)
      : 0
    insights.push(Number(rate) >= 60
      ? { type: 'positive', Icon: UserCheck,     text: `${rate}% of members are active — strong retention.` }
      : { type: 'warning',  Icon: AlertTriangle, text: `Only ${rate}% of members are active. Focus on re-engagement.` }
    )
  }

  if (membership?.expiringSoon > 0) {
    insights.push({ type: 'warning', Icon: Clock, text: `${membership.expiringSoon} membership${membership.expiringSoon !== 1 ? 's' : ''} expire within 7 days. Send renewal reminders now.` })
  }

  return insights.slice(0, 6)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const navigate  = useNavigate()
  const { gymId } = useAuth()

  const [range,      setRange]      = useState(30)
  const [drawerMember, setDrawerMember] = useState(null)
  const [revenue,    setRevenue]    = useState(null)
  const [membership, setMembership] = useState(null)
  const [attend,     setAttend]     = useState(null)
  const [inactive,   setInactive]   = useState(null)
  const [payIns,     setPayIns]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [spinning,   setSpinning]   = useState(false)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const { startDate, endDate } = getDateRange(range)

    Promise.all([
      fetchRevenueAnalytics(gymId, startDate, endDate),
      fetchMembershipAnalytics(gymId, startDate, endDate),
      fetchAttendanceAnalytics(gymId, startDate, endDate),
      fetchInactiveMembers(gymId),
      fetchPaymentInsights(gymId, startDate, endDate),
    ]).then(([r, m, a, i, p]) => {
      if (cancelled) return
      setRevenue(r); setMembership(m); setAttend(a); setInactive(i); setPayIns(p)
    }).catch(err => console.error('Analytics load error:', err))
      .finally(() => { if (!cancelled) { setLoading(false); setSpinning(false) } })

    return () => { cancelled = true }
  }, [gymId, range, refreshKey])

  function handleRefresh() { setSpinning(true); setRefreshKey(k => k + 1) }

  function handleExport() {
    if (!revenue?.byMonth) return
    const rows = [['Month', 'Revenue (INR)'], ...Object.entries(revenue.byMonth).sort()]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `analytics-${range}d-${toYYYYMMDD(new Date())}.csv`
    a.click()
  }

  // ── Derived chart data ────────────────────────────────────────────────────────

  const revenueAreaData = useMemo(() => {
    if (!revenue?.byMonth) return []
    return Object.entries(revenue.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => {
        const [y, m] = month.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        return { label, value }
      })
  }, [revenue])

  const payMethodData = useMemo(() => {
    if (!revenue?.byMethod) return []
    return Object.entries(revenue.byMethod)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  }, [revenue])

  const memberGrowthData = useMemo(() => {
    if (!membership?.byMonth) return []
    return Object.entries(membership.byMonth)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, value]) => {
        const [y, m] = month.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short' })
        return { label, value }
      })
  }, [membership])

  const planDistData = useMemo(() =>
    membership?.planDistribution?.map(p => ({ name: p.name, value: p.count })) || []
  , [membership])

  const dailyAttendData = useMemo(() => {
    if (!attend?.byDay) return []
    return Object.entries(attend.byDay)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-30)
      .map(([date, value]) => {
        const d = new Date(date + 'T00:00:00')
        return { label: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), value }
      })
  }, [attend])

  const dowData = useMemo(() => {
    if (!attend?.byDow) return []
    const max = Math.max(...attend.byDow)
    return attend.byDow.map((value, i) => ({ label: DOW_LABELS[i], value, isBusiest: value === max && max > 0 }))
  }, [attend])

  const revenueSparkData = useMemo(() =>
    Object.entries(revenue?.byMonth || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => ({ v }))
  , [revenue])

  const attendSparkData = useMemo(() =>
    Object.entries(attend?.byDay || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([, v]) => ({ v }))
  , [attend])

  const memberSparkData = useMemo(() =>
    Object.entries(membership?.byMonth || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => ({ v }))
  , [membership])

  const insights = useMemo(() =>
    generateInsights(revenue, membership, attend, inactive, payIns)
  , [revenue, membership, attend, inactive, payIns])

  const retentionRate = useMemo(() => {
    if (!membership?.totalMembers) return 0
    return (membership.statusCounts.active / membership.totalMembers) * 100
  }, [membership])

  const heatmapMax = useMemo(() => attend ? Math.max(...attend.byHour, 1) : 1, [attend])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track revenue, retention, attendance, and gym performance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {RANGES.map(({ label, days }) => (
              <button
                key={label}
                onClick={() => setRange(days)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  range === days ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download size={13} strokeWidth={2} />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} strokeWidth={2} className={spinning ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? <SkeletonDashboard /> : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard label="Total Revenue"       value={formatRupee(revenue?.total || 0)}                       sub="collected in period"  Icon={IndianRupee} iconBg="bg-indigo-50"  iconColor="text-indigo-600" sparkData={revenueSparkData} sparkColor="#6366f1" />
            <KPICard label="Active Members"       value={membership?.statusCounts?.active ?? 0}                  sub={`of ${membership?.totalMembers ?? 0} total`} Icon={Users}       iconBg="bg-green-50"   iconColor="text-green-600" />
            <KPICard label="Retention Rate"       value={`${retentionRate.toFixed(1)}%`}                        sub="active / total"       Icon={UserCheck}   iconBg="bg-blue-50"    iconColor="text-blue-600" />
            <KPICard label="Avg Daily Check-ins"  value={(attend?.avgPerDay || 0).toFixed(1)}                   sub={`${attend?.total || 0} total visits`} Icon={Activity} iconBg="bg-indigo-50"  iconColor="text-indigo-600" sparkData={attendSparkData} sparkColor="#6366f1" />
            <KPICard label="New Members"          value={membership?.newInRange ?? 0}                           sub="joined in period"     Icon={TrendingUp}  iconBg="bg-emerald-50" iconColor="text-emerald-600" sparkData={memberSparkData} sparkColor="#10b981" />
            <KPICard label="Expiring Soon"        value={membership?.expiringSoon ?? 0}                         sub="within 7 days"        Icon={Clock}       iconBg="bg-amber-50"   iconColor="text-amber-600" warning={membership?.expiringSoon > 0} />
          </div>

          {/* ── Revenue ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
                <p className="text-xs text-gray-500 mt-0.5">Monthly collected payments</p>
              </div>
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-center gap-6 mb-5">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatRupee(revenue?.total || 0)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total collected</p>
                  </div>
                  <div className="h-10 w-px bg-gray-100" />
                  <div>
                    <p className="text-base font-semibold text-amber-600">{revenue?.pendingCount || 0}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-red-500">{revenue?.failedCount || 0}</p>
                    <p className="text-xs text-gray-400">Failed</p>
                  </div>
                </div>
                {revenueAreaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueAreaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => formatRupee(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                      <Tooltip content={<RupeeTooltip />} />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Payment Methods</h2>
                <p className="text-xs text-gray-500 mt-0.5">Revenue by channel</p>
              </div>
              <div className="p-6">
                {payMethodData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={payMethodData} cx="50%" cy="50%" outerRadius={65} dataKey="value" stroke="none">
                          {payMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => formatRupee(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {payMethodData.map((p, i) => (
                        <div key={p.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-600">{p.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatRupee(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptyChart message="No paid payments in this period" />}
              </div>
            </div>
          </div>

          {/* ── Membership ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Section title="New Member Growth" subtitle="Members who joined each month">
              {memberGrowthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={memberGrowthData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </Section>

            <Section title="Plan Distribution" subtitle="Active members per membership plan">
              {planDistData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={planDistData} cx="50%" cy="50%" outerRadius={65} dataKey="value" stroke="none">
                        {planDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`${v} members`, p.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {planDistData.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600 truncate max-w-[130px]">{p.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{p.value} members</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <EmptyChart message="No plans assigned yet" />}
            </Section>
          </div>

          {/* ── Attendance ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Section title="Daily Attendance" subtitle="Check-ins per day in selected period">
              {dailyAttendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyAttendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No check-ins in this period" />}
            </Section>

            <Section title="Day of Week" subtitle="Which days are most active">
              {attend?.total > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dowData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {dowData.map((d, i) => <Cell key={i} fill={d.isBusiest ? '#f59e0b' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No check-ins in this period" />}
            </Section>
          </div>

          {/* ── Peak Hours Heatmap ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Peak Hours</h2>
              <p className="text-xs text-gray-500 mt-0.5">Check-in frequency by hour of day</p>
            </div>
            <div className="p-6">
              {attend?.total > 0 ? (
                <>
                  <div className="flex gap-1">
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = attend.byHour[h] || 0
                      const opacity = count / heatmapMax
                      return (
                        <div
                          key={h}
                          className="flex flex-col items-center gap-1"
                          style={{ flex: '1 1 0' }}
                          title={`${h}:00 — ${count} check-ins`}
                        >
                          <div style={{
                            height: 48, width: '100%',
                            background: `rgba(99,102,241,${0.07 + opacity * 0.86})`,
                            borderRadius: 6,
                            outline: h === attend.busiestHour ? '2px solid #6366f1' : 'none',
                            outlineOffset: 1,
                          }} />
                          <p className="text-[9px] text-gray-400 text-center">{h}h</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.93)' }} />
                      <span>High activity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.10)' }} />
                      <span>Low activity</span>
                    </div>
                    {attend.busiestHour !== undefined && (
                      <span className="font-semibold text-indigo-600">
                        Peak: {attend.busiestHour}:00–{attend.busiestHour + 1}:00
                      </span>
                    )}
                  </div>
                </>
              ) : <EmptyChart message="No attendance data in this period" />}
            </div>
          </div>

          {/* ── At-Risk Members ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">At-Risk Members</h2>
                <p className="text-xs text-gray-500 mt-0.5">Inactive 7+ days or expired memberships</p>
              </div>
              {inactive?.length > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {inactive.length}
                </span>
              )}
            </div>
            {!inactive || inactive.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <UserCheck size={22} className="text-green-500" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-medium text-gray-900">Great retention!</p>
                <p className="text-xs text-gray-400 mt-1">No at-risk members found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Last Check-in</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Inactive</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Expiry</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Risk</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inactive.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                              {m.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                              <p className="text-xs text-gray-400 truncate">{m.email || m.phone || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatRelDate(m.lastCheckin)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {m.daysInactive >= 999 ? 'Never' : `${m.daysInactive}d`}
                        </td>
                        <td className="px-5 py-3 text-sm whitespace-nowrap">
                          {m.expiry_date
                            ? <span className={m.isExpired ? 'text-red-500 font-medium' : 'text-gray-600'}>{m.expiry_date}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            m.riskLevel === 'high'   ? 'bg-red-100 text-red-700' :
                            m.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                       'bg-blue-100 text-blue-700'
                          }`}>
                            {m.riskLevel.charAt(0).toUpperCase() + m.riskLevel.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {m.riskLevel !== 'low' && (
                            <button
                              onClick={() => setDrawerMember(m)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                            >
                              <Eye size={12} />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Payment Insights ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Section title="Revenue by Plan" subtitle="Which plans generate the most income">
              {payIns?.revenueByPlan?.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(180, payIns.revenueByPlan.length * 48)}>
                  <BarChart layout="vertical" data={payIns.revenueByPlan} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => formatRupee(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="planName" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={96} />
                    <Tooltip content={<RupeeTooltip />} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No paid payments in this period" />}
            </Section>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Payment Summary</h2>
                <p className="text-xs text-gray-500 mt-0.5">Top payers and outstanding dues</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Payers</p>
                  {payIns?.topPayers?.length > 0 ? (
                    <div className="space-y-2.5">
                      {payIns.topPayers.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {p.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <p className="text-sm text-gray-700 flex-1 truncate">{p.name}</p>
                          <p className="text-sm font-semibold text-gray-900 shrink-0">{formatRupee(p.totalPaid)}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-400">No payments in this period.</p>}
                </div>
                {payIns?.pendingDues?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Dues</p>
                      <button onClick={() => navigate('/owner-dashboard/payments')}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer transition-colors">
                        View all →
                      </button>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-center justify-between">
                      <p className="text-sm text-amber-800 font-medium">
                        {payIns.pendingDues.length} pending payment{payIns.pendingDues.length !== 1 ? 's' : ''}
                      </p>
                      <AlertTriangle size={16} className="text-amber-500" strokeWidth={2} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Smart Insights ── */}
          {insights.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">Smart Insights</h2>
                <p className="text-xs text-gray-500 mt-0.5">Auto-generated from your gym data</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((ins, i) => {
                  const { Icon: InsIcon } = ins
                  const cfg =
                    ins.type === 'positive' ? { bg: 'bg-green-50',  border: 'border-green-200',  ic: 'text-green-600'  } :
                    ins.type === 'warning'  ? { bg: 'bg-amber-50',  border: 'border-amber-200',  ic: 'text-amber-600'  } :
                                             { bg: 'bg-blue-50',   border: 'border-blue-200',   ic: 'text-blue-600'   }
                  return (
                    <div key={i} className={`rounded-xl border p-4 flex items-start gap-3 ${cfg.bg} ${cfg.border}`}>
                      <InsIcon size={17} className={`${cfg.ic} shrink-0 mt-0.5`} strokeWidth={2} />
                      <p className="text-sm text-gray-700 leading-relaxed">{ins.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {drawerMember && (
        <MemberDrawer
          member={drawerMember}
          gymId={gymId}
          defaultTab="Info"
          onClose={() => setDrawerMember(null)}
          onUpdated={updated => setDrawerMember(updated)}
          onDeleted={() => setDrawerMember(null)}
        />
      )}
    </div>
  )
}
