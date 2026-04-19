import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import {
  fetchCmsContent, upsertCmsContent,
  fetchCmsPlans, createCmsPlan, updateCmsPlan, deleteCmsPlan,
  fetchCmsTestimonials, createCmsTestimonial, updateCmsTestimonial, deleteCmsTestimonial,
} from '../../services/gymCmsService'
import { canAccess } from '../../lib/featureGates'

// CMS Components
import FeatureGate from './cms/components/FeatureGate'
import ImageUploader from './cms/components/ImageUploader'
import PreviewPanel from './cms/components/PreviewPanel'

// Section Forms (extracted for preview support)
import HeroForm from './cms/sections/HeroForm'
import AboutForm from './cms/sections/AboutForm'
import TrainersForm from './cms/sections/TrainersForm'

// ─── Constants ──────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9',
  '#10B981', '#F59E0B', '#EF4444', '#EC4899',
]

const FONT_OPTIONS = [
  { value: 'default',   label: 'Default',   sample: 'Aa' },
  { value: 'serif',     label: 'Serif',     sample: 'Aa', style: { fontFamily: 'Georgia, serif' } },
  { value: 'mono',      label: 'Mono',      sample: 'Aa', style: { fontFamily: 'monospace' } },
  { value: 'display',   label: 'Display',   sample: 'Aa', style: { fontFamily: '"Anton", sans-serif' } },
  { value: 'humanist',  label: 'Humanist',  sample: 'Aa', style: { fontFamily: '"Trebuchet MS", sans-serif' } },
]

const TABS = [
  { id: 'theme',        label: 'Theme',     desc: 'Colors & branding' },
  { id: 'design',       label: 'Design',    desc: 'Fonts & spacing' },
  { id: 'hero',         label: 'Hero',      desc: 'Homepage banner' },
  { id: 'about',        label: 'About',     desc: 'Story, stats & values' },
  { id: 'pricing',      label: 'Pricing',   desc: 'Plans & features' },
  { id: 'programs',     label: 'Programs',  desc: 'Training cards' },
  { id: 'trainers',     label: 'Trainers',  desc: 'Coach profiles' },
  { id: 'testimonials', label: 'Reviews',   desc: 'Member feedback' },
  { id: 'faq',          label: 'FAQ',       desc: 'Pricing page FAQ' },
  { id: 'cta',          label: 'CTA',       desc: 'Per-page buttons' },
  { id: 'contact',      label: 'Contact',   desc: 'Phone, email & address' },
]

// Tabs that have a live preview component
const PREVIEW_TABS = new Set(['hero', 'about', 'pricing', 'programs', 'trainers', 'testimonials'])

// ─── Shared UI Atoms ────────────────────────────────────────────────────────────
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

