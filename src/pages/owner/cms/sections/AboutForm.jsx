import { useState } from 'react'
import { upsertCmsContent } from '../../../../services/gymCmsService'
import { useCMSImageList } from '../../../../hooks/useCMSImage'
import ImageUploader from '../components/ImageUploader'
import FeatureGate from '../components/FeatureGate'
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

function SubSectionDivider({ title, description }) {
  return (
    <div className="pt-6 mt-6 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-800 mb-0.5">{title}</p>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
    </div>
  )
}

function SaveBtn({ saving, label = 'Save Changes', onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={saving}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
      {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
      {saving ? 'Saving…' : label}
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

const FEATURE_PLACEHOLDERS = [
  'World-Class Equipment',
  'Expert Coaching',
  'Proven Programs',
  'Real Community',
]

/**
 * AboutForm — home page About section content.
 * Edits: description, feature point titles (shown as bullet list below desc),
 * about image, and stats.
 * Why Us cards (with descriptions) and Vision & Mission are in the About Page CMS.
 */
export default function AboutForm({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [sectionLabel,   setSectionLabel]   = useState(content?.about_section_label   || '')
  const [sectionHeading, setSectionHeading] = useState(content?.about_section_heading || '')
  const [aboutText, setAboutText] = useState(content?.about_text || '')
  const [selectedImage, setSelectedImage] = useState(content?.about_image || '')

  const aboutImgs = useCMSImageList({
    gymId,
    fieldKey: 'about_images',
    section: 'about',
    initialList: content?.about_images || [],
  })

  // 4 feature point titles stored in home_features (separate from why_us)
  const [pointTitles, setPointTitles] = useState(() =>
    Array.from({ length: 4 }, (_, i) => content?.home_features?.[i] || '')
  )

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function handleLabelChange(val) {
    setSectionLabel(val)
    setPreviewData?.(prev => ({ ...prev, about_section_label: val || undefined }))
  }
  function handleHeadingChange(val) {
    setSectionHeading(val)
    setPreviewData?.(prev => ({ ...prev, about_section_heading: val || undefined }))
  }
  function handleTextChange(val) {
    setAboutText(val)
    setPreviewData?.(prev => ({ ...prev, about_text: val }))
  }

  function handleSelectedChange(url) {
    setSelectedImage(url)
    setPreviewData?.(prev => ({ ...prev, about_image: url }))
  }

  // Called by ImageUploader when list changes via URL-add or delete buttons
  function handleListChange(newList) {
    const deleted = aboutImgs.list.filter(u => !newList.includes(u))
    if (deleted.length > 0) {
      deleted.forEach(u => aboutImgs.handleDelete(u))
      if (selectedImage && deleted.includes(selectedImage)) {
        setSelectedImage(newList[0] ?? '')
      }
      return
    }
    const added = newList.filter(u => !aboutImgs.list.includes(u))
    added.forEach(u => aboutImgs.handleUrlAdd(u))
  }

  function patchPointTitle(i, val) {
    setPointTitles(prev => {
      const next = prev.map((t, idx) => idx === i ? val : t)
      setPreviewData?.(p => ({
        ...p,
        home_features: next.map((t, idx) => t || FEATURE_PLACEHOLDERS[idx]),
      }))
      return next
    })
  }

  async function save() {
    setSaving(true); setSuccess('')
    try {
      const finalList = await aboutImgs.commitList()
      const selectedIdx = aboutImgs.list.indexOf(selectedImage)
      const finalSelected = selectedIdx >= 0
        ? (finalList[selectedIdx] ?? finalList[0] ?? '')
        : (finalList.includes(selectedImage) ? selectedImage : (finalList[0] ?? ''))

      const hasPoints = pointTitles.some(t => t.trim())
      const updated = await upsertCmsContent(gymId, {
        about_section_label:   sectionLabel.trim()   || null,
        about_section_heading: sectionHeading.trim() || null,
        about_text:    aboutText.trim() || null,
        about_image:   finalSelected || null,
        about_images:  finalList.length ? finalList : null,
        home_features: hasPoints ? pointTitles.map(t => t.trim()) : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          <SubSectionDivider title="Section Header" description="Label and heading for the About section on the home page." />
          <div className="space-y-2">
            <Field label="Label" hint='Small badge above heading. Default: "Our Story"'>
              <input type="text" value={sectionLabel} onChange={e => handleLabelChange(e.target.value)} placeholder="Our Story" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Large section title. Default: "This Is [Gym Name]"'>
              <input type="text" value={sectionHeading} onChange={e => handleHeadingChange(e.target.value)} placeholder="This Is Your Gym" className={inputCls} />
            </Field>
          </div>
        </div>
      </FeatureGate>

      {/* Description */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <Field label="About Description" hint="2–3 sentences about your gym, culture, and mission.">
          <textarea
            value={aboutText}
            onChange={e => handleTextChange(e.target.value)}
            rows={4}
            placeholder="We are more than a gym. We are a community built on sweat, discipline, and results."
            className={inputCls + ' resize-none'}
          />
        </Field>
      </FeatureGate>

      {/* Feature point titles — shown as bullet list below the description on the home page */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          <SubSectionDivider
            title="Feature Points"
            description="4 bullet points shown below the description on the home page. Edit full cards (with descriptions) from About Page → Why Choose Us."
          />
          <div className="space-y-2">
            {pointTitles.map((title, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white bg-violet-600">{i + 1}</span>
                <input
                  type="text"
                  value={title}
                  onChange={e => patchPointTitle(i, e.target.value)}
                  placeholder={FEATURE_PLACEHOLDERS[i]}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>

      {/* About image */}
      <div className="pt-2">
        <ImageUploader
          gymId={gymId}
          section="about"
          currentUrl={selectedImage}
          onChange={handleSelectedChange}
          imageList={aboutImgs.list}
          onListChange={handleListChange}
          onFileSelected={aboutImgs.handleFile}
          isPending={aboutImgs.isPending}
          pendingUrls={aboutImgs.pendingUrls}
          planName={planName}
          label="About Section Images"
          hint="Upload multiple images and select one as the active photo for the About section."
        />
        {aboutImgs.error && <p className="mt-1.5 text-xs text-red-500">{aboutImgs.error}</p>}
      </div>

      <div className="flex items-center gap-3 pt-4">
        <SaveBtn saving={saving} onClick={save} />
        <SuccessMsg msg={success} />
      </div>
    </div>
  )
}
