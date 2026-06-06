import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  return (
    <div className="flex items-center justify-between px-1 pt-3">
      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 0}
          className="rounded-md border p-1.5 disabled:opacity-40"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs" style={{ color: 'var(--a-text-dim)' }}>{page + 1} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page + 1 >= pages}
          className="rounded-md border p-1.5 disabled:opacity-40"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
