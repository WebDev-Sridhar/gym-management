import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { supabaseData } from '../../../../services/supabaseClient'
import { getImageLimit } from '../../../../lib/featureGates'

/**
 * ImageUploader — upload, list, select and delete images for a CMS section.
 *
 * Basic mode (no imageList prop):
 *   Shows a single image preview + upload/URL input. Behaves as before.
 *
 * List mode (imageList + onListChange props provided):
 *   Shows a grid of all uploaded images. Each has Select + Delete actions.
 *   Upload appends to the list. The "selected" image is currentUrl.
 *   Usage count is derived from imageList.length.
 */
export default function ImageUploader({
  gymId,
  section,
  currentUrl = '',
  onChange,
  planName = 'Starter',
  usageCount,          // only used in basic mode (no imageList)
  imageList,           // array of URL strings — enables list mode
  onListChange,        // fn(newList) — called when list changes
  label,
  hint,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [localUrl, setLocalUrl]   = useState(currentUrl)
  const fileRef = useRef(null)

  const listMode = Array.isArray(imageList) && typeof onListChange === 'function'
  const count    = listMode ? imageList.length : (usageCount ?? 0)
  const limit    = getImageLimit(planName, section)
  const atLimit  = count >= limit

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (atLimit) {
      setError(`Limit reached: ${count} / ${limit} images for this section.`)
      return
    }

    setUploading(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        fileType: 'image/webp',
        useWebWorker: true,
      })

      const path = `${gymId}/${section}/${Date.now()}.webp`
      const { error: uploadErr } = await supabaseData.storage
        .from('gym-images')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' })
      if (uploadErr) throw uploadErr

      const { data } = supabaseData.storage.from('gym-images').getPublicUrl(path)
      const publicUrl = data.publicUrl

      if (listMode) {
        const newList = [...imageList, publicUrl]
        onListChange(newList)
        onChange(publicUrl)   // auto-select the newly uploaded image
      } else {
        setLocalUrl(publicUrl)
        onChange(publicUrl)
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Delete (list mode) ───────────────────────────────────────────────────────
  async function handleDelete(url) {
    if (!window.confirm('Remove this image?')) return
    // Attempt storage delete for images uploaded to our bucket
    const marker = '/gym-images/'
    if (url.includes(marker)) {
      const storagePath = url.split(marker)[1]
      await supabaseData.storage.from('gym-images').remove([storagePath]).catch(() => {})
    }
    const newList = imageList.filter(u => u !== url)
    onListChange(newList)
    // If deleted image was selected, clear or switch to first remaining
    if (url === currentUrl) {
      onChange(newList[0] ?? '')
    }
  }

  function handleUrlChange(e) {
    setLocalUrl(e.target.value)
    onChange(e.target.value)
  }

  function addUrlToList() {
    if (!localUrl.trim() || imageList.includes(localUrl.trim())) return
    if (atLimit) { setError(`Limit reached: ${count} / ${limit}`); return }
    const newList = [...imageList, localUrl.trim()]
    onListChange(newList)
    onChange(localUrl.trim())
  }

  const inputCls =
    'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {/* ── LIST MODE ─────────────────────────────────────────────────── */}
      {listMode ? (
        <>
          {/* Image grid */}
          {imageList.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageList.map((url, i) => (
                <div key={i} className={`relative group rounded-xl overflow-hidden border-2 transition-all ${url === currentUrl ? 'border-violet-500' : 'border-transparent'}`}
                  style={{ aspectRatio: '4/3' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {url !== currentUrl && (
                      <button type="button" onClick={() => onChange(url)}
                        className="px-2 py-1 text-xs font-semibold bg-white text-gray-800 rounded-lg hover:bg-violet-600 hover:text-white transition-colors cursor-pointer">
                        Use
                      </button>
                    )}
                    <button type="button" onClick={() => handleDelete(url)}
                      className="px-2 py-1 text-xs font-semibold bg-white text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-colors cursor-pointer">
                      Del
                    </button>
                  </div>
                  {url === currentUrl && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload + usage */}
          <div className="flex items-center gap-3 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading || atLimit} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || atLimit}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${atLimit ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400 hover:text-violet-700'}`}>
              {uploading ? (
                <><span className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />Uploading…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Upload Image</>
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex gap-0.5">
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < count ? 'bg-violet-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <span>{count} / {limit} used</span>
            </div>
          </div>

          {/* URL add */}
          <div className="flex gap-2">
            <input type="url" value={localUrl} onChange={e => setLocalUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-…" className={inputCls + ' flex-1'} />
            <button type="button" onClick={addUrlToList} disabled={!localUrl.trim() || atLimit}
              className="px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 cursor-pointer transition-colors shrink-0">
              Add
            </button>
          </div>
        </>
      ) : (
        /* ── BASIC MODE ──────────────────────────────────────────────── */
        <>
          {localUrl && (
            <div className="relative rounded-xl overflow-hidden bg-gray-100 h-32 group">
              <img src={localUrl} alt="Current" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading || atLimit} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || atLimit}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${atLimit ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400 hover:text-violet-700'}`}>
              {uploading ? (
                <><span className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />Uploading…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>{localUrl ? 'Replace Image' : 'Upload Image'}</>
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex gap-0.5">
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < count ? 'bg-violet-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <span>{count} / {limit} used</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Or paste an image URL</p>
            <input type="url" value={localUrl} onChange={handleUrlChange}
              placeholder="https://images.unsplash.com/photo-…" className={inputCls} />
          </div>
        </>
      )}

      {hint  && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
