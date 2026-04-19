import { useState } from 'react'
import { upsertCmsContent } from '../../../../services/gymCmsService'
import ImageUploader from '../components/ImageUploader'

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

/**
 * HeroForm — edits hero_title, hero_subtitle, hero_image.
 * Accessible to ALL plans (Hero is unrestricted per spec).
 *
 * Props:
 *   content        object  — current CMS content row
 *   gymId          string
 *   planName       string  — for ImageUploader limits
 *   onSave         fn      — called with updated content
 *   setPreviewData fn      — updates live preview state
 */
export default function HeroForm({ content, gymId, planName, onSave, setPreviewData }) {
  const [title, setTitle] = useState(content?.hero_title || '')
  const [subtitle, setSubtitle] = useState(content?.hero_subtitle || '')
  // hero_image = the currently active/selected background
  // hero_images = the full list of uploaded/added images
  const [heroImage, setHeroImage] = useState(content?.hero_image || '')
  const [heroImages, setHeroImages] = useState(content?.hero_images || [])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function handleTitleChange(val) {
    setTitle(val)
    setPreviewData?.(prev => ({ ...prev, hero_title: val }))
  }

  function handleSubtitleChange(val) {
    setSubtitle(val)
    setPreviewData?.(prev => ({ ...prev, hero_subtitle: val }))
  }

  function handleImageChange(url) {
    setHeroImage(url)
    setPreviewData?.(prev => ({ ...prev, hero_image: url }))
  }

  function handleImageListChange(newList) {
    setHeroImages(newList)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        hero_title:   title.trim() || null,
        hero_subtitle: subtitle.trim() || null,
        hero_image:   heroImage.trim() || null,
        hero_images:  heroImages.length ? heroImages : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
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
        currentUrl={heroImage}
        onChange={handleImageChange}
        imageList={heroImages}
        onListChange={handleImageListChange}
        planName={planName}
        label="Hero Background Images"
        hint="Upload multiple images and select one as the active background. Landscape works best."
      />

      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}
