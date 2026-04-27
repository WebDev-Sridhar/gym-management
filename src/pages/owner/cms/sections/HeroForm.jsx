import { useState } from 'react'
import { upsertCmsContent } from '../../../../services/gymCmsService'
import { updateGymDetails } from '../../../../services/membershipService'
import { canAccess } from '../../../../lib/featureGates'
import { useCMSImageList } from '../../../../hooks/useCMSImage'
import ImageUploader from '../components/ImageUploader'
import { useDialog } from '../../../../components/ui/Dialog'

const inputCls =
  'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

function Field({ label, hint, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

function SaveBtn({ saving }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60"
    >
      {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
      {saving ? 'Saving…' : 'Save Changes'}
    </button>
  )
}

function SuccessMsg({ msg }) {
  if (!msg) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </span>
  )
}

const HERO_STYLES = [
  {
    id: 'A',
    label: 'Style A',
    desc: 'Parallax full-screen',
    preview: (
      <div className="w-full h-full bg-gray-900 flex items-end p-2">
        <div className="space-y-1">
          <div className="h-2 w-16 bg-white/80 rounded" />
          <div className="h-1.5 w-10 bg-white/40 rounded" />
        </div>
      </div>
    ),
    pro: false,
  },
  {
    id: 'B',
    label: 'Style B',
    desc: 'Centered overlay',
    preview: (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-center space-y-1">
          <div className="h-2 w-14 bg-white/80 rounded mx-auto" />
          <div className="h-1.5 w-9 bg-white/40 rounded mx-auto" />
        </div>
      </div>
    ),
    pro: false,
  },
  {
    id: 'C',
    label: 'Style C',
    desc: 'Split layout',
    preview: (
      <div className="w-full h-full flex">
        <div className="w-1/2 bg-gray-900 flex items-center justify-center p-2">
          <div className="space-y-1">
            <div className="h-2 w-10 bg-white/80 rounded" />
            <div className="h-1.5 w-7 bg-white/40 rounded" />
          </div>
        </div>
        <div className="w-1/2 bg-gray-600" />
      </div>
    ),
    pro: true,
  },
]

export default function HeroForm({ content, gym, gymId, planName, onSave, onSaveGym, setPreviewData }) {
  const dialog = useDialog()
  const [title, setTitle] = useState(content?.hero_title || '')
  const [subtitle, setSubtitle] = useState(content?.hero_subtitle || '')
  const [selectedImage, setSelectedImage] = useState(content?.hero_image || '')
  const [heroStyle, setHeroStyle] = useState(gym?.hero_style || 'A')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const heroImgs = useCMSImageList({
    gymId,
    fieldKey: 'hero_images',
    section: 'hero',
    initialList: content?.hero_images || [],
  })

  function handleTitleChange(val) {
    setTitle(val)
    setPreviewData?.(prev => ({ ...prev, hero_title: val }))
  }

  function handleSubtitleChange(val) {
    setSubtitle(val)
    setPreviewData?.(prev => ({ ...prev, hero_subtitle: val }))
  }

  function handleSelectedChange(url) {
    setSelectedImage(url)
    setPreviewData?.(prev => ({ ...prev, hero_image: url }))
  }

  // Called by ImageUploader when list changes via URL-add or delete buttons
  function handleListChange(newList) {
    const deleted = heroImgs.list.filter(u => !newList.includes(u))
    if (deleted.length > 0) {
      // ImageUploader already deleted from storage; hook cleans up tempPaths
      deleted.forEach(u => heroImgs.handleDelete(u))
      if (selectedImage && deleted.includes(selectedImage)) {
        setSelectedImage(newList[0] ?? '')
      }
      return
    }
    // External URL added via "Add" button
    const added = newList.filter(u => !heroImgs.list.includes(u))
    added.forEach(u => heroImgs.handleUrlAdd(u))
  }

  function handleStyleChange(styleId) {
    setHeroStyle(styleId)
    setPreviewData?.(p => ({ ...p, _hero_style: styleId }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const finalList = await heroImgs.commitList()
      // Map selectedImage to its final URL (temp URLs get remapped to permanent)
      const selectedIdx = heroImgs.list.indexOf(selectedImage)
      const finalSelected = selectedIdx >= 0
        ? (finalList[selectedIdx] ?? finalList[0] ?? '')
        : (finalList.includes(selectedImage) ? selectedImage : (finalList[0] ?? ''))

      const [updated, updatedGym] = await Promise.all([
        upsertCmsContent(gymId, {
          hero_title:    title.trim() || null,
          hero_subtitle: subtitle.trim() || null,
          hero_image:    finalSelected || null,
          hero_images:   finalList.length ? finalList : null,
        }),
        updateGymDetails({ gymId, hero_style: heroStyle }),
      ])
      onSave(prev => ({ ...prev, ...updated }))
      onSaveGym?.(updatedGym)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  const canUseC = canAccess('live_preview', planName)

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Hero style picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Hero Style</label>
          {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {HERO_STYLES.map(style => {
            const locked = style.pro && !canUseC
            const active = heroStyle === style.id
            return (
              <button
                key={style.id}
                type="button"
                disabled={locked || saving}
                onClick={() => !locked && handleStyleChange(style.id)}
                className={`relative flex flex-col overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  locked ? 'cursor-not-allowed opacity-60' :
                  active  ? 'border-violet-500 shadow-sm shadow-violet-100' :
                  'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-16 w-full overflow-hidden">
                  {style.preview}
                </div>
                <div className={`px-2 py-1.5 flex items-center justify-between gap-1 ${active ? 'bg-violet-50' : 'bg-white'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${active ? 'text-violet-700' : 'text-gray-700'}`}>{style.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{style.desc}</p>
                  </div>
                  {style.pro && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded shrink-0">Pro</span>
                  )}
                  {active && !style.pro && (
                    <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <Field label="Hero Title" hint='Use \n for a line break. e.g. "FORGE YOUR\nSTRONGEST SELF"'>
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="FORGE YOUR\nSTRONGEST SELF"
          className={inputCls}
        />
      </Field>

      <Field label="Hero Subtitle" hint="One short sentence below the title.">
        <input
          type="text"
          value={subtitle}
          onChange={e => handleSubtitleChange(e.target.value)}
          placeholder="Train hard. Live stronger. Every rep counts."
          className={inputCls}
        />
      </Field>

      <ImageUploader
        gymId={gymId}
        section="hero"
        currentUrl={selectedImage}
        onChange={handleSelectedChange}
        imageList={heroImgs.list}
        onListChange={handleListChange}
        onFileSelected={heroImgs.handleFile}
        isPending={heroImgs.isPending}
        pendingUrls={heroImgs.pendingUrls}
        planName={planName}
        label="Hero Background Images"
        hint="Upload multiple images and select one as the active background. Landscape works best."
      />
      {heroImgs.error && <p className="text-xs text-red-500">{heroImgs.error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}
