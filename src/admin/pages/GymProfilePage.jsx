import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Ban, CheckCircle2, Users, Dumbbell, Building, Globe, CreditCard,
  MessageSquare, ScrollText, Gauge, Mail, Phone, ExternalLink,
} from 'lucide-react'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import { ActionModal } from '../components/ui/Modal'
import SubscriptionActions from '../components/SubscriptionActions'
import { getGymProfile, gymAction } from '../services/adminGymService'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { inr, date, dateTime, planLabel, daysUntil } from '../lib/format'
import { getPlanCap, getWhatsappCap } from '../../lib/featureGates'

const TABS = [
  { key: 'subscription', label: 'Subscription', Icon: CreditCard },
  { key: 'members', label: 'Members', Icon: Users },
  { key: 'payments', label: 'Payments', Icon: CreditCard },
  { key: 'messaging', label: 'Messaging', Icon: MessageSquare },
  { key: 'domains', label: 'Domains', Icon: Globe },
  { key: 'quota', label: 'Quotas', Icon: Gauge },
  { key: 'audit', label: 'Audit', Icon: ScrollText },
]

export default function GymProfilePage() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  const { role } = useAdminAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('subscription')

  // Suspend / reactivate modal
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionErr, setActionErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getGymProfile(gymId)
      setData(d); setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <Sk h={28} w={180} />
        <Sk h={120} r={12} />
        <Sk h={300} r={12} />
      </div>
    )
  }
  if (error) return <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}><p style={{ color: '#fca5a5' }}>{error.message}</p></Card>
  if (!data) return <EmptyState Icon={Building} title="Gym not found" />

  const { gym, owner, currentSub, counts } = data
  const suspended = gym.status === 'suspended'

  async function doSuspendToggle() {
    setBusy(true); setActionErr('')
    try {
      await gymAction({ action: suspended ? 'reactivate' : 'suspend', gymId, reason: reason.trim() || undefined })
      setSuspendOpen(false); setReason('')
      await load()
    } catch (err) {
      setActionErr(err.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--a-text-dim)' }}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold"
              style={{ background: 'var(--a-surface-2)', color: 'var(--a-text-dim)' }}>
              {(gym.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>{gym.name}</h1>
                <StatusPill status={gym.status} />
              </div>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--a-text-faint)' }}>
                /{gym.slug}{gym.city ? ` · ${gym.city}` : ''} · joined {date(gym.created_at)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--a-text-dim)' }}>
                <span>Plan: <strong style={{ color: 'var(--a-text)' }}>{planLabel(currentSub?.plan_name)}</strong></span>
                {currentSub && <StatusPill status={currentSub.status} />}
                {currentSub?.is_founder_pricing && <span style={{ color: 'var(--a-accent-text)' }}>Founder</span>}
                {owner?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{owner.email}</span>}
                {owner?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{owner.phone}</span>}
              </div>
            </div>
          </div>

          {can(role, 'gym.suspend') && (
            <button
              onClick={() => { setSuspendOpen(true); setReason(''); setActionErr('') }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: suspended ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)', color: suspended ? '#34d399' : '#f87171' }}
            >
              {suspended ? <><CheckCircle2 className="h-3.5 w-3.5" /> Reactivate</> : <><Ban className="h-3.5 w-3.5" /> Suspend</>}
            </button>
          )}
        </div>

        {suspended && gym.suspended_reason && (
          <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
            Suspended {gym.suspended_at ? `on ${date(gym.suspended_at)}` : ''} — {gym.suspended_reason}
          </p>
        )}

        {/* quick counts */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat Icon={Users} label="Members" value={counts.members} />
          <Stat Icon={Dumbbell} label="Trainers" value={counts.trainers} />
          <Stat Icon={Building} label="Branches" value={counts.branches} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              background: tab === key ? 'var(--a-accent-soft)' : 'transparent',
              color: tab === key ? 'var(--a-accent-text)' : 'var(--a-text-dim)',
            }}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'subscription' && <SubscriptionTab data={data} onDone={load} gymId={gymId} />}
      {tab === 'members' && <MembersTab data={data} />}
      {tab === 'payments' && <PaymentsTab data={data} />}
      {tab === 'messaging' && <MessagingTab data={data} />}
      {tab === 'domains' && <DomainsTab gym={gym} />}
      {tab === 'quota' && <QuotaTab data={data} />}
      {tab === 'audit' && <AuditTab data={data} />}

      <ActionModal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title={suspended ? 'Reactivate gym' : 'Suspend gym'}
        description={suspended
          ? 'Restore full access for this gym’s owner and members.'
          : 'The owner will be blocked from the dashboard with a “suspended” screen.'}
        confirmLabel={suspended ? 'Reactivate' : 'Suspend'}
        destructive={!suspended}
        requireReason={!suspended}
        busy={busy}
        error={actionErr}
        reason={reason}
        setReason={setReason}
        onConfirm={doSuspendToggle}
      />
    </div>
  )
}

