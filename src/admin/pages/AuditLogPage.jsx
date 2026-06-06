import { useCallback, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import { listAuditLog, AUDIT_ACTION_GROUPS } from '../services/adminAuditService'
import { usePolledData } from '../hooks/usePolledData'
import { useDebounced } from '../hooks/useDebounced'
import { dateTime } from '../lib/format'

const PAGE_SIZE = 30

export default function AuditLogPage() {
  const [action, setAction] = useState('all')
  const [email, setEmail] = useState('')
  const [page, setPage] = useState(0)
  const term = useDebounced(email)

  const fetcher = useCallback(
    () => listAuditLog({ action, adminEmail: term, page, pageSize: PAGE_SIZE }),
    [action, term, page],
  )
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })
  const rows = data?.rows || []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Audit Log</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Every admin action — who, what, when, why</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0) }} className="admin-input w-auto">
          {AUDIT_ACTION_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--a-text-faint)' }} />
          <input value={email} onChange={(e) => { setEmail(e.target.value); setPage(0) }} placeholder="Filter by admin email…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }} />
        </div>
      </div>

      <Card padded={false}>
        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>Failed to load: {error.message}</p>}
        {loading && Array.from({ length: 10 }).map((_, i) => <div key={i} className="px-5 py-3"><Sk h={16} /></div>)}
        {!loading && !error && rows.length === 0 && <EmptyState Icon={ScrollText} title="No audit entries" />}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--a-surface-2)', color: 'var(--a-accent-text)' }}>{a.action}</code>
                    {a.target_type && <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{a.target_type}</span>}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{dateTime(a.created_at)}</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--a-text-dim)' }}>
                  {a.admin_email} <span style={{ color: 'var(--a-text-faint)' }}>({a.admin_role})</span>
                  {a.reason ? <> · {a.reason}</> : null}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="px-3 pb-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPage={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
