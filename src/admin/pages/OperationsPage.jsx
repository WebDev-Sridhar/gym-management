import { useCallback } from 'react'
import { Activity, AlertTriangle, Clock, Webhook, CheckCircle2 } from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import { fetchCronStatus, listWebhookEvents } from '../services/adminOpsService'
import { usePolledData } from '../hooks/usePolledData'
import { num, dateTime, relativeTime } from '../lib/format'

export default function OperationsPage() {
  const fetcher = useCallback(async () => {
    const [cron, webhooks] = await Promise.all([fetchCronStatus(), listWebhookEvents(30)])
    return { cron, webhooks }
  }, [])
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 60000 })
  const cron = data?.cron || {}
  const schedules = cron.schedules || []
  const runs = cron.recent_runs || []
  const webhooks = data?.webhooks || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Operations</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Cron health &amp; webhook ledger</p>
      </div>

      {error && <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}><p style={{ color: '#fca5a5' }}>{error.message}</p></Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Scheduled jobs" value={num(schedules.length)} Icon={Clock} loading={loading} />
        <KpiCard label="Cron failures (24h)" value={num(cron.failures_24h)} Icon={AlertTriangle} tone="red" loading={loading} alert={!!cron.failures_24h} />
        <KpiCard label="Recent runs logged" value={num(runs.length)} Icon={Activity} loading={loading} />
        <KpiCard label="Webhook events" value={num(webhooks.length)} sub="most recent" Icon={Webhook} loading={loading} />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4"><SectionTitle>Cron schedules</SectionTitle></div>
        {loading ? <div className="px-5 pb-4"><Sk h={100} /></div> : schedules.length === 0 ? (
          <EmptyState Icon={Clock} title="No scheduled jobs" />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {schedules.map((s) => (
              <div key={s.jobid} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-sm" style={{ color: 'var(--a-text)' }}>{s.jobname}</p>
                  <p className="font-mono text-xs" style={{ color: 'var(--a-text-faint)' }}>{s.schedule}</p>
                </div>
                <StatusPill tone={s.active ? 'green' : 'gray'} label={s.active ? 'active' : 'paused'} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-5 pt-4"><SectionTitle>Recent cron runs</SectionTitle></div>
          {loading ? <div className="px-5 pb-4"><Sk h={120} /></div> : runs.length === 0 ? (
            <EmptyState Icon={Activity} title="No runs logged" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {runs.map((r, i) => {
                const ok = r.status === 'success'
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm" style={{ color: 'var(--a-text)' }}>{r.job_name}</p>
                      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{relativeTime(r.created_at)}</p>
                    </div>
                    {ok
                      ? <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--a-tone-green-fg)' }} />
                      : <StatusPill tone="red" label={r.status || 'error'} />}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-4"><SectionTitle>Webhook events</SectionTitle></div>
          {loading ? <div className="px-5 pb-4"><Sk h={120} /></div> : webhooks.length === 0 ? (
            <EmptyState Icon={Webhook} title="No webhook events" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {webhooks.map((w) => (
                <div key={w.event_id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: 'var(--a-text)' }}>{w.event_type || 'event'}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {w.gym?.name || '—'} · {dateTime(w.received_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