function Stat({ Icon, label, value }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--a-border)', background: 'var(--a-surface-2)' }}>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-lg font-bold" style={{ color: 'var(--a-text)' }}>{value}</p>
    </div>
  )
}

function SubscriptionTab({ data, onDone, gymId }) {
  const { subscriptions, currentSub } = data
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={<SubscriptionActions gymId={gymId} currentSub={currentSub} onDone={onDone} />}>
          Current subscription
        </SectionTitle>
        {currentSub ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV label="Plan" value={planLabel(currentSub.plan_name)} />
            <KV label="Status" value={<StatusPill status={currentSub.status} />} />
            <KV label="Amount" value={inr(currentSub.amount)} />
            <KV label="Expires" value={`${date(currentSub.expires_at)}${daysUntil(currentSub.expires_at) != null ? ` (${daysUntil(currentSub.expires_at)}d)` : ''}`} />
            <KV label="Founder" value={currentSub.is_founder_pricing ? `Yes · until ${date(currentSub.founder_pricing_until)}` : 'No'} />
            <KV label="Last paid" value={date(currentSub.paid_at)} />
          </div>
        ) : <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>No subscription on record.</p>}
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-4"><SectionTitle>Timeline</SectionTitle></div>
        {subscriptions.length === 0
          ? <EmptyState Icon={CreditCard} title="No subscription history" />
          : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {subscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--a-text)' }}>
                      {planLabel(s.plan_name)} · {inr(s.amount)}
                      {s.is_founder_pricing && <span className="ml-1 text-[11px]" style={{ color: 'var(--a-accent-text)' }}>Founder</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {date(s.starts_at || s.created_at)} → {date(s.expires_at)}
                    </p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  )
}

function MembersTab({ data }) {
  return (
    <Card>
      <SectionTitle>Membership</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <KV label="Active members" value={data.counts.members} />
        <KV label="Trainers" value={data.counts.trainers} />
        <KV label="Branches" value={data.counts.branches} />
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--a-text-faint)' }}>
        Per-member drill-down ships in a later phase. Counts exclude soft-deleted members.
      </p>
    </Card>
  )
}

function PaymentsTab({ data }) {
  const { payments } = data
  return (
    <Card padded={false}>
      <div className="px-5 pt-4"><SectionTitle>Recent member payments</SectionTitle></div>
      {payments.length === 0
        ? <EmptyState Icon={CreditCard} title="No payments yet" />
        : (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm" style={{ color: 'var(--a-text)' }}>{inr(p.amount)} · {p.member?.name || 'Member'}</p>
                  <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{p.source || 'payment'} · {date(p.paid_at || p.created_at)}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        )}
    </Card>
  )
}

function MessagingTab({ data }) {
  const { notifications, reminders } = data
  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="px-5 pt-4"><SectionTitle>Recent notifications</SectionTitle></div>
        {notifications.length === 0
          ? <EmptyState Icon={MessageSquare} title="No notifications" />
          : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--a-text)' }}>{n.type}</p>
                    <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {(n.channels || []).join(', ')} · {n.triggered_by} · {dateTime(n.created_at)}
                    </p>
                  </div>
                  <StatusPill status={n.status} />
                </div>
              ))}
            </div>
          )}
      </Card>
      <Card padded={false}>
        <div className="px-5 pt-4"><SectionTitle>Recent payment reminders</SectionTitle></div>
        {reminders.length === 0
          ? <EmptyState Icon={MessageSquare} title="No reminders sent" />
          : (
            <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--a-text)' }}>{r.template_name || r.channel}</p>
                    <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{r.channel} · {dateTime(r.sent_at)}</p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  )
}

