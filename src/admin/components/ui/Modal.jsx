import { useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

/** Base centered modal with overlay. Closes on Esc + backdrop click. */
export default function Modal({ open, onClose, title, children, maxWidth = 440 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className="admin-fade-in w-full rounded-2xl border"
        style={{ maxWidth, background: 'var(--a-surface)', borderColor: 'var(--a-border-strong)' }}
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--a-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className="admin-hover rounded-md p-1">
            <X className="h-4 w-4" style={{ color: 'var(--a-text-dim)' }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/**
 * Confirm dialog with a mandatory/optional reason field (audited actions).
 * `extra` renders additional inputs above the reason field.
 */
export function ActionModal({
  open, onClose, title, description, confirmLabel = 'Confirm',
  destructive = false, requireReason = false, busy = false, error = '',
  reason, setReason, extra, onConfirm,
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
      {description && (
        <p className="mb-4 text-sm" style={{ color: 'var(--a-text-dim)' }}>{description}</p>
      )}

      {extra}

      <label className="mb-1.5 mt-3 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>
        Reason {requireReason ? <span style={{ color: '#f87171' }}>*</span> : <span style={{ color: 'var(--a-text-faint)' }}>(optional)</span>}
      </label>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Recorded in the audit log…"
        className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ background: 'var(--a-surface-2)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
      />

      {error && (
        <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy || (requireReason && !reason?.trim())}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: destructive ? 'var(--a-danger)' : 'var(--a-accent)' }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