function SaveBtn({ saving, label = 'Save Changes', type = 'submit', onClick }) {
  return (
    <button type={type} onClick={onClick} disabled={saving}
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

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-gray-100">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      </div>
      {action}
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

function EmptyState({ label }) {
  return (
    <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

function ItemRow({ title, subtitle, badge, onEdit, onDelete, deleting }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          {badge && <span className="shrink-0 text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium">{badge}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onEdit} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer">Edit</button>
        <button type="button" onClick={onDelete} disabled={deleting} className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 cursor-pointer transition-colors">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      {label}
    </button>
  )
}

function InlineForm({ title, children, onCancel, onSave, saving }) {
  return (
    <div className="mt-3 p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      {children}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
        <SaveBtn saving={saving} onClick={onSave} label="Save" type="button" />
      </div>
    </div>
  )
}

// ─── Theme Panel ────────────────────────────────────────────────────────────────
function ThemePanel({ gym, gymId, onSave }) {
  const [name, setName] = useState(gym?.name || '')
  const [city, setCity] = useState(gym?.city || '')
  const [description, setDescription] = useState(gym?.description || '')
  const [themeColor, setThemeColor] = useState(gym?.theme_color || '#8B5CF6')
  const [secondaryColor, setSecondaryColor] = useState(gym?.secondary_color || '#6366F1')
  const [themeMode, setThemeMode] = useState(gym?.theme_mode || 'dark')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({ gymId, name: name.trim(), city: city.trim(), description: description.trim(), theme_color: themeColor, secondary_color: secondaryColor, theme_mode: themeMode })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Theme Settings" description="Brand identity shown across your public gym website." />
      <Field label="Gym Name" required>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Iron Paradise Fitness" className={inputCls} required />
      </Field>
      <Field label="City">
        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" className={inputCls} />
      </Field>
      <Field label="Tagline / Description" hint="Shown in the footer and about section.">
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Premium fitness for those who refuse to settle." className={inputCls + ' resize-none'} />
      </Field>

      {/* Theme mode toggle */}
      <Field label="Website Theme" hint="Toggle between dark and light mode for your public website.">
        <div className="flex gap-3 mt-1">
          {[
            { value: 'dark',  label: 'Dark',  Icon: Moon,  desc: 'Dark background, light text' },
            { value: 'light', label: 'Light', Icon: Sun,   desc: 'Light background, dark text' },
          ].map(m => (
            <button key={m.value} type="button" onClick={() => setThemeMode(m.value)}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                themeMode === m.value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <m.Icon size={18} className={themeMode === m.value ? 'text-violet-600' : 'text-gray-400'} />
              <div>
                <p className={`text-sm font-semibold ${themeMode === m.value ? 'text-violet-700' : 'text-gray-700'}`}>{m.label}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Field>

      {/* Primary color */}
      <Field label="Primary Color" hint="Used for buttons, accents, and gradients.">
        <div className="flex items-center gap-2.5 flex-wrap mt-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setThemeColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
              style={{ backgroundColor: c, borderColor: themeColor === c ? c : 'transparent', boxShadow: themeColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
          ))}
          <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden" />
          <span className="text-xs text-gray-400 font-mono">{themeColor}</span>
        </div>
      </Field>

      {/* Secondary color */}
      <Field label="Secondary Color" hint="Used as the second gradient stop.">
        <div className="flex items-center gap-2.5 flex-wrap mt-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setSecondaryColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
              style={{ backgroundColor: c, borderColor: secondaryColor === c ? c : 'transparent', boxShadow: secondaryColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
          ))}
          <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden" />
          <span className="text-xs text-gray-400 font-mono">{secondaryColor}</span>
        </div>
        {/* Gradient preview */}
        <div className="mt-2 h-6 rounded-lg" style={{ background: `linear-gradient(to right, ${themeColor}, ${secondaryColor})` }} />
      </Field>

      {/* Color preview */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: themeColor + '15' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: themeColor }}>
          {(name || 'G').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: themeColor }}>{name || 'Your Gym Name'}</p>
          <p className="text-xs text-gray-400">Color preview</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

const DESIGN_DEFAULTS = {
  fontFamily: 'default', cardStyle: 'rounded', borderRadius: 12,
  shadowIntensity: 'md', spacing: 'normal', headingSize: 'md',
}

const HEADING_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small',   sample: 'Aa' },
  { value: 'md', label: 'Medium',  sample: 'Aa' },
  { value: 'lg', label: 'Large',   sample: 'Aa' },
  { value: 'xl', label: 'X-Large', sample: 'Aa' },
]

// ─── Design Panel ───────────────────────────────────────────────────────────────
function DesignPanel({ gym, gymId, planName, onSave }) {
  const [fontFamily, setFontFamily] = useState(gym?.font_family || 'default')
  const [headingSize, setHeadingSize] = useState(gym?.heading_size || 'md')
  const [cardStyle, setCardStyle] = useState(gym?.card_style || 'rounded')
  const [borderRadius, setBorderRadius] = useState(gym?.border_radius ?? 12)
  const [shadowIntensity, setShadowIntensity] = useState(gym?.shadow_intensity || 'md')
  const [spacing, setSpacing] = useState(gym?.spacing || 'normal')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function resetToDefaults() {
    if (!window.confirm('Reset all design settings to defaults?')) return
    setFontFamily(DESIGN_DEFAULTS.fontFamily)
    setHeadingSize(DESIGN_DEFAULTS.headingSize)
    setCardStyle(DESIGN_DEFAULTS.cardStyle)
    setBorderRadius(DESIGN_DEFAULTS.borderRadius)
    setShadowIntensity(DESIGN_DEFAULTS.shadowIntensity)
    setSpacing(DESIGN_DEFAULTS.spacing)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({ gymId, font_family: fontFamily, heading_size: headingSize, card_style: cardStyle, border_radius: borderRadius, shadow_intensity: shadowIntensity, spacing })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SectionHeader title="Design" description="Typography, card style, and spacing for your public website."
        action={
          <button type="button" onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Defaults
          </button>
        }
      />

      {/* Font family — Pro+ */}
      <FeatureGate feature="font_controls" planName={planName}>
        <Field label="Font Family" hint="Choose a typeface that fits your gym's brand. Applies to headings only.">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
            {FONT_OPTIONS.map(f => (
              <button key={f.value} type="button" onClick={() => setFontFamily(f.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                  fontFamily === f.value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <span className="text-lg font-bold text-gray-800 mb-1" style={f.style}>{f.sample}</span>
                <span className="text-xs text-gray-500">{f.label}</span>
              </button>
            ))}
          </div>
        </Field>
      </FeatureGate>

      {/* Heading size — Pro+ */}
      <FeatureGate feature="font_controls" planName={planName}>
        <Field label="Heading Size" hint="Controls how large the hero and section headings appear.">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {HEADING_SIZE_OPTIONS.map(h => (
              <button key={h.value} type="button" onClick={() => setHeadingSize(h.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                  headingSize === h.value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <span className={`font-bold text-gray-800 mb-1 ${
                  h.value === 'sm' ? 'text-base' : h.value === 'md' ? 'text-lg' : h.value === 'lg' ? 'text-xl' : 'text-2xl'
                }`}>{h.sample}</span>
                <span className="text-xs text-gray-500">{h.label}</span>
              </button>
            ))}
          </div>
        </Field>
      </FeatureGate>

      {/* Card style — Pro+ */}
      <FeatureGate feature="card_style" planName={planName}>
        <Field label="Card Style" hint="Controls the corner rounding on cards throughout your site.">
          <div className="flex gap-3 mt-1">
            {[{ value: 'rounded', label: 'Rounded', radius: '1rem' }, { value: 'sharp', label: 'Sharp', radius: '0.25rem' }].map(s => (
              <button key={s.value} type="button" onClick={() => setCardStyle(s.value)}
                className={`flex-1 py-4 border-2 transition-all cursor-pointer text-sm font-medium ${
                  cardStyle === s.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={{ borderRadius: s.radius }}>
                {s.label}
              </button>
            ))}
          </div>
        </Field>
      </FeatureGate>

      {/* Advanced controls — Enterprise */}
      <FeatureGate feature="advanced_design" planName={planName}>
        <div className="space-y-5">
          <Field label={`Border Radius — ${borderRadius}px`} hint="Controls corner rounding globally.">
            <input type="range" min={0} max={24} step={2} value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))}
              className="w-full accent-violet-600 mt-1" />
          </Field>

          <Field label="Shadow Intensity">
            <div className="flex gap-2 mt-1">
              {['none', 'sm', 'md', 'lg'].map(s => (
                <button key={s} type="button" onClick={() => setShadowIntensity(s)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer uppercase tracking-wide ${
                    shadowIntensity === s ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Spacing">
            <div className="flex gap-2 mt-1">
              {['compact', 'normal', 'spacious'].map(s => (
                <button key={s} type="button" onClick={() => setSpacing(s)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer capitalize ${
                    spacing === s ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </FeatureGate>

      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Pricing Panel ──────────────────────────────────────────────────────────────
function IncludedFeaturesSubPanel({ content, gymId, onSave }) {
  const [text, setText] = useState(content?.included_features?.length ? content.included_features.join('\n') : '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const features = text.split('\n').map(f => f.trim()).filter(Boolean)
      const updated = await upsertCmsContent(gymId, { included_features: features.length ? features : null })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave}>
      <SubSectionDivider title="Included In All Plans" description="Bullet points shown below pricing cards. One per line. Leave empty for defaults." />
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
        placeholder={'24/7 gym floor access\nFree fitness assessment\nLocker & shower facilities\nFree parking\nMember mobile app\nNo joining fee ever'}
        className={inputCls + ' resize-none'} />
      <div className="flex items-center gap-3 mt-4">
        <SaveBtn saving={saving} label="Save Features" />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

const EMPTY_PLAN = { name: '', price: '', duration_label: '', features_text: '', is_popular: false }

function PricingPanel({ plans: initPlans, gymId, onUpdate, content, onSaveCms }) {
  const [plans, setPlans] = useState(initPlans)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_PLAN } }) }
  function openEdit(p) { setForm({ mode: 'edit', data: { id: p.id, name: p.name || '', price: p.price ?? '', duration_label: p.duration_label || '', features_text: (p.features || []).join('\n'), is_popular: p.is_popular || false } }) }
  function closeForm() { setForm(null) }
  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.name.trim()) return
    setSaving(true)
    try {
      const payload = { name: form.data.name.trim(), price: Number(form.data.price) || 0, duration_label: form.data.duration_label.trim() || null, features: form.data.features_text.split('\n').map(f => f.trim()).filter(Boolean), is_popular: form.data.is_popular }
      let updated
      if (form.mode === 'add') { const created = await createCmsPlan(gymId, { ...payload, sort_order: plans.length }); updated = [...plans, created] }
      else { const saved = await updateCmsPlan(form.data.id, payload); updated = plans.map(p => p.id === saved.id ? saved : p) }
      setPlans(updated); onUpdate(updated); setForm(null)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this plan?')) return
    setDeleting(id)
    try {
      await deleteCmsPlan(id)
      const updated = plans.filter(p => p.id !== id)
      setPlans(updated); onUpdate(updated)
      if (form?.data?.id === id) setForm(null)
    } catch (err) { alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div>
      <SectionHeader title="Pricing" description="Membership plans and included features shown on your Pricing page." action={<AddBtn onClick={openAdd} label="Add Plan" />} />
      {plans.length === 0 && !form && <EmptyState label="No plans yet. Add your first pricing plan." />}
      <div className="space-y-2">
        {plans.map(p => (
          <ItemRow key={p.id} title={p.name}
            subtitle={`₹${Number(p.price).toLocaleString('en-IN')} · ${p.duration_label || 'month'} · ${(p.features || []).length} feature${(p.features || []).length !== 1 ? 's' : ''}`}
            badge={p.is_popular ? 'Popular' : null}
            onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} deleting={deleting === p.id} />
        ))}
      </div>
      {form && (
        <InlineForm title={form.mode === 'add' ? 'New Plan' : 'Edit Plan'} onCancel={closeForm} onSave={handleSave} saving={saving}>
          <Field label="Plan Name" required><input type="text" value={form.data.name} onChange={e => patch('name', e.target.value)} placeholder="e.g. Basic" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)"><input type="number" min="0" value={form.data.price} onChange={e => patch('price', e.target.value)} placeholder="999" className={inputCls} /></Field>
            <Field label="Duration" hint='e.g. "1 month"'><input type="text" value={form.data.duration_label} onChange={e => patch('duration_label', e.target.value)} placeholder="1 month" className={inputCls} /></Field>
          </div>
          <Field label="Features" hint="One per line."><textarea value={form.data.features_text} onChange={e => patch('features_text', e.target.value)} rows={4} placeholder={'Gym floor access\nLocker room\nFree parking'} className={inputCls + ' resize-none'} /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={form.data.is_popular} onChange={e => patch('is_popular', e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
            <span className="text-gray-700 font-medium">Mark as popular plan</span>
          </label>
        </InlineForm>
      )}
      <IncludedFeaturesSubPanel content={content} gymId={gymId} onSave={onSaveCms} />
    </div>
  )
}

// ─── Training Programs Panel ────────────────────────────────────────────────────
const EMPTY_PROG = { title: '', category: '', description: '', image: '' }
const PROG_CATEGORIES = ['STRENGTH', 'HIIT', 'YOGA', 'CARDIO', 'BOXING', 'CROSSFIT']

function ProgramsPanel({ content, gymId, onSave, planName }) {
  const [items, setItems] = useState(content?.training_programs || [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { training_programs: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated })); setItems(newItems)
  }

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_PROG, id: Date.now().toString() } }) }
  function openEdit(item) { setForm({ mode: 'edit', data: { ...item } }) }
  function closeForm() { setForm(null) }
  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.title.trim()) return
    setSaving(true)
    try {
      const entry = { id: form.data.id || Date.now().toString(), title: form.data.title.trim(), category: form.data.category.trim().toUpperCase() || 'TRAINING', description: form.data.description.trim(), image: form.data.image.trim() || '' }
      const newItems = form.mode === 'add' ? [...items, entry] : items.map(it => it.id === entry.id ? entry : it)
      await persist(newItems); setForm(null)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this program?')) return
    setDeleting(id)
    try { await persist(items.filter(it => it.id !== id)); if (form?.data?.id === id) setForm(null) }
    catch (err) { alert(err.message) } finally { setDeleting(null) }
  }

  const imageCount = items.filter(it => it.image).length

  return (
    <div>
      <SectionHeader title="Training Programs" description="Program cards in the 'What We Offer' grid on the homepage. Leave empty for defaults." action={<AddBtn onClick={openAdd} label="Add Program" />} />
      {items.length === 0 && !form && <EmptyState label="No custom programs — default training cards will be shown." />}
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow key={item.id} title={item.title}
            subtitle={item.category ? `${item.category}${item.description ? ' · ' + item.description.slice(0, 50) : ''}` : item.description?.slice(0, 60)}
            onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} deleting={deleting === item.id} />
        ))}
      </div>
      {form && (
        <InlineForm title={form.mode === 'add' ? 'New Program' : 'Edit Program'} onCancel={closeForm} onSave={handleSave} saving={saving}>
          <Field label="Program Title" required><input type="text" value={form.data.title} onChange={e => patch('title', e.target.value)} placeholder="e.g. Iron Weight Training" className={inputCls} /></Field>
          <Field label="Category">
            <div className="flex gap-2 flex-wrap mb-2">
              {PROG_CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => patch('category', c)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${form.data.category === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'}`}>
                  {c}
                </button>
              ))}
            </div>
            <input type="text" value={form.data.category} onChange={e => patch('category', e.target.value.toUpperCase())} placeholder="STRENGTH" className={inputCls} />
          </Field>
          <Field label="Description"><input type="text" value={form.data.description} onChange={e => patch('description', e.target.value)} placeholder="Build raw power and lean muscle" className={inputCls} /></Field>
          <ImageUploader gymId={gymId} section="programs" currentUrl={form.data.image} onChange={url => patch('image', url)} planName={planName} usageCount={imageCount} label="Program Image" hint="Background photo for the card." />
        </InlineForm>
      )}
    </div>
  )
}

// ─── Testimonials Panel ─────────────────────────────────────────────────────────
const EMPTY_TESTIMONIAL = { name: '', message: '', rating: 5 }

function TestimonialsPanel({ testimonials: initList, gymId, onUpdate }) {
  const [list, setList] = useState(initList)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_TESTIMONIAL } }) }
  function openEdit(t) { setForm({ mode: 'edit', data: { id: t.id, name: t.name || '', message: t.message || '', rating: t.rating || 5 } }) }
  function closeForm() { setForm(null) }
  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.name.trim() || !form.data.message.trim()) return
    setSaving(true)
    try {
      const payload = { name: form.data.name.trim(), message: form.data.message.trim(), rating: Number(form.data.rating) }
      let updated
      if (form.mode === 'add') { const created = await createCmsTestimonial(gymId, payload); updated = [created, ...list] }
      else { const saved = await updateCmsTestimonial(form.data.id, payload); updated = list.map(t => t.id === saved.id ? saved : t) }
      setList(updated); onUpdate(updated); setForm(null)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this review?')) return
    setDeleting(id)
    try {
      await deleteCmsTestimonial(id)
      const updated = list.filter(t => t.id !== id)
      setList(updated); onUpdate(updated)
      if (form?.data?.id === id) setForm(null)
    } catch (err) { alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div>
      <SectionHeader title="Reviews" description="Member testimonials shown on your public website." action={<AddBtn onClick={openAdd} label="Add Review" />} />
      {list.length === 0 && !form && <EmptyState label="No reviews yet. Add your first testimonial." />}
      <div className="space-y-2">
        {list.map(t => (
          <ItemRow key={t.id} title={t.name}
            subtitle={`${'★'.repeat(t.rating || 5)} — ${(t.message || '').slice(0, 60)}${(t.message || '').length > 60 ? '…' : ''}`}
            onEdit={() => openEdit(t)} onDelete={() => handleDelete(t.id)} deleting={deleting === t.id} />
        ))}
      </div>
      {form && (
        <InlineForm title={form.mode === 'add' ? 'New Review' : 'Edit Review'} onCancel={closeForm} onSave={handleSave} saving={saving}>
          <Field label="Member Name" required><input type="text" value={form.data.name} onChange={e => patch('name', e.target.value)} placeholder="e.g. Priya Sharma" className={inputCls} /></Field>
          <Field label="Rating">
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button" onClick={() => patch('rating', s)} className="text-2xl leading-none cursor-pointer transition-transform hover:scale-110 focus:outline-none" style={{ color: s <= form.data.rating ? '#F59E0B' : '#D1D5DB' }}>★</button>
              ))}
              <span className="text-sm text-gray-400 ml-2">{form.data.rating} / 5</span>
            </div>
          </Field>
          <Field label="Review Text" required><textarea value={form.data.message} onChange={e => patch('message', e.target.value)} rows={4} placeholder="This gym completely changed my fitness journey…" className={inputCls + ' resize-none'} /></Field>
        </InlineForm>
      )}
    </div>
  )
}