function DomainsTab({ gym }) {
  const mainDomain = (import.meta.env?.VITE_MAIN_DOMAIN || 'gymmobius.com')
  return (
    <Card>
      <SectionTitle>Domains</SectionTitle>
      <div className="space-y-3">
        <DomainRow label="Path" value={`${mainDomain}/${gym.slug}`} />
        <DomainRow label="Subdomain" value={gym.subdomain ? `${gym.subdomain}.${mainDomain}` : '—'} />
        <DomainRow
          label="Custom domain"
          value={gym.custom_domain || '—'}
          pill={gym.custom_domain ? <StatusPill status={gym.domain_status || 'pending'} /> : null}
          href={gym.custom_domain && gym.domain_status === 'verified' ? `https://${gym.custom_domain}` : null}
        />
        {gym.domain_verified_at && (
          <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>Verified {dateTime(gym.domain_verified_at)}</p>
        )}
      </div>
    </Card>
  )
}

function DomainRow({ label, value, pill, href }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5"
      style={{ borderColor: 'var(--a-border)', background: 'var(--a-surface-2)' }}>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{label}</p>
        <p className="truncate text-sm" style={{ color: 'var(--a-text)' }}>{value}</p>
      </div>
      <div className="flex items-center gap-2">
        {pill}
        {href && <a href={href} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" style={{ color: 'var(--a-text-dim)' }} /></a>}
      </div>
    </div>
  )
}

function QuotaTab({ data }) {
  const { currentSub, counts } = data
  const plan = currentSub?.plan_name || 'free'
  const status = currentSub?.status
  const memberCap = getPlanCap('members', plan, status)
  const trainerCap = getPlanCap('trainers', plan, status)
  const waCap = getWhatsappCap(currentSub || { plan_name: plan, status })

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Usage vs plan caps</SectionTitle>
        <div className="space-y-3">
          <QuotaBar label="Members" used={counts.members} cap={memberCap} />
          <QuotaBar label="Trainers" used={counts.trainers} cap={trainerCap} />
          <QuotaBar label="WhatsApp / period" used={null} cap={waCap} note="Live usage on the Messaging dashboard (P2)" />
        </div>
      </Card>
      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
        Caps are derived from the current plan ({planLabel(plan)}{status === 'trial' ? ', trial bump applied' : ''}).
        Quota overrides + storage metering arrive with the Quotas module (P3).
      </p>
    </div>
  )
}

function QuotaBar({ label, used, cap, note }) {
  const unlimited = !Number.isFinite(cap)
  const pct = unlimited || used == null || cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100))
  const danger = pct >= 90
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: 'var(--a-text-dim)' }}>{label}</span>
        <span style={{ color: 'var(--a-text-faint)' }}>
          {used == null ? '' : used}{used == null ? '' : ' / '}{unlimited ? 'Unlimited' : cap}
        </span>
      </div>
      {used != null && !unlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--a-surface-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: danger ? 'var(--a-danger)' : 'var(--a-accent)' }} />
        </div>
      )}
      {note && <p className="mt-1 text-[11px]" style={{ color: 'var(--a-text-faint)' }}>{note}</p>}
    </div>
  )
}

function AuditTab({ data }) {
  const { audit } = data
  return (
    <Card padded={false}>
      <div className="px-5 pt-4"><SectionTitle>Admin actions on this gym</SectionTitle></div>
      {audit.length === 0
        ? <EmptyState Icon={ScrollText} title="No admin actions recorded" />
        : (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {audit.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--a-text)' }}>{a.action}</p>
                  <span className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{dateTime(a.created_at)}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
                  {a.admin_email} ({a.admin_role}){a.reason ? ` · ${a.reason}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
    </Card>
  )
}

function KV({ label, value }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{label}</p>
      <div className="mt-0.5 text-sm" style={{ color: 'var(--a-text)' }}>{value}</div>
    </div>
  )
}
