import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Loader2, LogOut, KeyRound } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useAdminAuth } from '../store/AdminAuthContext'

/**
 * MFA gate shown when an admin session is not yet AAL2.
 *   mfaStatus === 'enroll'    → admin has no TOTP factor → show QR enroll.
 *   mfaStatus === 'challenge' → factor exists, session aal1 → ask for a code.
 * On successful verify, the session upgrades to aal2; recheckMfa() flips the
 * gate and the panel renders.
 */
export default function AdminMfaGate() {
  const { mfaStatus, recheckMfa, logout } = useAdminAuth()
  const enrolling = mfaStatus === 'enroll'

  const [factorId, setFactorId] = useState(null)
  const [qr, setQr] = useState(null)
  const [secret, setSecret] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [setupErr, setSetupErr] = useState('')
  const startedRef = useRef(false)

  // Prepare the factor once: enroll (new TOTP) or pick the existing factor.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    ;(async () => {
      try {
        if (enrolling) {
          // Clean up any stale unverified factor from an abandoned attempt.
          const { data: list } = await supabase.auth.mfa.listFactors()
          const stale = (list?.all || []).filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
          for (const f of stale) { try { await supabase.auth.mfa.unenroll({ factorId: f.id }) } catch { /* ignore */ } }

          const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp', friendlyName: `Gymmobius Admin ${Date.now()}`,
          })
          if (error) throw error
          setFactorId(data.id)
          setQr(data.totp?.qr_code ?? null)
          setSecret(data.totp?.secret ?? null)
        } else {
          const { data, error } = await supabase.auth.mfa.listFactors()
          if (error) throw error
          const totp = (data?.totp || [])[0]
          if (!totp) { setSetupErr('No authenticator found. Sign out and back in to enroll.'); return }
          setFactorId(totp.id)
        }
      } catch (err) {
        setSetupErr(err?.message || 'Failed to start MFA setup')
      }
    })()
  }, [enrolling])

  async function verify(e) {
    e.preventDefault()
    if (!factorId || code.trim().length < 6) return
    setBusy(true); setError('')
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr) throw chErr
      const { data: vData, error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code: code.trim(),
      })
      if (vErr) throw vErr
      // vData is the upgraded AAL2 session — hand it to the context so it can
      // resolve assurance locally (no extra auth call → no lock contention).
      await recheckMfa(vData)   // gate clears → panel renders
    } catch (err) {
      setError(err?.message || 'Invalid code — try again')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-admin flex min-h-screen items-center justify-center px-4">
      <div className="admin-fade-in w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--a-accent-soft)' }}>
            <ShieldCheck className="h-6 w-6" style={{ color: 'var(--a-accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>
              {enrolling ? 'Set up two-factor auth' : 'Two-factor verification'}
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
              {enrolling
                ? 'Admin access requires an authenticator app (TOTP).'
                : 'Enter the 6-digit code from your authenticator app.'}
            </p>
          </div>
        </div>

        {setupErr && (
          <p className="mb-4 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{setupErr}</p>
        )}

        {enrolling && qr && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <img src={qr} alt="Scan with your authenticator app" width={168} height={168}
              className="rounded-lg bg-white p-2" />
            {secret && (
              <p className="text-center text-[11px]" style={{ color: 'var(--a-text-faint)' }}>
                Or enter manually: <code style={{ color: 'var(--a-text-dim)' }}>{secret}</code>
              </p>
            )}
          </div>
        )}

        {enrolling && !qr && !setupErr && (
          <div className="mb-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--a-text-dim)' }} /></div>
        )}

        <form onSubmit={verify} className="flex flex-col gap-3">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--a-text-faint)' }} />
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              placeholder="123456" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-center text-lg tracking-[0.3em] outline-none"
              style={{ background: 'var(--a-surface-2)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
            />
          </div>

          {error && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{error}</p>
          )}

          <button type="submit" disabled={busy || code.length < 6 || !factorId}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--a-accent)' }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {enrolling ? 'Verify & enable' : 'Verify'}
          </button>
        </form>

        <button onClick={logout} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  )
}
