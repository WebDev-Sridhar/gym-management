import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LifeBuoy, Loader2, ExternalLink, UserCheck } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import {
  listTickets, fetchTicketCounts, updateTicket, TICKET_STATUSES, TICKET_PRIORITIES,
} from '../services/adminSupportService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { adminPath } from '../lib/adminBase'
import { dateTime } from '../lib/format'

const PAGE_SIZE = 20
const PRIORITY_TONE = { urgent: 'red', high: 'amber', normal: 'gray', low: 'gray' }

export default function SupportPage() {
  const { role, admin } = useAdminAuth()
  const canUpdate = can(role, 'ticket.update')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('all')
  const [page, setPage] = useState(0)
  const [active, setActive] = useState(null)

  const countsFetcher = useCallback(() => fetchTicketCounts(), [])
  const { data: counts } = usePolledData(countsFetcher, { intervalMs: 0 })

  const fetcher = useCallback(
    () => listTickets({ status, priority, page, pageSize: PAGE_SIZE }),
    [status, priority, page],
  )
  const { data, loading, error, refresh } = usePolledData(fetcher, { intervalMs: 0 })
  const rows = data?.rows || []

  const STATUS_TABS = [
    { value: 'all', label: 'All', n: counts?.total },
    { value: 'open', label: 'Open', n: counts?.open },
    { value: 'pending', label: 'Pending', n: counts?.pending },
    { value: 'resolved', label: 'Resolved', n: counts?.resolved },
    { value: 'closed', label: 'Closed', n: counts?.closed },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Support</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Customer ticket inbox</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button key={t.value} onClick={() => { setStatus(t.value); setPage(0) }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: status === t.value ? 'var(--a-accent-soft)' : 'var(--a-surface)', color: status === t.value ? 'var(--a-accent-text)' : 'var(--a-text-dim)', border: '1px solid var(--a-border)' }}>
              {t.label}{t.n != null ? ` (${t.n})` : ''}
            </button>
          ))}
        </div>
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(0) }} className="admin-input ml-auto w-auto py-1.5 text-xs">
          <option value="all">All priorities</option>
          {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <Card padded={false}>
        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>{error.message}</p>}
        {loading && <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} h={20} />)}</div>}
        {!loading && !error && rows.length === 0 && <EmptyState Icon={LifeBuoy} title="No tickets" />}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((tk) => (
              <button key={tk.id} onClick={() => setActive(tk)} className="admin-hover block w-full px-4 py-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--a-text)' }}>{tk.subject}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {tk.gym?.name || '—'} · {tk.category} · {dateTime(tk.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill tone={PRIORITY_TONE[tk.priority]} label={tk.priority} dot={false} />
                    <StatusPill status={tk.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="px-3 pb-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPage={setPage} />
          </div>
        )}
      </Card>

      {active && (
        <TicketModal
          ticket={active}
          canUpdate={canUpdate}
          meId={admin?.id}
          onClose={() => setActive(null)}
          onSaved={() => { setActive(null); refresh() }}
        />
      )}
    </div>
  )
}

function TicketModal({ ticket, canUpdate, meId, onClose, onSaved }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState(ticket.status)
  const [notes, setNotes] = useState(ticket.internal_notes || '')
  const [resolution, setResolution] = useState(ticket.resolution || '')
  const [assignSelf, setAssignSelf] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const assignedToMe = ticket.assigned_to === meId

  async function save() {
    setBusy(true); setErr('')
    try {
      await updateTicket({
        ticketId: ticket.id,
        status,
        internalNotes: notes,
        resolution,
        assignToSelf: assignSelf || undefined,
      })
      onSaved()
    } catch (e) { setErr(e.message || 'Failed') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={ticket.subject} maxWidth={560}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--a-text-faint)' }}>
          <button onClick={() => navigate(adminPath(`gyms/${ticket.gym_id}`))} style={{ color: 'var(--a-accent-text)' }}>{ticket.gym?.name || 'gym'}</button>
          <span>{ticket.email}</span>
          <span>{ticket.category}</span>
          <StatusPill tone={PRIORITY_TONE[ticket.priority]} label={ticket.priority} dot={false} />
          <span>{dateTime(ticket.created_at)}</span>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--a-border)', background: 'var(--a-surface-2)', color: 'var(--a-text-dim)' }}>
          {ticket.message}
        </div>
        {ticket.screenshot_url && (
          <a href={ticket.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--a-accent-text)' }}>
            View screenshot <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {canUpdate ? (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: 'var(--a-border)' }}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-input">
                {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Internal notes</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="admin-input resize-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Resolution</span>
              <textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} className="admin-input resize-none" />
            </label>
            {!assignedToMe && (
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--a-text-dim)' }}>
                <input type="checkbox" checked={assignSelf} onChange={(e) => setAssignSelf(e.target.checked)} />
                <UserCheck className="h-3.5 w-3.5" /> Assign to me
              </label>
            )}
            {assignedToMe && <p className="text-xs" style={{ color: 'var(--a-tone-green-fg)' }}>Assigned to you</p>}

            {err && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{err}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>Cancel</button>
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--a-accent)' }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        ) : (
          <p className="border-t pt-3 text-xs" style={{ borderColor: 'var(--a-border)', color: 'var(--a-text-faint)' }}>
            You have read-only access to tickets.
          </p>
        )}
      </div>
    </Modal>
  )
}
