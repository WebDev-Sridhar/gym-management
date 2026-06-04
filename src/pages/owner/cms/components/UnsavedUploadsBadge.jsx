// Amber pill rendered next to CMS Save buttons whenever an image upload is
// pending commit (i.e. lives in storage's temp/ prefix + a localStorage draft,
// but not yet written into gym_content). Reminds the owner to hit Save so the
// upload survives logout / 24h cron sweep.
//
// Usage: <UnsavedUploadsBadge pending={imgs.isPending} hide={saving || success} />

export default function UnsavedUploadsBadge({ pending, hide = false }) {
  if (!pending || hide) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Unsaved uploads — click Save to keep them
    </span>
  )
}
