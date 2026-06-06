import { useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  IndianRupee, TrendingUp, Building2, FlaskConical, ArrowLeftRight, UserMinus,
  CalendarClock, AlertTriangle, MessageSquareWarning, Globe, Crown, Wallet,
} from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import { fetchDashboardMetrics, fetchRevenueSeries } from '../services/adminMetricsService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminTheme } from '../store/AdminThemeContext'
import { inr, num } from '../lib/format'

const FOUNDER_CAP = 25 // mirrors create-subscription-order founder slot cap

export default function DashboardPage() {
  const { isLight } = useAdminTheme()
  const chart = isLight
    ? { grid: 'rgba(0,0,0,0.08)', tick: '#8b8b94', tipBg: '#ffffff', tipBorder: 'rgba(0,0,0,0.14)', tipText: '#18181b', tipLabel: '#52525b' }
    : { grid: 'rgba(255,255,255,0.06)', tick: '#6c6c7a', tipBg: '#181826', tipBorder: 'rgba(255,255,255,0.14)', tipText: '#f4f4f6', tipLabel: '#a1a1b0' }

  const fetcher = useCallback(async () => {
    const [metrics, series] = await Promise.all([fetchDashboardMetrics(), fetchRevenueSeries(6)])
    return { metrics, series }
  }, [])

  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 60000 })
  const m = data?.metrics || {}
  const series = data?.series || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Platform Overview</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>
          Live health across all gyms · auto-refreshes every 60s
        </p>
      </div>

      {error && (
        <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}>
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            Failed to load metrics: {error.message}
          </p>
        </Card>
      )}

      {/* Revenue + growth */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="MRR" value={inr(m.mrr, { compact: true })} sub="30-day normalized" Icon={IndianRupee} tone="green" loading={loading} />
        <KpiCard label="ARR" value={inr(m.arr, { compact: true })} Icon={TrendingUp} tone="green" loading={loading} />
        <KpiCard label="Revenue today" value={inr(m.revenue_today)} Icon={Wallet} loading={loading} />
        <KpiCard label="Revenue this month" value={inr(m.revenue_month)} Icon={Wallet} loading={loading} />
        <KpiCard label="Active gyms" value={num(m.active_gyms)} sub={`${num(m.total_gyms)} total`} Icon={Building2} loading={loading} />
        <KpiCard label="Trials" value={num(m.trials)} Icon={FlaskConical} tone="indigo" loading={loading} />
        <KpiCard label="Conversions (30d)" value={num(m.conversions_30d)} Icon={ArrowLeftRight} tone="green" loading={loading} />
        <KpiCard label="Churn (30d)" value={num(m.churn_30d)} Icon={UserMinus} tone="amber" loading={loading} />
      </div>

      {/* Revenue chart */}
      <Card>
        <SectionTitle>Platform revenue · last 6 months</SectionTitle>
        {loading ? (
          <Sk h={240} r={12} />
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => inr(v, { compact: true })} />
                <Tooltip
                  contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 10, color: chart.tipText }}
                  formatter={(v, name) => name === 'revenue' ? [inr(v), 'Revenue'] : [v, 'New subs']}
                  labelStyle={{ color: chart.tipLabel }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2} fill="url(#adminRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Operational alerts */}
      <div>
        <SectionTitle>Attention</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiCard label="Expiring ≤7d" value={num(m.expiring_7d)} sub={`${num(m.expiring_30d)} within 30d`} Icon={CalendarClock} tone="amber" loading={loading} alert={!!m.expiring_7d} />
          <KpiCard label="Failed payments (7d)" value={num(m.failed_payments_7d)} sub="abandoned checkouts" Icon={AlertTriangle} tone="red" loading={loading} alert={!!m.failed_payments_7d} />
          <KpiCard label="Notification failures (24h)" value={num(m.notification_failures_24h)} Icon={MessageSquareWarning} tone="red" loading={loading} alert={!!m.notification_failures_24h} />
          <KpiCard label="Domain issues" value={num(m.domain_issues)} sub="unverified custom domains" Icon={Globe} tone="amber" loading={loading} alert={!!m.domain_issues} />
          <KpiCard label="Founder slots used" value={`${num(m.founder_slots_used)} / ${FOUNDER_CAP}`} Icon={Crown} tone="indigo" loading={loading} />
        </div>
      </div>
    </div>
  )
}
