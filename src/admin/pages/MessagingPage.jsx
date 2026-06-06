import { useCallback, useState } from 'react'
import {
  MessageSquare, Send, AlertTriangle, BadgeCheck, PauseCircle, PlayCircle,
  Smartphone, Mail, SkipForward,
} from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import { ActionModal } from '../components/ui/Modal'
import {
  fetchMessagingOverview, listNotifications, getMessagingPaused, setMessagingPaused,
  NOTIFICATION_TYPES, NOTIFICATION_STATUSES,
} from '../services/adminMessagingService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { num, dateTime } from '../lib/format'

const PAGE_SIZE = 25

export default function MessagingPage() {
  const { role } = useAdminAuth()
  const canPause = can(role, 'messaging.pause')

  const overviewFetcher = useCallback(async () => {
    const [overview, pause] = await Promise.all([fetchMessagingOverview(), getMessagingPaused()])
    return { overview, pause }
  }, [])
  const { data, loading, error, refresh } = usePolledData(overviewFetcher, { intervalMs: 60000 })
  const o = data?.overview || {}
  const paused = data?.pause?.paused || false
  const byType = o.by_type_7d || []
  const topGyms = o.top_whatsapp_gyms_30d || []

  // Pause/resume modal
  const [pauseModal, setPauseModal] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [pauseErr, setPauseErr] = useState('')

  async function togglePause() {
    setBusy(true); setPauseErr('')
    try {
      await setMessagingPaused(!paused, reason.trim() || undefined)
      setPauseModal(false); setReason('')
      await refresh()
    } catch (err) {
      setPauseErr(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Messaging</h1>
          <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>WhatsApp + email delivery across all gyms · last 7 days</p>
        </div>
      </div>

      {/* Kill-switch banner */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: paused ? 'rgba(239,68,68,0.10)' : 'var(--a-surface)',
          borderColor: paused ? 'rgba(239,68,68,0.4)' : 'var(--a-border)',
        }}
      >
        <div className="flex items-center gap-3">
          {paused
            ? <PauseCircle className="h-5 w-5" style={{ color: 'var(--a-tone-red-fg)' }} />
            : <PlayCircle className="h-5 w-5" style={{ color: 'var(--a-tone-green-fg)' }} />}
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--a-text)' }}>
              {paused ? 'All outbound messaging is PAUSED' : 'Messaging is active'}
            </p>
            <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
              {paused
                ? 'The notification engine is skipping every dispatch platform-wide.'
                : 'WhatsApp + email dispatch normally for all gyms.'}
            </p>
          </div>
        </div>
        {canPause && (
          <button
            onClick={() => { setPauseModal(true); setReason(''); setPauseErr('') }}
            className="admin-hover inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: paused ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)', color: paused ? 'var(--a-tone-green-fg)' : 'var(--a-tone-red-fg)' }}
          >
            {paused ? <><PlayCircle className="h-3.5 w-3.5" /> Resume sending</> : <><PauseCircle className="h-3.5 w-3.5" /> Pause sending</>}
          </button>
        )}
      </div>

      {error && <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}><p style={{ color: '#fca5a5' }}>{error.message}</p></Card>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Sent (7d)" value={num(o.sent_7d)} sub={`${num(o.total_7d)} total`} Icon={Send} tone="green" loading={loading} />
        <KpiCard label="Delivery rate" value={o.delivery_rate_7d != null ? `${o.delivery_rate_7d}%` : '—'} Icon={BadgeCheck} tone="green" loading={loading} />
        <KpiCard label="Failed (7d)" value={num(o.failed_7d + o.partial_7d)} Icon={AlertTriangle} tone="red" loading={loading} alert={!!(o.failed_7d + o.partial_7d)} />
        <KpiCard label="Skipped (7d)" value={num(o.skipped_7d)} Icon={SkipForward} tone="amber" loading={loading} />
        <KpiCard label="WhatsApp sent" value={num(o.whatsapp_sent_7d)} sub={`${num(o.whatsapp_failed_7d)} failed`} Icon={Smartphone} tone="indigo" loading={loading} />
        <KpiCard label="Email sent" value={num(o.email_sent_7d)} sub={`${num(o.email_failed_7d)} failed`} Icon={Mail} tone="indigo" loading={loading} />
        <KpiCard label="Pending (7d)" value={num(o.pending_7d)} Icon={MessageSquare} tone="amber" loading={loading} />
        <KpiCard label="Total (24h)" value={num(o.total_24h)} Icon={MessageSquare} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-5 pt-4"><SectionTitle>By type · 7d</SectionTitle></div>
          {loading ? <div className="px-5 pb-4"><Sk h={120} /></div> : byType.length === 0 ? (
            <EmptyState Icon={MessageSquare} title="No messages in the last 7 days" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {byType.map((t) => (
                <div key={t.type} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm" style={{ color: 'var(--a-text-dim)' }}>{t.type}</span>
                  <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                    {num(t.total)} total{t.failed ? <span style={{ color: 'var(--a-tone-red-fg)' }}> · {num(t.failed)} failed</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-4"><SectionTitle>Top WhatsApp senders · 30d</SectionTitle></div>
          {loading ? <div className="px-5 pb-4"><Sk h={120} /></div> : topGyms.length === 0 ? (
            <EmptyState Icon={Smartphone} title="No WhatsApp activity" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {topGyms.map((g) => (
                <div key={g.gym_id} className="flex items-center justify-between px-5 py-2.5">
                  <span className="truncate text-sm" style={{ color: 'var(--a-text)' }}>{g.name}</span>
                  <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{num(g.sent)} sent</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <NotificationLog />

      <ActionModal
        open={pauseModal}
        onClose={() => setPauseModal(false)}
        title={paused ? 'Resume messaging' : 'Pause all messaging'}
        description={paused
          ? 'The notification engine will resume dispatching WhatsApp + email for all gyms.'
          : 'The notification engine will skip EVERY dispatch platform-wide until resumed. Use for incidents (provider outage, cost spike).'}
        confirmLabel={paused ? 'Resume' : 'Pause everything'}
        destructive={!paused}
        requireReason={!paused}
        busy={busy}
        error={pauseErr}
        reason={reason}
        setReason={setReason}
        onConfirm={togglePause}
      />
    </div>
  )
}

function NotificationLog() {
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState(null)

  const fetcher = useCallback(
    () => listNotifications({ status, type, page, pageSize: PAGE_SIZE }),
    [status, type, page],
  )
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })
  const rows = data?.rows || []

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <SectionTitle>Notification log</SectionTitle>
        <div className="ml-auto flex gap-2">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} className="admin-input w-auto py-1.5 text-xs">
            <option value="all">All statuses</option>
            {NOTIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(0) }} className="admin-input w-auto py-1.5 text-xs">
            <option value="all">All types</option>
            {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="px-5 py-6 text-sm" style={{ color: '#fca5a5' }}>{error.message}</p>}
      {loading && <div className="px-5 py-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} h={16} />)}</div>}
      {!loading && !error && rows.length === 0 && <EmptyState Icon={MessageSquare} title="No notifications match" />}

      {!loading && !error && rows.length > 0 && (
        <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
          {rows.map((n) => {
            const reason = n.metadata?.suppressed_reason || n.metadata?.whatsapp_blocked_reason
            return (
              <button key={n.id} onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                className="admin-hover block w-full px-5 py-2.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: 'var(--a-text)' }}>
                      {n.type} <span style={{ color: 'var(--a-text-faint)' }}>· {n.gym?.name || '—'}</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {(n.channels || []).join(', ') || 'no channel'} · {n.triggered_by} · {dateTime(n.created_at)}
                      {reason ? <span style={{ color: 'var(--a-tone-amber-fg)' }}> · {reason}</span> : null}
                    </p>
                  </div>
                  <StatusPill status={n.status} />
                </div>
                {expanded === n.id && (
                  <pre className="mt-2 overflow-x-auto rounded-lg p-2 text-[11px]"
                    style={{ background: 'var(--a-surface-2)', color: 'var(--a-text-dim)' }}>
                    {JSON.stringify(n.metadata ?? {}, null, 2)}
                  </pre>
                )}
              </button>
            )
          })}
        </div>
      )}

      {!loading && !error && (
        <div className="px-3 pb-3">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPage={setPage} />
        </div>
      )}
    </Card>
  )
}
