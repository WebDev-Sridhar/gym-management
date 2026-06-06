import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CreditCard, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import { listSubscriptions } from '../services/adminSubscriptionService'
import { usePolledData } from '../hooks/usePolledData'
import { useDebounced } from '../hooks/useDebounced'
import { inr, date, planLabel, daysUntil } from '../lib/format'
import { adminPath } from '../lib/adminBase'

const PAGE_SIZE = 20
const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]
const PLANS = [
  { value: 'all', label: 'All plans' },
  { value: 'free', label: 'Solo Coach' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'premium', label: 'Premium' },
]

export default function SubscriptionsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  const [founderOnly, setFounderOnly] = useState(false)
  const [page, setPage] = useState(0)
  const term = useDebounced(search)

  const fetcher = useCallback(
    () => listSubscriptions({ search: term, status, plan, founderOnly, page, pageSize: PAGE_SIZE }),
    [term, status, plan, founderOnly, page],
  )
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })
  const rows = data?.rows || []
  const reset = (fn) => (v) => { fn(v); setPage(0) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Subscriptions</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>SaaS billing across all gyms</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--a-text-faint)' }} />
          <input value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Search gym…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }} />
        </div>
        <select value={status} onChange={(e) => reset(setStatus)(e.target.value)} className="admin-input w-auto">
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={plan} onChange={(e) => reset(setPlan)(e.target.value)} className="admin-input w-auto">
          {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button
          onClick={() => reset(setFounderOnly)(!founderOnly)}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ background: founderOnly ? 'var(--a-accent-soft)' : 'var(--a-surface)', color: founderOnly ? 'var(--a-accent-text)' : 'var(--a-text-dim)', borderColor: 'var(--a-border)' }}
        >
          Founders only
        </button>
      </div>

      <Card padded={false}>
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-2.5 text-xs font-medium md:grid"
          style={{ borderColor: 'var(--a-border)', color: 'var(--a-text-faint)' }}>
          <div className="col-span-4">Gym</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Expires</div>
        </div>

        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>Failed to load: {error.message}</p>}
        {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="px-4 py-3.5"><Sk h={18} /></div>)}
        {!loading && !error && rows.length === 0 && <EmptyState Icon={CreditCard} title="No subscriptions match" />}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((s) => {
              const d = daysUntil(s.expires_at)
              return (
                <button key={s.id} onClick={() => navigate(adminPath(`gyms/${s.gym_id}`))}
                  className="admin-hover grid w-full grid-cols-1 gap-1 px-4 py-3.5 text-left md:grid-cols-12 md:items-center md:gap-3">
                  <div className="col-span-4 min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--a-text)' }}>{s.gym?.name || '—'}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--a-text-faint)' }}>/{s.gym?.slug}</p>
                  </div>
                  <div className="col-span-2 text-sm" style={{ color: 'var(--a-text-dim)' }}>
                    {planLabel(s.plan_name)}{s.is_founder_pricing && <span className="ml-1 text-[11px]" style={{ color: 'var(--a-accent-text)' }}>· F</span>}
                  </div>
                  <div className="col-span-2 text-sm" style={{ color: 'var(--a-text-dim)' }}>{inr(s.amount)}</div>
                  <div className="col-span-2"><StatusPill status={s.status} /></div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs" style={{ color: d != null && d <= 7 && s.status === 'active' ? '#fbbf24' : 'var(--a-text-faint)' }}>
                      {date(s.expires_at)}{d != null && s.status === 'active' ? ` (${d}d)` : ''}
                    </span>
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
