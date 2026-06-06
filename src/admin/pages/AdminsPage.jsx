import { useCallback, useState } from 'react'
import { Users, UserPlus, ShieldAlert, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { listAdmins, manageAdmin } from '../services/adminStaffService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { ADMIN_ROLES, ROLE_LABELS } from '../lib/adminRbac'
import { dateTime, relativeTime } from '../lib/format'

export default function AdminsPage() {
  const { role, admin: me } = useAdminAuth()
  const fetcher = useCallback(() => listAdmins(), [])
  const { data, loading, error, refresh } = usePolledData(fetcher, { intervalMs: 0, enabled: role === 'super_admin' })

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'support' })
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [rowBusy, setRowBusy] = useState(null)

  if (role !== 'super_admin') {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <p className="text-sm" style={{ color: 'var(--a-text-dim)' }}>Only super admins can manage platform staff.</p>
        </div>
      </Card>
    )
  }

  const admins = data || []

  async function createAdmin() {
    setBusy(true); setFormErr('')
    try {
      await manageAdmin({ action: 'create', email: form.email.trim(), name: form.name.trim() || undefined, role: form.role })
      setCreateOpen(false); setForm({ email: '', name: '', role: 'support' })
      await refresh()
    } catch (err) {
      setFormErr(err.message || 'Failed to add admin')
    } finally {
      setBusy(false)
    }
  }

  async function rowAction(body, id) {
    setRowBusy(id)
    try { await manageAdmin(body); await refresh() }
    catch (err) { alert(err.message || 'Action failed') }
    finally { setRowBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Platform Admins</h1>
          <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Manage internal staff + roles</p>
        </div>
        <button onClick={() => { setCreateOpen(true); setFormErr('') }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--a-accent)' }}>
          <UserPlus className="h-4 w-4" /> Add admin
        </button>
      </div>

      <Card padded={false}>
        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>Failed to load: {error.message}</p>}
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-5 py-4"><Sk h={18} /></div>)}
        {!loading && !error && admins.length === 0 && <EmptyState Icon={Users} title="No admins yet" />}

        {!loading && !error && admins.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {admins.map((a) => {
              const isMe = a.id === me?.id
              return (
                <div key={a.id} className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--a-text)' }}>
                      {a.name || a.email}{isMe && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--a-text-faint)' }}>(you)</span>}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--a-text-faint)' }}>
                      {a.email} · added {dateTime(a.created_at)}{a.last_login_at ? ` · last seen ${relativeTime(a.last_login_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={a.is_active ? 'active' : 'cancelled'} label={a.is_active ? 'Active' : 'Inactive'} />
                    <select
                      value={a.role}
                      disabled={rowBusy === a.id}
                      onChange={(e) => rowAction({ action: 'set_role', userId: a.id, role: e.target.value }, a.id)}
                      className="admin-input w-auto py-1.5 text-xs"
                    >
                      {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    {!isMe && (
                      a.is_active ? (
                        <button onClick={() => rowAction({ action: 'deactivate', userId: a.id }, a.id)} disabled={rowBusy === a.id}
                          className="rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}>
                          {rowBusy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Deactivate'}
                        </button>
                      ) : (
                        <button onClick={() => rowAction({ action: 'reactivate', userId: a.id }, a.id)} disabled={rowBusy === a.id}
                          className="rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#34d399' }}>
                          {rowBusy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reactivate'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => !busy && setCreateOpen(false)} title="Add platform admin">
        <p className="mb-4 text-sm" style={{ color: 'var(--a-text-dim)' }}>
          The person must already have a Gymmobius account (sign up first). We grant their admin role here.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="person@gymmobius.com" className="admin-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Name (optional)</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="admin-input">
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
        </div>
        {formErr && <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{formErr}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>Cancel</button>
          <button onClick={createAdmin} disabled={busy || !form.email.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--a-accent)' }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add admin
          </button>
        </div>
      </Modal>
    </div>
  )
}
