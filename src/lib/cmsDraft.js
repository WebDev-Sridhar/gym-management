const PREFIX = 'cms_draft_'
const STALE_MS = 24 * 60 * 60 * 1000

export function getDraft(gymId) {
  try { return JSON.parse(localStorage.getItem(PREFIX + gymId) || '{}') } catch { return {} }
}

export function getDraftField(gymId, key) {
  return getDraft(gymId)[key] ?? null
}

export function setDraftFields(gymId, fields) {
  try {
    localStorage.setItem(PREFIX + gymId, JSON.stringify({ ...getDraft(gymId), ...fields }))
  } catch { /* localStorage quota exceeded — degrade gracefully */ }
}

export function clearDraftFields(gymId, keys) {
  const d = getDraft(gymId)
  keys.forEach(k => delete d[k])
  try {
    Object.keys(d).length
      ? localStorage.setItem(PREFIX + gymId, JSON.stringify(d))
      : localStorage.removeItem(PREFIX + gymId)
  } catch { /* silent */ }
}

export function clearAllDraft(gymId) {
  try { localStorage.removeItem(PREFIX + gymId) } catch { /* silent */ }
}

export async function sweepStaleDraftEntries(gymId) {
  const { deleteFile } = await import('../services/storageService')
  const draft = getDraft(gymId)
  const staleKeys = []
  const deletes = []
  for (const [key, entry] of Object.entries(draft)) {
    if (Date.now() - (entry.uploadedAt || 0) > STALE_MS) {
      staleKeys.push(key)
      if (entry.tempPath) deletes.push(deleteFile(entry.url))
      if (entry.tempPaths) Object.keys(entry.tempPaths).forEach(u => deletes.push(deleteFile(u)))
    }
  }
  await Promise.allSettled(deletes)
  if (staleKeys.length) clearDraftFields(gymId, staleKeys)
}
