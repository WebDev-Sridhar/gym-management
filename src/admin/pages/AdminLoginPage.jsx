import { useState } from 'react'
import { useAdminAuth } from '../store/AdminAuthContext'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const { login } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err?.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-admin flex min-h-screen items-center justify-center px-4">
      <div
        className="admin-fade-in w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'var(--a-accent-soft)' }}
          >
            <ShieldCheck className="h-6 w-6" style={{ color: 'var(--a-accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>
              Gymmobius Admin
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
              Internal control plane — staff only
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="you@gymmobius.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--a-surface-2)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--a-surface-2)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          />

          {error && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--a-accent)' }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
