import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Search, ExternalLink, AlertTriangle, ChevronDown } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import { listDomains } from '../services/adminDomainService'
import { usePolledData } from '../hooks/usePolledData'
import { useDebounced } from '../hooks/useDebounced'
import { adminPath } from '../lib/adminBase'
import { dateTime } from '../lib/format'

const MAIN_DOMAIN = import.meta.env?.VITE_MAIN_DOMAIN || 'gymmobius.com'
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom domains' },
  { value: 'issues', label: 'Issues' },
]

export default function DomainsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const term = useDebounced(search)

  const fetcher = useCallback(() => listDomains(), [])
  const { data, loading, error } = usePolledData(fetcher, { intervalMs: 0 })

  let rows = data || []
  if (filter === 'custom') rows = rows.filter((g) => g.custom_domain)
  if (filter === 'issues') rows = rows.filter((g) => g.custom_domain && (g.domain_status === 'pending' || g.domain_status === 'failed' || g.domain_verification_data?.misconfigured))
  const t = term.trim().toLowerCase()
  if (t) rows = rows.filter((g) => (g.name || '').toLowerCase().includes(t) || (g.custom_domain || '').toLowerCase().includes(t) || (g.subdomain || '').toLowerCase().includes(t))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Domains</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Subdomains + custom domains · verification &amp; DNS diagnostics</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--a-text-faint)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gym or domain…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }} />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: filter === f.value ? 'var(--a-accent-soft)' : 'var(--a-surface)', color: filter === f.value ? 'var(--a-accent-text)' : 'var(--a-text-dim)', border: '1px solid var(--a-border)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card padded={false}>
        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>{error.message}</p>}
        {loading && <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={20} />)}</div>}
        {!loading && !error && rows.length === 0 && <EmptyState Icon={Globe} title="No domains" hint="No gyms have claimed a subdomain or custom domain yet." />}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((g) => {
              const d = g.domain_verification_data || {}
              const hasIssue = g.custom_domain && (g.domain_status !== 'verified' || d.misconfigured)
              const open = expanded === g.id
              return (
                <div key={g.id}>
                  <button onClick={() => setExpanded(open ? null : g.id)} className="admin-hover block w-full px-4 py-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--a-text)' }}>{g.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
                          {g.subdomain && <span>{g.subdomain}.{MAIN_DOMAIN}</span>}
                          {g.custom_domain && <span style={{ color: 'var(--a-text-dim)' }}>{g.custom_domain}</span>}
                          {!g.subdomain && !g.custom_domain && <span>—</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasIssue && <AlertTriangle className="h-4 w-4" style={{ color: 'var(--a-tone-amber-fg)' }} />}
                        {g.custom_domain && <StatusPill status={g.domain_status || 'pending'} />}
                        {g.custom_domain && <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--a-text-faint)' }} />}
                      </div>
                    </div>
                  </button>

                  {open && g.custom_domain && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--a-border)', background: 'var(--a-surface-2)' }}>
                        <DnsRow label="Custom domain" value={g.custom_domain} href={g.domain_status === 'verified' ? `https://${g.custom_domain}` : null} />
                        <DnsRow label="Status" value={g.domain_status || 'pending'} />
                        <DnsRow label="Verified at" value={g.domain_verified_at ? dateTime(g.domain_verified_at) : '—'} />
                        <DnsRow label="A record (apex)" value={Array.isArray(d.apex_a) ? d.apex_a.join(', ') : (d.apex_a || '—')} mono />
                        <DnsRow label="CNAME target" value={d.cname_target || '—'} mono />
                        <DnsRow label="www claimed" value={d.www_claimed ? 'yes' : 'no'} />
                        {d.misconfigured && <DnsRow label="Misconfigured" value="yes — DNS not pointing correctly" warn />}
                        {d.www_error && <DnsRow label="www error" value={String(d.www_error)} warn />}
                        {d.dns_errors && <DnsRow label="DNS errors" value={JSON.stringify(d.dns_errors)} warn mono />}
                        {d.last_checked_at && <DnsRow label="Last checked" value={dateTime(d.last_checked_at)} />}
                      </div>
                      <button onClick={() => navigate(adminPath(`gyms/${g.id}`))}
                        className="mt-2 text-xs" style={{ color: 'var(--a-accent-text)' }}>
                        Open gym 360 →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
        Read-only diagnostics. Verify / recheck / detach run through the owner’s domain flow; SSL is auto-provisioned by Vercel on verification.
      </p>
    </div>
  )
}

function DnsRow({ label, value, mono, warn, href }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span style={{ color: 'var(--a-text-faint)' }}>{label}</span>
      <span className={`text-right ${mono ? 'font-mono' : ''}`} style={{ color: warn ? 'var(--a-tone-amber-fg)' : 'var(--a-text-dim)', wordBreak: 'break-all' }}>
        {href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">{value} <ExternalLink className="h-3 w-3" /></a> : value}
      </span>
    </div>
  )
}
