import { useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  IndianRupee, TrendingUp, Wallet, ArrowLeftRight, UserMinus, Crown, Layers,
} from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import { fetchRevenueOverview, listRecentSaasPayments } from '../services/adminRevenueService'
import { fetchRevenueSeries } from '../services/adminMetricsService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminTheme } from '../store/AdminThemeContext'
import { inr, num, date, planLabel } from '../lib/format'

export default function RevenuePage() {
  const { isLight } = useAdminTheme()
  const chart = isLight
    ? { grid: 'rgba(0,0,0,0.08)', tick: '#8b8b94', tipBg: '#ffffff', tipBorder: 'rgba(0,0,0,0.14)', tipText: '#18181b', tipLabel: '#52525b' }
    : { grid: 'rgba(255,255,255,0.06)', tick: '#6c6c7a', tipBg: '#181826', tipBorder: 'rgba(255,255,255,0.14)', tipText: '#f4f4f6', tipLabel: '#a1a1b0' }

  const fetcher = useCallback(async () => {
    const [overview, series, payments] = await Promise.all([
      fetchRevenueOverview(), fetchRevenueSeries(12), listRecentSaasPayments(20),
    ])
    return { overview, series, payments }
  }, [])
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })
  const o = data?.overview || {}
  const series = data?.series || []
  const payments = data?.payments || []
  const byPlan = o.by_plan || []

  const momDelta = o.revenue_prev_month
    ? Math.round(((o.revenue_month - o.revenue_prev_month) / o.revenue_prev_month) * 100)
    : null
  const maxPlanMrr = Math.max(1, ...byPlan.map((p) => Number(p.mrr) || 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Revenue</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Platform SaaS billing — what gyms pay Gymmobius</p>
      </div>

      {error && <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}><p style={{ color: '#fca5a5' }}>{error.message}</p></Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="MRR" value={inr(o.mrr, { compact: true })} sub="30-day normalized" Icon={IndianRupee} tone="green" loading={loading} />
        <KpiCard label="ARR" value={inr(o.arr, { compact: true })} Icon={TrendingUp} tone="green" loading={loading} />
        <KpiCard label="Revenue this month" value={inr(o.revenue_month)}
          sub={momDelta != null ? `${momDelta >= 0 ? '+' : ''}${momDelta}% vs last month` : 'vs ₹0 last month'}
          Icon={Wallet} loading={loading} />
        <KpiCard label="Active paid gyms" value={num(o.active_paid)} Icon={Layers} loading={loading} />
        <KpiCard label="Conversions (30d)" value={num(o.conversions_30d)} Icon={ArrowLeftRight} tone="green" loading={loading} />
        <KpiCard label="Churn (30d)" value={num(o.churn_30d)} Icon={UserMinus} tone="amber" loading={loading} />
        <KpiCard label="Founder customers" value={num(o.founder_count)} sub={`${inr(o.founder_mrr, { compact: true })} MRR`} Icon={Crown} tone="indigo" loading={loading} />
        <KpiCard label="Revenue today" value={inr(o.revenue_today)} Icon={Wallet} loading={loading} />
      </div>

      <Card>
        <SectionTitle>Revenue · last 12 months</SectionTitle>
        {loading ? <Sk h={240} r={12} /> : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevLg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(v, { compact: true })} />
                <Tooltip
                  contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 10, color: chart.tipText }}
                  formatter={(v, name) => name === 'revenue' ? [inr(v), 'Revenue'] : [v, 'New subs']}
                  labelStyle={{ color: chart.tipLabel }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2} fill="url(#adminRevLg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>MRR by plan</SectionTitle>
          {loading ? <Sk h={120} /> : byPlan.length === 0 ? (
            <EmptyState Icon={Layers} title="No active paid plans" />
          ) : (
            <div className="space-y-3">
              {byPlan.map((p) => (
                <div key={p.plan}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--a-text-dim)' }}>{planLabel(p.plan)} · {num(p.count)}</span>
                    <span style={{ color: 'var(--a-text)' }}>{inr(p.mrr, { compact: true })}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--a-surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((Number(p.mrr) / maxPlanMrr) * 100)}%`, background: 'var(--a-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-4"><SectionTitle>Recent payments</SectionTitle></div>
          {loading ? <div className="px-5 pb-4"><Sk h={120} /></div> : payments.length === 0 ? (
            <EmptyState Icon={Wallet} title="No payments yet" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: 'var(--a-text)' }}>{p.gym?.name || '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {planLabel(p.plan_name)}{p.is_founder_pricing ? ' · Founder' : ''} · {date(p.paid_at)}
                    </p>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--a-text)' }}>{inr(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
