import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import { listGyms } from '../services/adminGymService'
import { usePolledData } from '../hooks/usePolledData'
import { useDebounced } from '../hooks/useDebounced'
import { date, planLabel } from '../lib/format'
import { adminPath } from '../lib/adminBase'

const PAGE_SIZE = 20
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export default function GymsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const term = useDebounced(search)

  const fetcher = useCallback(
    () => listGyms({ search: term, status, page, pageSize: PAGE_SIZE }),
    [term, status, page],
  )
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })
  const rows = data?.rows || []

  function changeStatus(s) { setStatus(s); setPage(0) }
  function changeSearch(v) { setSearch(v); setPage(0) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Gyms</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Every tenant on the platform</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--a-text-faint)' }} />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search name, slug, city, or gym ID…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeStatus(f.value)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: status === f.value ? 'var(--a-accent-soft)' : 'var(--a-surface)',
                color: status === f.value ? 'var(--a-accent-text)' : 'var(--a-text-dim)',
                border: '1px solid var(--a-border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card padded={false}>
        {/* header */}
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-2.5 text-xs font-medium md:grid"
          style={{ borderColor: 'var(--a-border)', color: 'var(--a-text-faint)' }}>
          <div className="col-span-4">Gym</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Subscription</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Joined</div>
        </div>

        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>Failed to load: {error.message}</p>}

        {loading && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5"><Sk h={18} /></div>
            ))}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <EmptyState Icon={Building2} title="No gyms found" hint="Try a different search or filter." />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((g) => {
              const sub = g.currentSub
              return (
                <button
                  key={g.id}
                  onClick={() => navigate(adminPath(`gyms/${g.id}`))}
                  className="admin-hover grid w-full grid-cols-1 gap-1 px-4 py-3.5 text-left md:grid-cols-12 md:items-center md:gap-3"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--a-surface-2)', color: 'var(--a-text-dim)' }}>
                      {(g.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--a-text)' }}>{g.name}</p>
                      <p className="truncate text-xs" style={{ color: 'var(--a-text-faint)' }}>/{g.slug}{g.city ? ` · ${g.city}` : ''}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm" style={{ color: 'var(--a-text-dim)' }}>
                    {planLabel(sub?.plan_name)}
                    {sub?.is_founder_pricing && <span className="ml-1 text-[11px]" style={{ color: 'var(--a-accent-text)' }}>· Founder</span>}
                  </div>
                  <div className="col-span-2"><StatusPill status={sub?.status || 'none'} /></div>
                  <div className="col-span-2"><StatusPill status={g.status} /></div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{date(g.created_at)}</span>
                    <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: 'var(--a-text-faint)' }} />
                  </div>
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
    </div>
  )
}
