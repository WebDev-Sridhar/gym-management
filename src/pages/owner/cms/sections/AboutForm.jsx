import { useState } from 'react'
import { upsertCmsContent } from '../../../../services/gymCmsService'
import ImageUploader from '../components/ImageUploader'
import FeatureGate from '../components/FeatureGate'

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

const STAT_PLACEHOLDERS = [
  { value: '500+', label: 'Members' },
  { value: '15+',  label: 'Trainers' },
  { value: '50+',  label: 'Classes/Week' },
  { value: '10+',  label: 'Years Running' },
]

const WHY_US_PLACEHOLDERS = [
  { title: 'World-Class Equipment', description: 'Over 200 pieces of premium equipment, updated every year.' },
  { title: 'Expert Coaching',       description: 'Every trainer is certified and passionate about your results.' },
  { title: 'Proven Programs',       description: '50+ structured classes per week — from beginner to elite.' },
  { title: 'Real Community',        description: 'Over 500 members who push each other to be better.' },
]

/**
 * AboutForm — all About page content with FeatureGate on text editing.
 * Image upload available to all plans (within limits).
 *
 * Props:
 *   content        object
 *   gymId          string
 *   planName       string
 *   onSave         fn
 *   setPreviewData fn
 */
export default function AboutForm({ content, gymId, planName, onSave, setPreviewData }) {
  // Story
  const [aboutText, setAboutText] = useState(content?.about_text || '')
  const [aboutImage, setAboutImage] = useState(content?.about_image || '')
  const [aboutImages, setAboutImages] = useState(content?.about_images || [])

  // Stats
  const [stats, setStats] = useState(() =>
    content?.stats?.length >= 4
      ? content.stats.slice(0, 4).map(s => ({ value: s.value || '', label: s.label || '' }))
      : [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]
  )

  // Why Us
  const [whyUs, setWhyUs] = useState(() =>
    content?.why_us?.length >= 4
      ? content.why_us.slice(0, 4).map(w => ({ title: w.title || '', description: w.description || '' }))
      : [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }]
  )

  // Vision & Mission
  const [vision, setVision] = useState(content?.vision || '')
  const [mission, setMission] = useState(content?.mission || '')

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function handleTextChange(val) {
    setAboutText(val)
    setPreviewData?.(prev => ({ ...prev, about_text: val }))
  }

  function handleImageChange(url) {
    setAboutImage(url)
    setPreviewData?.(prev => ({ ...prev, about_image: url }))
  }

  function patchStat(i, key, val) {
    setStats(prev => {
      const next = prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s)
      setPreviewData?.(p => ({ ...p, stats: next }))
      return next
    })
  }

  function patchWhyUs(i, key, val) {
    setWhyUs(prev => {
      const next = prev.map((w, idx) => idx === i ? { ...w, [key]: val } : w)
      setPreviewData?.(p => ({ ...p, why_us: next }))
      return next
    })
  }

  async function save() {
    setSaving(true); setSuccess('')
    try {
      const hasStats = stats.some(s => s.value.trim() || s.label.trim())
      const hasWhyUs = whyUs.some(w => w.title.trim() || w.description.trim())
      const updated = await upsertCmsContent(gymId, {
        about_text:   aboutText.trim() || null,
        about_image:  aboutImage.trim() || null,
        about_images: aboutImages.length ? aboutImages : null,
        stats:        hasStats ? stats.map(s => ({ value: s.value.trim(), label: s.label.trim() })) : null,
        why_us:       hasWhyUs ? whyUs.map(w => ({ title: w.title.trim(), description: w.description.trim() })) : null,
        vision:       vision.trim() || null,
        mission:      mission.trim() || null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-1">
      {/* Story */}
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

      <div className="pt-2">
        <ImageUploader
          gymId={gymId}
          section="about"
          currentUrl={aboutImage}
          onChange={handleImageChange}
          imageList={aboutImages}
          onListChange={setAboutImages}
          planName={planName}
          label="About Section Images"
          hint="Upload multiple images and select one as the active photo for the About section."
        />
      </div>

      {/* Stats */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          <SubSectionDivider title="Stats" description="4 numbers shown in the stats strip. Leave empty to use defaults." />
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <span className="text-xs font-medium text-gray-500">Value</span>
              <span className="text-xs font-medium text-gray-500">Label</span>
            </div>
            {stats.map((stat, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input type="text" value={stat.value} onChange={e => patchStat(i, 'value', e.target.value)} placeholder={STAT_PLACEHOLDERS[i].value} className={inputCls} />
                <input type="text" value={stat.label} onChange={e => patchStat(i, 'label', e.target.value)} placeholder={STAT_PLACEHOLDERS[i].label} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>

      {/* Why Us */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          <SubSectionDivider title="Why Choose Us" description="4 feature cards on the About page. Leave empty to use defaults." />
          <div className="space-y-3">
            {whyUs.map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Card {i + 1}</p>
                <input type="text" value={item.title} onChange={e => patchWhyUs(i, 'title', e.target.value)}
                  placeholder={WHY_US_PLACEHOLDERS[i].title} className={inputCls} />
                <textarea value={item.description} onChange={e => patchWhyUs(i, 'description', e.target.value)}
                  placeholder={WHY_US_PLACEHOLDERS[i].description} rows={2} className={inputCls + ' resize-none'} />
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>

      {/* Vision & Mission */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          <SubSectionDivider title="Vision & Mission" description="Two statement cards on the About page." />
          <div className="space-y-4">
            <Field label="Our Vision" hint="Long-term aspirational statement — 1–2 sentences.">
              <textarea value={vision} onChange={e => setVision(e.target.value)} rows={3}
                placeholder="To be the city's most transformative fitness community — where every person achieves their strongest self."
                className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Our Mission" hint="Day-to-day purpose and operational goal.">
              <textarea value={mission} onChange={e => setMission(e.target.value)} rows={3}
                placeholder="To provide elite coaching, world-class facilities, and an unbreakable community that makes fitness accessible to all."
                className={inputCls + ' resize-none'} />
            </Field>
          </div>
        </div>
      </FeatureGate>

      <div className="flex items-center gap-3 pt-4">
        <SaveBtn saving={saving} onClick={save} />
        <SuccessMsg msg={success} />
      </div>
    </div>
  )
}