// ─── FAQ Panel ──────────────────────────────────────────────────────────────────
const EMPTY_FAQ = { q: '', a: '' }

const DEFAULT_FAQ_ITEMS = [
  { q: 'Can I cancel my membership anytime?',      a: 'Yes. Monthly plans can be cancelled at any time with no hidden fees or penalties.' },
  { q: 'Is there a joining or registration fee?',  a: 'No joining fee ever. Pay only for your chosen plan and start training immediately.' },
  { q: 'Do you offer a free trial?',               a: 'Yes! We offer a 1-day free trial pass for new members. Visit us at the front desk to get started.' },
  { q: 'What are the gym timings?',                a: 'We are open Monday–Saturday 5:30 AM – 10:30 PM and Sunday 6:00 AM – 8:00 PM.' },
  { q: 'Do you have personal trainers?',           a: 'Yes. All our certified trainers are available for personal sessions. Contact us to book a session.' },
  { q: 'Are locker and shower facilities included?', a: 'Yes, all plans include access to locker rooms, showers, and complimentary towel service.' },
]

function FAQPanel({ content, gymId, planName, onSave }) {
  // DB column is faq_items
  const [items, setItems] = useState(content?.faq_items || [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { faq_items: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated })); setItems(newItems)
  }

  async function loadDefaults() {
    if (items.length > 0 && !window.confirm('This will replace your current FAQ items with defaults. Continue?')) return
    await persist(DEFAULT_FAQ_ITEMS)
  }

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_FAQ } }) }
  function openEdit(item, idx) { setForm({ mode: 'edit', data: { idx, q: item.q, a: item.a } }) }
  function closeForm() { setForm(null) }
  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.q.trim() || !form.data.a.trim()) return
    setSaving(true)
    try {
      const entry = { q: form.data.q.trim(), a: form.data.a.trim() }
      const newItems = form.mode === 'add' ? [...items, entry] : items.map((it, i) => i === form.data.idx ? entry : it)
      await persist(newItems); setForm(null)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(idx) {
    if (!window.confirm('Delete this FAQ item?')) return
    setDeleting(idx)
    try { await persist(items.filter((_, i) => i !== idx)); if (form?.data?.idx === idx) setForm(null) }
    catch (err) { alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div>
      <SectionHeader title="FAQ" description="Accordion questions shown on the Pricing page."
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">
              Load Defaults
            </button>
            <AddBtn onClick={openAdd} label="Add Question" />
          </div>
        }
      />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div>
          {items.length === 0 && !form && (
            <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <p className="text-sm text-gray-400">No FAQ items yet.</p>
              <button type="button" onClick={loadDefaults}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer">
                Load Default FAQ Items
              </button>
            </div>
          )}
          <div className="space-y-2">
            {items.map((item, i) => (
              <ItemRow key={i} title={item.q} subtitle={item.a?.slice(0, 70) + (item.a?.length > 70 ? '…' : '')}
                onEdit={() => openEdit(item, i)} onDelete={() => handleDelete(i)} deleting={deleting === i} />
            ))}
          </div>
          {form && (
            <InlineForm title={form.mode === 'add' ? 'New Question' : 'Edit Question'} onCancel={closeForm} onSave={handleSave} saving={saving}>
              <Field label="Question" required><input type="text" value={form.data.q} onChange={e => patch('q', e.target.value)} placeholder="Can I cancel anytime?" className={inputCls} /></Field>
              <Field label="Answer" required><textarea value={form.data.a} onChange={e => patch('a', e.target.value)} rows={3} placeholder="Yes. Monthly plans can be cancelled at any time with no hidden fees." className={inputCls + ' resize-none'} /></Field>
            </InlineForm>
          )}
        </div>
      </FeatureGate>
    </div>
  )
}

