import { useState, useEffect, useCallback } from 'react'
import { uploadToTemp, moveToPermanent, deleteFile, isTempUrl, extractStoragePath } from '../services/storageService'
import { getDraftField, setDraftFields, clearDraftFields } from '../lib/cmsDraft'

// ─── Basic Mode ───────────────────────────────────────────────────────────────
// Manages a single image field through upload → temp → commit/discard lifecycle.
export function useCMSImage({ gymId, fieldKey, section, initialUrl = '' }) {
  const [url, setUrl] = useState(() => getDraftField(gymId, fieldKey)?.url ?? initialUrl)
  const [tempPath, setTempPath] = useState(() => getDraftField(gymId, fieldKey)?.tempPath ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const isPending = tempPath !== null

  useEffect(() => {
    if (!fieldKey) return
    if (url !== initialUrl || tempPath) {
      setDraftFields(gymId, {
        [fieldKey]: { url, tempPath, origUrl: initialUrl, section, uploadedAt: Date.now() },
      })
    } else {
      clearDraftFields(gymId, [fieldKey])
    }
  }, [url, tempPath]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file) => {
    setError('')
    setUploading(true)
    try {
      if (tempPath) await deleteFile(url).catch(() => {})
      const { url: newUrl, path } = await uploadToTemp(file, gymId)
      setUrl(newUrl)
      setTempPath(path)
    } catch (e) {
      setError(e.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [gymId, tempPath, url])

  const handleUrl = useCallback((externalUrl) => {
    if (tempPath) { deleteFile(url).catch(() => {}); setTempPath(null) }
    setUrl(externalUrl)
  }, [tempPath, url])

  const handleRemove = useCallback(async () => {
    if (tempPath) { await deleteFile(url).catch(() => {}); setTempPath(null) }
    setUrl('')
  }, [tempPath, url])

  // Call inside form's handleSave — moves temp → permanent, returns final URL.
  const commit = useCallback(async () => {
    if (!tempPath) return url
    const storagePath = extractStoragePath(url)
    if (!storagePath) return url
    const { url: permUrl } = await moveToPermanent(storagePath, gymId, section)
    setUrl(permUrl)
    setTempPath(null)
    if (fieldKey) clearDraftFields(gymId, [fieldKey])
    return permUrl
  }, [url, tempPath, gymId, section, fieldKey])

  // Call on Cancel in inline forms — deletes temp file, restores original URL.
  const discard = useCallback(async () => {
    if (tempPath) { await deleteFile(url).catch(() => {}); setTempPath(null) }
    setUrl(initialUrl)
    if (fieldKey) clearDraftFields(gymId, [fieldKey])
  }, [tempPath, url, initialUrl, gymId, fieldKey])

  return { url, isPending, uploading, error, handleFile, handleUrl, handleRemove, commit, discard }
}

// ─── List Mode ────────────────────────────────────────────────────────────────
// Manages a list of image URLs (gallery, hero_images, about_images).
export function useCMSImageList({ gymId, fieldKey, section, initialList = [] }) {
  const draft = getDraftField(gymId, fieldKey)
  const [list, setList] = useState(() => draft?.list ?? initialList)
  const [tempPaths, setTempPaths] = useState(() => draft?.tempPaths ?? {})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const isPending = Object.keys(tempPaths).length > 0

  useEffect(() => {
    if (!fieldKey) return
    const changed = isPending
      || list.length !== initialList.length
      || list.some((u, i) => u !== initialList[i])
    if (changed) {
      setDraftFields(gymId, {
        [fieldKey]: { list, tempPaths, origList: initialList, section, uploadedAt: Date.now() },
      })
    } else {
      clearDraftFields(gymId, [fieldKey])
    }
  }, [list, tempPaths]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file) => {
    setError('')
    setUploading(true)
    try {
      const { url, path } = await uploadToTemp(file, gymId)
      setList(p => [...p, url])
      setTempPaths(p => ({ ...p, [url]: path }))
    } catch (e) {
      setError(e.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [gymId])

  const handleDelete = useCallback(async (targetUrl) => {
    setList(p => p.filter(u => u !== targetUrl))
    if (tempPaths[targetUrl]) {
      await deleteFile(targetUrl).catch(() => {})
      setTempPaths(p => { const n = { ...p }; delete n[targetUrl]; return n })
    }
    // Permanent file deletions are deferred to commitList (diffed against initialList)
  }, [tempPaths])

  const handleUrlAdd = useCallback((externalUrl) => {
    const trimmed = externalUrl?.trim()
    if (!trimmed || list.includes(trimmed)) return
    setList(p => [...p, trimmed])
  }, [list])

  // Call on form Save — moves all temp items to permanent, diffs and deletes removals.
  const commitList = useCallback(async () => {
    const final = []
    for (const u of list) {
      if (tempPaths[u]) {
        const storagePath = extractStoragePath(u)
        if (storagePath) {
          const { url: perm } = await moveToPermanent(storagePath, gymId, section)
          final.push(perm)
        } else {
          final.push(u)
        }
      } else {
        final.push(u)
      }
    }
    // Delete permanent files that were removed from the list
    const removed = initialList.filter(u => !final.includes(u) && !isTempUrl(u))
    await Promise.allSettled(removed.map(u => deleteFile(u)))
    setList(final)
    setTempPaths({})
    if (fieldKey) clearDraftFields(gymId, [fieldKey])
    return final
  }, [list, tempPaths, initialList, gymId, section, fieldKey])

  // Call on Cancel in inline forms — deletes all temp uploads, restores original list.
  const discardList = useCallback(async () => {
    await Promise.allSettled(Object.keys(tempPaths).map(u => deleteFile(u)))
    setList(initialList)
    setTempPaths({})
    if (fieldKey) clearDraftFields(gymId, [fieldKey])
  }, [tempPaths, initialList, gymId, fieldKey])

  return {
    list, isPending, uploading, error,
    handleFile, handleDelete, handleUrlAdd,
    commitList, discardList,
    setList,
  }
}