// ─── CTA Panel ──────────────────────────────────────────────────────────────────
const CTA_PAGES = [
  { key: 'cta_home',     label: 'Home Page',     hint: 'Large bold banner at the bottom of your homepage.' },
  { key: 'cta_about',    label: 'About Page',    hint: 'CTA heading at the bottom of the About page.' },
  { key: 'cta_pricing',  label: 'Pricing Page',  hint: 'CTA heading at the bottom of the Pricing page.' },
  { key: 'cta_trainers', label: 'Trainers Page', hint: 'CTA heading at the bottom of the Trainers page.' },
  { key: 'cta_contact',  label: 'Contact Page',  hint: 'CTA heading at the bottom of the Contact page.' },
]

function CTAPanel({ content, gymId, planName, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(CTA_PAGES.map(p => [p.key, content?.[p.key] || ''])))
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const fields = Object.fromEntries(CTA_PAGES.map(p => [p.key, values[p.key].trim() || null]))
      const updated = await upsertCmsContent(gymId, fields)
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Home CTA is available to all; per-page CTAs require Pro+
  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Call to Action" description="Customize the big headline CTA at the bottom of each page. Leave empty for defaults." />
      <Field label="Home Page" hint="Large bold banner at the bottom of your homepage.">
        <input type="text" value={values.cta_home} onChange={e => setValues(v => ({ ...v, cta_home: e.target.value }))} placeholder="ARE YOU IN?" className={inputCls} />
      </Field>
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-4">
          {CTA_PAGES.slice(1).map(page => (
            <Field key={page.key} label={page.label} hint={page.hint}>
              <input type="text" value={values[page.key]} onChange={e => setValues(v => ({ ...v, [page.key]: e.target.value }))}
                placeholder={page.key === 'cta_about' ? 'JOIN US TODAY' : page.key === 'cta_pricing' ? 'START TODAY' : page.key === 'cta_trainers' ? 'TRAIN WITH THE BEST' : 'COME VISIT US'}
                className={inputCls} />
            </Field>
          ))}
        </div>
      </FeatureGate>
      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Contact Panel ──────────────────────────────────────────────────────────────
function ContactPanel({ gym, gymId, onSave }) {
  const [phone, setPhone] = useState(gym?.phone || '')
  const [email, setEmail] = useState(gym?.email || '')
  const [address, setAddress] = useState(gym?.address || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({ gymId, phone: phone.trim() || null, email: email.trim() || null, address: address.trim() || null })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Contact Info" description="Shown on the Contact page and in the footer of your public website." />
      <Field label="Phone Number" hint="e.g. +91 98765 43210"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} /></Field>
      <Field label="Email Address" hint="Public contact email shown to visitors."><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@yourgym.com" className={inputCls} /></Field>
      <Field label="Address" hint="Full street address. Also used to position the map and shown in the footer."><textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="123 Fitness Street, Andheri West, Mumbai 400053" className={inputCls + ' resize-none'} /></Field>
      <div className="flex items-center gap-3"><SaveBtn saving={saving} /><SuccessMsg msg={success} /></div>
    </form>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const { gymId, subscription } = useAuth()
  const [gym, setGym] = useState(null)
  const [content, setContent] = useState(null)
  const [plans, setPlans] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('theme')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Live preview state (mirrors content + local edits)
  const [previewData, setPreviewData] = useState(null)

  // Derive plan name from subscription
  const planName = subscription?.plan_name ?? 'Starter'
  const showPreview = canAccess('live_preview', planName) && PREVIEW_TABS.has(activeTab)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    Promise.all([
      fetchGymDetails(gymId),
      fetchCmsContent(gymId).catch(() => null),
      fetchCmsPlans(gymId).catch(() => []),
      fetchCmsTestimonials(gymId).catch(() => []),
    ]).then(([g, c, p, r]) => {
      setGym(g); setContent(c); setPlans(p); setTestimonials(r)
      setPreviewData(c) // seed live preview
    }).finally(() => setLoading(false))
  }, [gymId])

  // Sync trainers separately (TrainersForm manages its own state)
  const [trainersList, setTrainersList] = useState([])
  useEffect(() => {
    if (!gymId) return
    import('../../services/gymCmsService').then(({ fetchCmsTrainers }) =>
      fetchCmsTrainers(gymId).then(setTrainersList).catch(() => [])
    )
  }, [gymId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeTabDef = TABS.find(t => t.id === activeTab)

  function selectTab(id) { setActiveTab(id); setMobileNavOpen(false) }

  function handleContentSave(updater) {
    setContent(updater)
    // Also sync previewData so preview reflects saved state
    if (typeof updater === 'function') {
      setPreviewData(prev => updater(prev))
    } else {
      setPreviewData(updater)
    }
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Website</h1>
            {/* Plan badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              planName === 'Enterprise' ? 'bg-amber-50 text-amber-700' :
              planName === 'Pro' ? 'bg-violet-50 text-violet-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {planName}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage your public gym website content</p>
        </div>
        {gym?.slug && (
          <a href={`/${gym.slug}`} target="_blank" rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-lg hover:bg-violet-100 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View site
          </a>
        )}
      </div>

      {/* Mobile nav trigger */}
      <div className="lg:hidden">
        <button type="button" onClick={() => setMobileNavOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 cursor-pointer hover:border-gray-300 transition-colors">
          <span className="flex items-center gap-2">
            <span className="text-violet-600 font-semibold">{activeTabDef?.label}</span>
            <span className="text-gray-400">—</span>
            <span className="text-gray-500">{activeTabDef?.desc}</span>
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileNavOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 relative">
            {TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => selectTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${activeTab === tab.id ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="font-medium">{tab.label}</span>
                <span className="text-xs text-gray-400">{tab.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CMS layout */}
      <div className={`flex gap-5 items-start ${showPreview ? 'flex-col md:flex-row' : ''}`}>
        {/* Desktop sidebar */}
        <nav className="hidden lg:block w-44 shrink-0 sticky top-6">
          <ul className="space-y-0.5">
            {TABS.map(tab => (
              <li key={tab.id}>
                <button type="button" onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm cursor-pointer ${activeTab === tab.id ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
                  <span className={`block font-medium ${activeTab === tab.id ? 'text-violet-700' : ''}`}>{tab.label}</span>
                  <span className={`block text-xs mt-0.5 ${activeTab === tab.id ? 'text-violet-400' : 'text-gray-400'}`}>{tab.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Form panel */}
        <div className={`flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 ${showPreview ? 'xl:max-w-lg' : ''}`}>
          {activeTab === 'theme'        && <ThemePanel gym={gym} gymId={gymId} onSave={setGym} />}
          {activeTab === 'design'       && <DesignPanel gym={gym} gymId={gymId} planName={planName} onSave={setGym} />}
          {activeTab === 'hero'         && <HeroForm content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeTab === 'about'        && <div><SectionHeader title="About" description="Story, statistics, and brand values shown on the About page." /><AboutForm content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} /></div>}
          {activeTab === 'pricing'      && <PricingPanel plans={plans} gymId={gymId} onUpdate={setPlans} content={content} onSaveCms={handleContentSave} />}
          {activeTab === 'programs'     && <ProgramsPanel content={content} gymId={gymId} onSave={handleContentSave} planName={planName} />}
          {activeTab === 'trainers'     && <TrainersForm trainers={trainersList} gymId={gymId} planName={planName} onUpdate={setTrainersList} />}
          {activeTab === 'testimonials' && <TestimonialsPanel testimonials={testimonials} gymId={gymId} onUpdate={setTestimonials} />}
          {activeTab === 'faq'          && <FAQPanel content={content} gymId={gymId} planName={planName} onSave={handleContentSave} />}
          {activeTab === 'cta'          && <CTAPanel content={content} gymId={gymId} planName={planName} onSave={handleContentSave} />}
          {activeTab === 'contact'      && <ContactPanel gym={gym} gymId={gymId} onSave={setGym} />}
        </div>

        {/* Live preview panel — Pro+ only, only for previewable tabs */}
        {showPreview && (
          <div className="flex-1 min-w-0">
            <PreviewPanel
              section={activeTab}
              previewData={previewData}
              gym={gym}
              plans={plans}
              trainers={trainersList}
              testimonials={testimonials}
            />
          </div>
        )}
      </div>
    </div>
  )
}
