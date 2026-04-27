import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { supabaseData } from '../../services/supabaseClient'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import {
  fetchCmsContent, upsertCmsContent,
  fetchCmsPlans, createCmsPlan, updateCmsPlan, deleteCmsPlan,
  fetchCmsTestimonials, createCmsTestimonial, updateCmsTestimonial, deleteCmsTestimonial,
  fetchCmsTrainers,
} from '../../services/gymCmsService'
import { canAccess } from '../../lib/featureGates'
import { useCMSImage, useCMSImageList } from '../../hooks/useCMSImage'
import { deleteFile } from '../../services/storageService'
import { sweepStaleDraftEntries } from '../../lib/cmsDraft'
import { SocialIcon, SOCIAL_PLATFORMS } from '../../lib/socialPlatforms.jsx'
import { getFullThemeCSSVars } from '../../lib/gymTheme'
import LocationPicker from '../../components/LocationPicker'

// CMS Components
import FeatureGate from './cms/components/FeatureGate'
import ImageUploader from './cms/components/ImageUploader'
import PreviewPanel from './cms/components/PreviewPanel'

// Section Forms
import HeroForm from './cms/sections/HeroForm'
import AboutForm from './cms/sections/AboutForm'
import TrainersForm from './cms/sections/TrainersForm'
import { useDialog } from '../../components/ui/Dialog'

// ─── Constants ──────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9',
  '#10B981', '#F59E0B', '#EF4444', '#EC4899',
]

const FONT_OPTIONS = [
  { value: 'default',   label: 'Default',   sample: 'Aa'},
  { value: 'serif',     label: 'Serif',     sample: 'Aa', style: { fontFamily: 'Georgia, serif' } },
  { value: 'mono',      label: 'Mono',      sample: 'Aa', style: { fontFamily: 'monospace' } },
  { value: 'display',   label: 'Display',   sample: 'Aa', style: { fontFamily: '"viga", sans-serif' } },
  { value: 'humanist',  label: 'Humanist',  sample: 'Aa', style: { fontFamily: '"port lligat slab", sans-serif' } },
]

const HEADING_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small',   sample: 'Aa' },
  { value: 'md', label: 'Medium',  sample: 'Aa' },
  { value: 'lg', label: 'Large',   sample: 'Aa' },
  { value: 'xl', label: 'X-Large', sample: 'Aa' },
]

const DESIGN_DEFAULTS = {
  fontFamily: 'default', cardStyle: 'rounded', borderRadius: 12,
  shadowIntensity: 'md', spacing: 'normal', headingSize: 'md',
}

// Page-wise CMS structure
const PAGES = [
  {
    id: 'settings',
    label: 'Settings',
    minPlan: 'Starter',
    sections: [
      { id: 'theme',  label: 'Theme',  desc: 'Colors & branding', minPlan: 'Starter' },
      { id: 'design', label: 'Design', desc: 'Fonts & spacing',   minPlan: 'Pro' },
    ],
  },
  {
    id: 'home',
    label: 'Home Page',
    minPlan: 'Starter',
    sections: [
      { id: 'hero',         label: 'Hero Banner',    desc: 'Full-page landing section' },
      { id: 'stats',        label: 'Stats',          desc: 'Member counts & metrics' },
      { id: 'about',        label: 'About Section',  desc: 'Story & values' },
      { id: 'programs',     label: 'Programs',       desc: 'Training cards' },
      { id: 'testimonials', label: 'Reviews',        desc: 'Member feedback' },
      { id: 'gallery',      label: 'Gallery',        desc: 'Photo grid' },
      { id: 'cta_home',     label: 'Call to Action', desc: 'Homepage bottom CTA' },
    ],
  },
  {
    id: 'about_page',
    label: 'About Page',
    minPlan: 'Pro',
    sections: [
      { id: 'page_hero_about', label: 'Page Hero',        desc: 'Label, title & description' },
      { id: 'why_us_content',  label: 'Why Choose Us',    desc: '4 feature cards' },
      { id: 'vision_mission',  label: 'Vision & Mission', desc: 'Purpose statements' },
      { id: 'cta_about',       label: 'Call to Action',   desc: 'About page bottom CTA' },
    ],
  },
  {
    id: 'pricing_page',
    label: 'Pricing Page',
    minPlan: 'Pro',
    sections: [
      { id: 'page_hero_pricing', label: 'Page Hero',     desc: 'Label, title & description' },
      { id: 'pricing',           label: 'Plans',         desc: 'Membership plans' },
      { id: 'faq',               label: 'FAQ',           desc: 'Accordion questions' },
      { id: 'cta_pricing',       label: 'Call to Action', desc: 'Pricing page bottom CTA' },
    ],
  },
  {
    id: 'trainers_page',
    label: 'Trainers Page',
    minPlan: 'Pro',
    sections: [
      { id: 'page_hero_trainers', label: 'Page Hero',     desc: 'Label, title & description' },
      { id: 'trainers',           label: 'Coach Profiles', desc: 'Team & bios' },
      { id: 'cta_trainers',       label: 'Call to Action', desc: 'Trainers page bottom CTA' },
    ],
  },
  {
    id: 'contact_page',
    label: 'Contact Page',
    minPlan: 'Pro',
    sections: [
      { id: 'page_hero_contact', label: 'Page Hero',     desc: 'Label, title & description' },
      { id: 'contact',           label: 'Contact Info',  desc: 'Phone, email & address' },
      { id: 'cta_contact',       label: 'Call to Action', desc: 'Contact page bottom CTA' },
    ],
  },
]

// Maps each section ID to its parent page ID
const SECTION_PAGE_MAP = {
  theme: 'settings', design: 'settings',
  hero: 'home', stats: 'home', about: 'home', programs: 'home', testimonials: 'home', gallery: 'home', cta_home: 'home',
  page_hero_about: 'about_page', why_us_content: 'about_page', vision_mission: 'about_page', cta_about: 'about_page',
  page_hero_pricing: 'pricing_page', pricing: 'pricing_page', faq: 'pricing_page', cta_pricing: 'pricing_page',
  page_hero_trainers: 'trainers_page', trainers: 'trainers_page', cta_trainers: 'trainers_page',
  page_hero_contact: 'contact_page', contact: 'contact_page', cta_contact: 'contact_page',
}

const PREVIEW_SECTIONS = new Set([
  'theme', 'design',
  'hero', 'stats', 'about', 'pricing', 'programs', 'trainers', 'testimonials', 'gallery',
  'page_hero_about', 'page_hero_pricing', 'page_hero_trainers', 'page_hero_contact',
  'why_us_content', 'vision_mission',
  'faq',
  'cta_home', 'cta_about', 'cta_pricing', 'cta_trainers', 'cta_contact',
])

// Every CMS section that can be hidden/shown on the live site
const TOGGLEABLE_SECTIONS = new Set([
  'hero', 'programs', 'about', 'trainers', 'testimonials', 'gallery', 'cta_home',
  'page_hero_about', 'why_us_content', 'vision_mission', 'cta_about',
  'page_hero_pricing', 'pricing', 'faq', 'cta_pricing',
  'page_hero_trainers', 'trainers', 'cta_trainers',
  'page_hero_contact', 'contact', 'cta_contact',
])

const PAGE_HERO_DEFAULTS = {
  about:    { label: 'Our Story',      title: 'ABOUT US',         desc: 'Learn about who we are, what drives us, and why our members love training here.' },
  pricing:  { label: 'Membership',    title: 'CHOOSE YOUR PLAN', desc: 'No contracts. No hidden fees. Just premium fitness, priced for real people.' },
  trainers: { label: 'Expert Coaches', title: 'MEET THE COACHES', desc: 'Our certified coaches are here to guide, motivate, and push you to new limits.' },
  contact:  { label: 'Reach Out',     title: 'GET IN TOUCH',     desc: "Questions, tour requests, or just want to say hello — we're here for you." },
}

const CTA_DEFAULTS = {
  cta_home:     'ARE YOU IN?',
  cta_about:    'JOIN US TODAY',
  cta_pricing:  'START TODAY',
  cta_trainers: 'TRAIN WITH THE BEST',
  cta_contact:  'COME VISIT US',
}

function canAccessPage(minPlan, planName) {
  if (minPlan === 'Starter') return true
  if (minPlan === 'Pro') return planName === 'Pro' || planName === 'Enterprise'
  return false
}

// ─── Section Visibility Toggle ──────────────────────────────────────────────────
function SectionVisibilityToggle({ sectionId, gymId, content, onSave, label }) {
  const dialog = useDialog()
  const hidden = Array.isArray(content?.hidden_sections) ? content.hidden_sections : []
  const isHidden = hidden.includes(sectionId)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    const updated = isHidden
      ? hidden.filter(id => id !== sectionId)
      : [...hidden, sectionId]
    try {
      const result = await upsertCmsContent(gymId, { hidden_sections: updated })
      onSave(prev => ({ ...prev, ...result }))
    } catch (err) { dialog.alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl mb-4 border ${
      isHidden
        ? 'bg-amber-50 border-amber-200'
        : 'bg-emerald-50 border-emerald-100'
    }`}>
      <div className="flex items-center gap-2">
        {isHidden ? (
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        <span className={`text-xs font-semibold ${isHidden ? 'text-amber-700' : 'text-emerald-700'}`}>
          {label && <span className="font-bold">{label} — </span>}
          {isHidden ? 'Hidden from live site' : 'Visible on live site'}
        </span>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
          isHidden
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        {saving && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {isHidden ? 'Show section' : 'Hide section'}
      </button>
    </div>
  )
}

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
function ThemePanel({ gym, gymId, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [name, setName] = useState(gym?.name || '')
  const [city, setCity] = useState(gym?.city || '')
  const [description, setDescription] = useState(gym?.description || '')
  const [themeColor, setThemeColor] = useState(gym?.theme_color || '#8B5CF6')
  const [secondaryColor, setSecondaryColor] = useState(gym?.secondary_color || '#6366F1')
  const [themeMode, setThemeMode] = useState(gym?.theme_mode || 'dark')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function pushOverride(overrides) {
    setPreviewData?.(p => ({
      ...p,
      _themeOverride: { theme_color: themeColor, secondary_color: secondaryColor, theme_mode: themeMode, ...overrides },
    }))
  }

  function handleThemeColor(val)     { setThemeColor(val);     pushOverride({ theme_color:     val }) }
  function handleSecondaryColor(val) { setSecondaryColor(val); pushOverride({ secondary_color: val }) }
  function handleThemeMode(val)      { setThemeMode(val);      pushOverride({ theme_mode:      val }) }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({ gymId, name: name.trim(), city: city.trim(), description: description.trim(), theme_color: themeColor, secondary_color: secondaryColor, theme_mode: themeMode })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
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

      <Field label="Website Theme" hint="Toggle between dark and light mode for your public website.">
        <div className="flex gap-3 mt-1">
          {[
            { value: 'dark',  label: 'Dark',  Icon: Moon,  desc: 'Dark background, light text' },
            { value: 'light', label: 'Light', Icon: Sun,   desc: 'Light background, dark text' },
          ].map(m => (
            <button key={m.value} type="button" onClick={() => handleThemeMode(m.value)}
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

      <Field label="Primary Color" hint="Used for buttons, accents, and gradients.">
        <div className="flex items-center gap-2.5 flex-wrap mt-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => handleThemeColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
              style={{ backgroundColor: c, borderColor: themeColor === c ? c : 'transparent', boxShadow: themeColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
          ))}
          <input type="color" value={themeColor} onChange={e => handleThemeColor(e.target.value)} className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden" />
          <span className="text-xs text-gray-400 font-mono">{themeColor}</span>
        </div>
      </Field>

      <Field label="Secondary Color" hint="Used as the second gradient stop.">
        <div className="flex items-center gap-2.5 flex-wrap mt-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => handleSecondaryColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
              style={{ backgroundColor: c, borderColor: secondaryColor === c ? c : 'transparent', boxShadow: secondaryColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
          ))}
          <input type="color" value={secondaryColor} onChange={e => handleSecondaryColor(e.target.value)} className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden" />
          <span className="text-xs text-gray-400 font-mono">{secondaryColor}</span>
        </div>
        <div className="mt-2 h-6 rounded-lg" style={{ background: `linear-gradient(to right, ${themeColor}, ${secondaryColor})` }} />
      </Field>

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

// ─── Design Panel ───────────────────────────────────────────────────────────────
function DesignPanel({ gym, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [fontFamily, setFontFamily] = useState(gym?.font_family || 'default')
  const [headingSize, setHeadingSize] = useState(gym?.heading_size || 'md')
  const [cardStyle, setCardStyle] = useState(gym?.card_style || 'rounded')
  const [borderRadius, setBorderRadius] = useState(gym?.border_radius ?? 12)
  const [shadowIntensity, setShadowIntensity] = useState(gym?.shadow_intensity || 'md')
  const [spacing, setSpacing] = useState(gym?.spacing || 'normal')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function pushOverride(overrides) {
    setPreviewData?.(p => ({
      ...p,
      _designOverride: {
        font_family: fontFamily, heading_size: headingSize, card_style: cardStyle,
        border_radius: borderRadius, shadow_intensity: shadowIntensity, spacing,
        ...overrides,
      },
    }))
  }

  function handleFontFamily(val)      { setFontFamily(val);      pushOverride({ font_family:      val }) }
  function handleHeadingSize(val)     { setHeadingSize(val);     pushOverride({ heading_size:     val }) }
  function handleCardStyle(val)       { setCardStyle(val);       pushOverride({ card_style:       val }) }
  function handleBorderRadius(val)    { setBorderRadius(val);    pushOverride({ border_radius:    val }) }
  function handleShadowIntensity(val) { setShadowIntensity(val); pushOverride({ shadow_intensity: val }) }
  function handleSpacing(val)         { setSpacing(val);         pushOverride({ spacing:          val }) }

  async function resetToDefaults() {
    if (!await dialog.confirm('Reset all design settings to defaults?')) return
    const d = DESIGN_DEFAULTS
    setFontFamily(d.fontFamily); setHeadingSize(d.headingSize)
    setCardStyle(d.cardStyle);   setBorderRadius(d.borderRadius)
    setShadowIntensity(d.shadowIntensity); setSpacing(d.spacing)
    pushOverride({
      font_family: d.fontFamily, heading_size: d.headingSize, card_style: d.cardStyle,
      border_radius: d.borderRadius, shadow_intensity: d.shadowIntensity, spacing: d.spacing,
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({ gymId, font_family: fontFamily, heading_size: headingSize, card_style: cardStyle, border_radius: borderRadius, shadow_intensity: shadowIntensity, spacing })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
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
            Reset
          </button>
        }
      />

      <FeatureGate feature="font_controls" planName={planName}>
        <Field label="Font Family" hint="Choose a typeface for headings across your site.">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
            {FONT_OPTIONS.map(f => (
              <button key={f.value} type="button" onClick={() => handleFontFamily(f.value)}
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

      <FeatureGate feature="font_controls" planName={planName}>
        <Field label="Heading Size" hint="Controls how large the hero and section headings appear. (default: md)">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {HEADING_SIZE_OPTIONS.map(h => (
              <button key={h.value} type="button" onClick={() => handleHeadingSize(h.value)}
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

      <FeatureGate feature="card_style" planName={planName}>
        <Field label="Card Style" hint="Controls the corner rounding on cards throughout your site.">
          <div className="flex gap-3 mt-1">
            {[{ value: 'rounded', label: 'Rounded', radius: '1rem' }, { value: 'sharp', label: 'Sharp', radius: '0.25rem' }].map(s => (
              <button key={s.value} type="button" onClick={() => handleCardStyle(s.value)}
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

      <FeatureGate feature="advanced_design" planName={planName}>
        <div className="space-y-5">
          <Field label={`Border Radius — ${borderRadius}px`} hint="Controls corner rounding for cards, images and buttons globally. (default: 12px)">
            <input type="range" min={0} max={24} step={2} value={borderRadius} onChange={e => handleBorderRadius(Number(e.target.value))}
              className="w-full accent-violet-600 mt-1" />
          </Field>
          <Field label="Shadow Intensity" hint="Controls the shadow intensity for cards globally. (default: md)">
            <div className="flex gap-2 mt-1">
              {['none', 'sm', 'md', 'lg'].map(s => (
                <button key={s} type="button" onClick={() => handleShadowIntensity(s)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer uppercase tracking-wide ${
                    shadowIntensity === s ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Spacing" hint="Controls the padding between sections globally. (default: normal)">
            <div className="flex gap-2 mt-1">
              {['compact', 'normal', 'spacious'].map(s => (
                <button key={s} type="button" onClick={() => handleSpacing(s)}
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

// ─── Gallery Panel ──────────────────────────────────────────────────────────────
function GalleryPanel({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const galleryImgs = useCMSImageList({
    gymId,
    fieldKey: 'gallery_images',
    section: 'gallery',
    initialList: content?.gallery_images || [],
  })

  useEffect(() => {
    setPreviewData?.(p => ({ ...p, gallery_images: galleryImgs.list, _ts: Date.now() }))
  }, [galleryImgs.list]) // eslint-disable-line react-hooks/exhaustive-deps

  // Called by ImageUploader for deletes (via Del button) and URL adds (via Add button)
  function handleListChange(newList) {
    const deleted = galleryImgs.list.filter(u => !newList.includes(u))
    if (deleted.length > 0) {
      deleted.forEach(u => galleryImgs.handleDelete(u))
      return
    }
    const added = newList.filter(u => !galleryImgs.list.includes(u))
    added.forEach(u => galleryImgs.handleUrlAdd(u))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const finalList = await galleryImgs.commitList()
      const updated = await upsertCmsContent(gymId, {
        gallery_images: finalList.length ? finalList : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Gallery" description="Photo grid shown on your home page. Leave empty to hide the section." />

      <ImageUploader
        gymId={gymId}
        section="gallery"
        currentUrl=""
        onChange={() => {}}
        imageList={galleryImgs.list}
        onListChange={handleListChange}
        onFileSelected={galleryImgs.handleFile}
        isPending={galleryImgs.isPending}
        pendingUrls={galleryImgs.pendingUrls}
        selectMode={false}
        planName={planName}
        label="Gallery Images"
        hint="Landscape or square photos work best. Uploaded as WebP for fast loading."
      />
      {galleryImgs.error && <p className="text-xs text-red-500">{galleryImgs.error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Stats Panel ────────────────────────────────────────────────────────────────
const STAT_PLACEHOLDERS = [
  { value: '500+', label: 'Members' },
  { value: '15+',  label: 'Trainers' },
  { value: '50+',  label: 'Classes/Week' },
  { value: '10+',  label: 'Years Running' },
]

function StatsPanel({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [stats, setStats] = useState(() =>
    content?.stats?.length >= 4
      ? content.stats.slice(0, 4).map(s => ({ value: s.value || '', label: s.label || '' }))
      : [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function patchStat(i, key, val) {
    setStats(prev => {
      const next = prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s)
      setPreviewData?.(p => ({ ...p, stats: next }))
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const hasStats = stats.some(s => s.value.trim() || s.label.trim())
      const updated = await upsertCmsContent(gymId, {
        stats: hasStats ? stats.map(s => ({ value: s.value.trim(), label: s.label.trim() })) : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Stats" description="4 animated counters shown on the home and about pages." />

      {/* Visibility toggles — Enterprise only */}
      {canAccess('section_visibility', planName) && (
        <div className="space-y-2">
          <SectionVisibilityToggle sectionId="stats_home"  gymId={gymId} content={content} onSave={onSave} label="Home Page" />
          <SectionVisibilityToggle sectionId="stats_about" gymId={gymId} content={content} onSave={onSave} label="About Page" />
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <span className="text-xs font-medium text-gray-500">Value</span>
          <span className="text-xs font-medium text-gray-500">Label</span>
        </div>
        {stats.map((stat, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input type="text" value={stat.value} onChange={e => patchStat(i, 'value', e.target.value)}
              placeholder={STAT_PLACEHOLDERS[i].value} className={inputCls} />
            <input type="text" value={stat.label} onChange={e => patchStat(i, 'label', e.target.value)}
              placeholder={STAT_PLACEHOLDERS[i].label} className={inputCls} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Page Hero Form ─────────────────────────────────────────────────────────────
function PageHeroForm({ pageKey, content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const defs = PAGE_HERO_DEFAULTS[pageKey]
  const lk = `${pageKey}_page_label`
  const tk = `${pageKey}_page_title`
  const dk = `${pageKey}_page_desc`
  const ik = `${pageKey}_page_image`
  const ak = `${pageKey}_page_align`

  // Default alignment per page (matches the existing public page layout)
  const defaultAlign = pageKey === 'pricing' ? 'center' : 'left'

  const [label,   setLabel]   = useState(content?.[lk] || '')
  const [title,   setTitle]   = useState(content?.[tk] || '')
  const [desc,    setDesc]    = useState(content?.[dk] || '')
  const [align,   setAlign]   = useState(content?.[ak] || defaultAlign)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')

  const img = useCMSImage({
    gymId,
    fieldKey: ik,
    section: 'page_hero',
    initialUrl: content?.[ik] || '',
  })

  const pageName = { about: 'About', pricing: 'Pricing', trainers: 'Trainers', contact: 'Contact' }[pageKey]

  function updateLabel(val) { setLabel(val); setPreviewData?.(p => ({ ...p, [lk]: val })) }
  function updateTitle(val) { setTitle(val); setPreviewData?.(p => ({ ...p, [tk]: val })) }
  function updateDesc(val)  { setDesc(val);  setPreviewData?.(p => ({ ...p, [dk]: val })) }
  function updateImage(val) {
    img.handleUrl(val)
    setPreviewData?.(p => ({ ...p, [ik]: val }))
  }
  function updateAlign(val) { setAlign(val); setPreviewData?.(p => ({ ...p, [ak]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const finalImage = await img.commit()
      const fields = {
        [lk]: label.trim() || null,
        [tk]: title.trim() || null,
        [dk]: desc.trim() || null,
        [ik]: finalImage || null,
        [ak]: align !== defaultAlign ? align : null,
      }
      const updated = await upsertCmsContent(gymId, fields)
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader
        title={`${pageName} Page — Hero`}
        description="The banner at the very top of this page. Leave any field empty to use the default." />

      {/* Background image + text alignment — Enterprise only */}
      <FeatureGate feature="page_hero_image" planName={planName} hint="Upgrade to Enterprise to add a background image and control text placement on page heroes.">
        <div className="space-y-4">
          <ImageUploader
            gymId={gymId}
            section="page_hero"
            currentUrl={img.url}
            onChange={updateImage}
            onFileSelected={img.handleFile}
            isPending={img.isPending}
            planName={planName}
            usageCount={img.url ? 1 : 0}
            label="Background Image"
            hint="Shown behind the hero text with a dark overlay. Ideal: 1600×600px or wider."
          />
          {img.error && <p className="text-xs text-red-500">{img.error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Text Placement</label>
            <div className="flex gap-2">
              {[
                {
                  value: 'left',
                  label: 'Left',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 6h18M3 10h12M3 14h15M3 18h10" />
                    </svg>
                  ),
                },
                {
                  value: 'center',
                  label: 'Center',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 6h18M6 10h12M4.5 14h15M6 18h12" />
                    </svg>
                  ),
                },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateAlign(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    align === opt.value
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FeatureGate>

      <Field label="Label" hint={`Small badge above the title. Default: "${defs.label}"`}>
        <input type="text" value={label} onChange={e => updateLabel(e.target.value)} placeholder={defs.label} className={inputCls} />
      </Field>
      <Field label="Title" hint={`Big page heading. Default: "${defs.title}"`}>
        <input type="text" value={title} onChange={e => updateTitle(e.target.value)} placeholder={defs.title} className={inputCls} />
      </Field>
      <Field label="Description" hint="Subtitle shown below the title.">
        <textarea value={desc} onChange={e => updateDesc(e.target.value)} rows={3} placeholder={defs.desc} className={inputCls + ' resize-none'} />
      </Field>
      <div className="flex items-center gap-3">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Single CTA Panel ───────────────────────────────────────────────────────────
function SingleCTAPanel({ fieldKey, pageLabel, content, gymId, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [value, setValue] = useState(content?.[fieldKey] || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function handleChange(val) {
    setValue(val)
    setPreviewData?.(p => ({ ...p, [fieldKey]: val || undefined }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, { [fieldKey]: value.trim() || null })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader
        title={`${pageLabel} — Call to Action`}
        description={`The bold headline at the bottom of the ${pageLabel}. Leave empty to use the default.`} />
      <Field label="CTA Headline" hint={`Default: "${CTA_DEFAULTS[fieldKey]}"`}>
        <input type="text" value={value} onChange={e => handleChange(e.target.value)} placeholder={CTA_DEFAULTS[fieldKey]} className={inputCls} />
      </Field>
      <div className="flex items-center gap-3">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Why Us Form ────────────────────────────────────────────────────────────────
const WHY_US_PLACEHOLDERS = [
  { title: 'World-Class Equipment', description: 'Over 200 pieces of premium equipment, updated every year.' },
  { title: 'Expert Coaching',       description: 'Every trainer is certified and passionate about your results.' },
  { title: 'Proven Programs',       description: '50+ structured classes per week — from beginner to elite.' },
  { title: 'Real Community',        description: 'Over 500 members who push each other to be better.' },
]

function WhyUsForm({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [whyLabel,   setWhyLabel]   = useState(content?.why_us_label   || '')
  const [whyHeading, setWhyHeading] = useState(content?.why_us_heading || '')
  const [items, setItems] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      title:       content?.why_us?.[i]?.title       || '',
      description: content?.why_us?.[i]?.description || '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function updateWhyLabel(val)   { setWhyLabel(val);   setPreviewData?.(p => ({ ...p, why_us_label:   val || undefined })) }
  function updateWhyHeading(val) { setWhyHeading(val); setPreviewData?.(p => ({ ...p, why_us_heading: val || undefined })) }

  function patchItem(i, key, val) {
    setItems(prev => {
      const next = prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item)
      // Show typed value or fall back to placeholder so other cards don't go blank in preview
      setPreviewData?.(p => ({
        ...p,
        why_us: next.map((item, idx) => ({
          title:       item.title       || WHY_US_PLACEHOLDERS[idx].title,
          description: item.description || WHY_US_PLACEHOLDERS[idx].description,
        })),
      }))
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const valid = items.filter(it => it.title.trim() || it.description.trim())
      const updated = await upsertCmsContent(gymId, {
        why_us_label:   whyLabel.trim()   || null,
        why_us_heading: whyHeading.trim() || null,
        why_us: valid.length ? items.map(w => ({ title: w.title.trim(), description: w.description.trim() })) : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Why Choose Us" description="4 feature cards shown on the About page. Leave empty to use defaults." />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Why Us"'>
              <input type="text" value={whyLabel} onChange={e => updateWhyLabel(e.target.value)} placeholder="Why Us" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "WHY CHOOSE US"'>
              <input type="text" value={whyHeading} onChange={e => updateWhyHeading(e.target.value)} placeholder="WHY CHOOSE US" className={inputCls} />
            </Field>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          {items.map((item, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Card {i + 1}</p>
              <Field label="Title">
                <input type="text" value={item.title} onChange={e => patchItem(i, 'title', e.target.value)}
                  placeholder={WHY_US_PLACEHOLDERS[i].title} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={item.description} onChange={e => patchItem(i, 'description', e.target.value)}
                  rows={2} placeholder={WHY_US_PLACEHOLDERS[i].description} className={inputCls + ' resize-none'} />
              </Field>
            </div>
          ))}
        </div>
      </FeatureGate>
      <div className="flex items-center gap-3">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Vision & Mission Form ───────────────────────────────────────────────────────
function VisionMissionForm({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [visionLabel,   setVisionLabel]   = useState(content?.vision_section_label   || '')
  const [visionHeading, setVisionHeading] = useState(content?.vision_section_heading || '')
  const [vision,  setVision]  = useState(content?.vision  || '')
  const [mission, setMission] = useState(content?.mission || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const VISION_DEFAULT  = "To be the city's most transformative fitness community — where every person achieves their strongest self."
  const MISSION_DEFAULT = 'To provide elite coaching, world-class facilities, and an unbreakable community that makes fitness accessible to all.'

  function updateVisionLabel(val)   { setVisionLabel(val);   setPreviewData?.(p => ({ ...p, vision_section_label:   val || undefined })) }
  function updateVisionHeading(val) { setVisionHeading(val); setPreviewData?.(p => ({ ...p, vision_section_heading: val || undefined })) }
  function updateVision(val)  { setVision(val);  setPreviewData?.(p => ({ ...p, vision:  val || VISION_DEFAULT })) }
  function updateMission(val) { setMission(val); setPreviewData?.(p => ({ ...p, mission: val || MISSION_DEFAULT })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        vision_section_label:   visionLabel.trim()   || null,
        vision_section_heading: visionHeading.trim() || null,
        vision: vision.trim() || null,
        mission: mission.trim() || null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SectionHeader title="Vision & Mission" description="Two purpose statement cards shown on the About page." />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Purpose"'>
              <input type="text" value={visionLabel} onChange={e => updateVisionLabel(e.target.value)} placeholder="Purpose" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "VISION & MISSION"'>
              <input type="text" value={visionHeading} onChange={e => updateVisionHeading(e.target.value)} placeholder="VISION & MISSION" className={inputCls} />
            </Field>
          </div>
          <div className="h-px bg-gray-100" />
          <Field label="Our Vision" hint="Long-term aspirational statement — 1–2 sentences.">
            <textarea value={vision} onChange={e => updateVision(e.target.value)} rows={4}
              placeholder="To be the city's most transformative fitness community — where every person achieves their strongest self."
              className={inputCls + ' resize-none'} />
          </Field>
          <Field label="Our Mission" hint="Day-to-day purpose and operational goal.">
            <textarea value={mission} onChange={e => updateMission(e.target.value)} rows={4}
              placeholder="To provide elite coaching, world-class facilities, and an unbreakable community that makes fitness accessible to all."
              className={inputCls + ' resize-none'} />
          </Field>
        </div>
      </FeatureGate>
      <div className="flex items-center gap-3">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

// ─── Pricing Panel ──────────────────────────────────────────────────────────────
function IncludedFeaturesSubPanel({ content, gymId, onSave, planName, setPreviewData }) {
  const dialog = useDialog()
  const [pricingLabel,   setPricingLabel]   = useState(content?.pricing_section_label   || '')
  const [pricingHeading, setPricingHeading] = useState(content?.pricing_section_heading || '')
  const [text, setText] = useState(content?.included_features?.length ? content.included_features.join('\n') : '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function updatePricingLabel(val) {
    setPricingLabel(val)
    setPreviewData?.(p => ({ ...p, pricing_section_label: val || undefined }))
  }
  function updatePricingHeading(val) {
    setPricingHeading(val)
    setPreviewData?.(p => ({ ...p, pricing_section_heading: val || undefined }))
  }
  function updateText(val) {
    setText(val)
    const features = val.split('\n').map(f => f.trim()).filter(Boolean)
    setPreviewData?.(p => ({ ...p, included_features: features.length ? features : undefined }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const features = text.split('\n').map(f => f.trim()).filter(Boolean)
      const updated = await upsertCmsContent(gymId, {
        pricing_section_label:   pricingLabel.trim()   || null,
        pricing_section_heading: pricingHeading.trim() || null,
        included_features: features.length ? features : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SubSectionDivider title="Included In All Plans" description="Section header and bullet points shown below pricing cards." />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Included in all plans"'>
              <input type="text" value={pricingLabel} onChange={e => updatePricingLabel(e.target.value)} placeholder="Included in all plans" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "EVERY PLAN INCLUDES"'>
              <input type="text" value={pricingHeading} onChange={e => updatePricingHeading(e.target.value)} placeholder="EVERY PLAN INCLUDES" className={inputCls} />
            </Field>
          </div>
        </div>
      </FeatureGate>
      <textarea value={text} onChange={e => updateText(e.target.value)} rows={6}
        placeholder={'24/7 gym floor access\nFree fitness assessment\nLocker & shower facilities\nFree parking\nMember mobile app\nNo joining fee ever'}
        className={inputCls + ' resize-none'} />
      <div className="flex items-center gap-3 mt-4">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

const EMPTY_PLAN = { name: '', price: '', duration_label: '', features_text: '', is_popular: false }

function PricingPanel({ plans: initPlans, gymId, onUpdate, content, onSaveCms, planName, setPreviewData }) {
  const dialog = useDialog()
  const [plansLabel,    setPlansLabel]    = useState(content?.plans_section_label    || '')
  const [plansHeading,  setPlansHeading]  = useState(content?.plans_section_heading  || '')
  const [plansSubtitle, setPlansSubtitle] = useState(content?.plans_section_subtitle || '')
  const [plans, setPlans] = useState(initPlans)
  const [headerSaving,  setHeaderSaving]  = useState(false)
  const [headerSuccess, setHeaderSuccess] = useState('')

  function updatePlansLabel(val)    { setPlansLabel(val);    setPreviewData?.(p => ({ ...p, plans_section_label:    val || undefined })) }
  function updatePlansHeading(val)  { setPlansHeading(val);  setPreviewData?.(p => ({ ...p, plans_section_heading:  val || undefined })) }
  function updatePlansSubtitle(val) { setPlansSubtitle(val); setPreviewData?.(p => ({ ...p, plans_section_subtitle: val || undefined })) }

  async function savePlansHeader() {
    setHeaderSaving(true); setHeaderSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        plans_section_label:    plansLabel.trim()    || null,
        plans_section_heading:  plansHeading.trim()  || null,
        plans_section_subtitle: plansSubtitle.trim() || null,
      })
      onSaveCms(prev => ({ ...prev, ...updated }))
      setHeaderSuccess('Saved!')
      setTimeout(() => setHeaderSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setHeaderSaving(false) }
  }
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
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this plan?')) return
    setDeleting(id)
    try {
      await deleteCmsPlan(id)
      const updated = plans.filter(p => p.id !== id)
      setPlans(updated); onUpdate(updated)
      if (form?.data?.id === id) setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Membership Plans" description="Plans shown on your Pricing page." action={<AddBtn onClick={openAdd} label="Add Plan" />} />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Membership"'>
              <input type="text" value={plansLabel} onChange={e => updatePlansLabel(e.target.value)} placeholder="Membership" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "Our Programs"'>
              <input type="text" value={plansHeading} onChange={e => updatePlansHeading(e.target.value)} placeholder="Our Programs" className={inputCls} />
            </Field>
          </div>
          <Field label="Subtitle" hint="Short line below the heading.">
            <input type="text" value={plansSubtitle} onChange={e => updatePlansSubtitle(e.target.value)} placeholder="Choose the plan that matches your fitness ambitions" className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <SaveBtn saving={headerSaving} onClick={savePlansHeader} type="button" />
            <SuccessMsg msg={headerSuccess} />
          </div>
        </div>
      </FeatureGate>
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
      <IncludedFeaturesSubPanel content={content} gymId={gymId} onSave={onSaveCms} planName={planName} setPreviewData={setPreviewData} />
    </div>
  )
}

// ─── Training Programs Panel ────────────────────────────────────────────────────
const EMPTY_PROG = { title: '', category: '', description: '', image: '' }
const PROG_CATEGORIES = ['STRENGTH', 'HIIT', 'YOGA', 'CARDIO', 'BOXING', 'CROSSFIT']

function ProgramInlineForm({ mode, data, gymId, planName, imageCount, onSave, onCancel }) {
  const dialog = useDialog()
  const [title,       setTitle]       = useState(data.title)
  const [category,    setCategory]    = useState(data.category)
  const [description, setDescription] = useState(data.description)
  const [saving,      setSaving]      = useState(false)

  const img = useCMSImage({
    gymId,
    fieldKey: `program_img_${data.id || 'new'}`,
    section: 'programs',
    initialUrl: data.image || '',
  })

  async function handleCancel() {
    await img.discard()
    onCancel()
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const finalImage = await img.commit()
      await onSave({
        id: data.id,
        title: title.trim(),
        category: category.trim().toUpperCase() || 'TRAINING',
        description: description.trim(),
        image: finalImage || '',
      })
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="mt-3 p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {mode === 'add' ? 'New Program' : 'Edit Program'}
      </p>
      <Field label="Program Title" required>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Iron Weight Training" className={inputCls} />
      </Field>
      <Field label="Category">
        <div className="flex gap-2 flex-wrap mb-2">
          {PROG_CATEGORIES.map(c => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${category === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'}`}>
              {c}
            </button>
          ))}
        </div>
        <input type="text" value={category} onChange={e => setCategory(e.target.value.toUpperCase())} placeholder="STRENGTH" className={inputCls} />
      </Field>
      <Field label="Description">
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Build raw power and lean muscle" className={inputCls} />
      </Field>
      <ImageUploader
        gymId={gymId}
        section="programs"
        currentUrl={img.url}
        onChange={img.handleUrl}
        onFileSelected={img.handleFile}
        isPending={img.isPending}
        planName={planName}
        usageCount={imageCount}
        label="Program Image"
        hint="Background photo for the card."
      />
      {img.error && <p className="text-xs text-red-500">{img.error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Cancel
        </button>
        <SaveBtn saving={saving || img.uploading} onClick={handleSave} label={img.uploading ? 'Uploading…' : 'Save'} type="button" />
      </div>
    </div>
  )
}

function ProgramsPanel({ content, gymId, onSave, planName, setPreviewData }) {
  const dialog = useDialog()
  const [progLabel,   setProgLabel]   = useState(content?.programs_label   || '')
  const [progHeading, setProgHeading] = useState(content?.programs_heading || '')
  const [progDesc,    setProgDesc]    = useState(content?.programs_desc    || '')
  const [items, setItems] = useState(content?.training_programs || [])
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [headerSaving,  setHeaderSaving]  = useState(false)
  const [headerSuccess, setHeaderSuccess] = useState('')

  function updateProgLabel(val)   { setProgLabel(val);   setPreviewData?.(p => ({ ...p, programs_label:   val || undefined })) }
  function updateProgHeading(val) { setProgHeading(val); setPreviewData?.(p => ({ ...p, programs_heading: val || undefined })) }
  function updateProgDesc(val)    { setProgDesc(val);    setPreviewData?.(p => ({ ...p, programs_desc:    val || undefined })) }

  async function saveHeader() {
    setHeaderSaving(true); setHeaderSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        programs_label:   progLabel.trim()   || null,
        programs_heading: progHeading.trim() || null,
        programs_desc:    progDesc.trim()    || null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setHeaderSuccess('Saved!')
      setTimeout(() => setHeaderSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setHeaderSaving(false) }
  }

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { training_programs: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated }))
    setItems(newItems)
    setPreviewData?.(p => ({ ...p, training_programs: newItems.length ? newItems : null, _ts: Date.now() }))
  }

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_PROG, id: Date.now().toString() } }) }
  function openEdit(item) { setForm({ mode: 'edit', data: { ...item } }) }

  async function handleInlineSave(payload) {
    const entry = { ...payload, id: payload.id || Date.now().toString() }
    const newItems = form.mode === 'add' ? [...items, entry] : items.map(it => it.id === entry.id ? entry : it)
    await persist(newItems)
    setForm(null)
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this program?')) return
    setDeleting(id)
    try {
      const item = items.find(it => it.id === id)
      if (item?.image) await deleteFile(item.image)
      await persist(items.filter(it => it.id !== id))
      if (form?.data?.id === id) setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  const imageCount = items.filter(it => it.image).length

  return (
    <div className="space-y-5">
      <SectionHeader title="Training Programs" description="Program cards in the 'What We Offer' grid on the homepage. Leave empty for defaults." action={<AddBtn onClick={openAdd} label="Add Program" />} />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Training Programs"'>
              <input type="text" value={progLabel} onChange={e => updateProgLabel(e.target.value)} placeholder="Training Programs" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "WHAT WE OFFER"'>
              <input type="text" value={progHeading} onChange={e => updateProgHeading(e.target.value)} placeholder="WHAT WE OFFER" className={inputCls} />
            </Field>
          </div>
          <Field label="Description" hint="Short line shown beside the heading.">
            <input type="text" value={progDesc} onChange={e => updateProgDesc(e.target.value)} placeholder="Elite programs designed to push every limit and build your best body." className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <SaveBtn saving={headerSaving} onClick={saveHeader} type="button" />
            <SuccessMsg msg={headerSuccess} />
          </div>
        </div>
      </FeatureGate>
      {items.length === 0 && !form && <EmptyState label="No custom programs — default training cards will be shown." />}
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow key={item.id} title={item.title}
            subtitle={item.category ? `${item.category}${item.description ? ' · ' + item.description.slice(0, 50) : ''}` : item.description?.slice(0, 60)}
            onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} deleting={deleting === item.id} />
        ))}
      </div>
      {form && (
        <ProgramInlineForm
          key={form.data.id || 'new'}
          mode={form.mode}
          data={form.data}
          gymId={gymId}
          planName={planName}
          imageCount={imageCount}
          onSave={handleInlineSave}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  )
}

// ─── Testimonials Panel ─────────────────────────────────────────────────────────
const EMPTY_TESTIMONIAL = { name: '', message: '', rating: 5 }

function TestimonialsPanel({ testimonials: initList, gymId, onUpdate, content, onSaveCms, setPreviewData, planName }) {
  const dialog = useDialog()
  const [testiLabel,    setTestiLabel]    = useState(content?.testimonials_label    || '')
  const [testiHeading,  setTestiHeading]  = useState(content?.testimonials_heading  || '')
  const [testiSubtitle, setTestiSubtitle] = useState(content?.testimonials_subtitle || '')
  const [list, setList] = useState(initList)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [headerSaving,  setHeaderSaving]  = useState(false)
  const [headerSuccess, setHeaderSuccess] = useState('')

  function updateTestiLabel(val)    { setTestiLabel(val);    setPreviewData?.(p => ({ ...p, testimonials_label:    val || undefined })) }
  function updateTestiHeading(val)  { setTestiHeading(val);  setPreviewData?.(p => ({ ...p, testimonials_heading:  val || undefined })) }
  function updateTestiSubtitle(val) { setTestiSubtitle(val); setPreviewData?.(p => ({ ...p, testimonials_subtitle: val || undefined })) }

  async function saveHeader() {
    setHeaderSaving(true); setHeaderSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        testimonials_label:    testiLabel.trim()    || null,
        testimonials_heading:  testiHeading.trim()  || null,
        testimonials_subtitle: testiSubtitle.trim() || null,
      })
      onSaveCms?.(prev => ({ ...prev, ...updated }))
      setHeaderSuccess('Saved!')
      setTimeout(() => setHeaderSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setHeaderSaving(false) }
  }

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
      setList(updated); onUpdate(updated); setPreviewData?.(p => ({ ...p, _testimonials: updated, _ts: Date.now() })); setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this review?')) return
    setDeleting(id)
    try {
      await deleteCmsTestimonial(id)
      const updated = list.filter(t => t.id !== id)
      setList(updated); onUpdate(updated); setPreviewData?.(p => ({ ...p, _testimonials: updated, _ts: Date.now() }))
      if (form?.data?.id === id) setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Reviews" description="Member testimonials shown on your public website." action={<AddBtn onClick={openAdd} label="Add Review" />} />
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Testimonials"'>
              <input type="text" value={testiLabel} onChange={e => updateTestiLabel(e.target.value)} placeholder="Testimonials" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "REAL PEOPLE. REAL RESULTS."'>
              <input type="text" value={testiHeading} onChange={e => updateTestiHeading(e.target.value)} placeholder="REAL PEOPLE. REAL RESULTS." className={inputCls} />
            </Field>
          </div>
          <Field label="Subtitle">
            <input type="text" value={testiSubtitle} onChange={e => updateTestiSubtitle(e.target.value)} placeholder="Stories from members who changed everything" className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <SaveBtn saving={headerSaving} onClick={saveHeader} type="button" />
            <SuccessMsg msg={headerSuccess} />
          </div>
        </div>
      </FeatureGate>
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
  { q: 'Can I cancel my membership anytime?',        a: 'Yes. Monthly plans can be cancelled at any time with no hidden fees or penalties.' },
  { q: 'Is there a joining or registration fee?',    a: 'No joining fee ever. Pay only for your chosen plan and start training immediately.' },
  { q: 'Do you offer a free trial?',                 a: 'Yes! We offer a 1-day free trial pass for new members. Visit us at the front desk to get started.' },
  { q: 'What are the gym timings?',                  a: 'We are open Monday–Saturday 5:30 AM – 10:30 PM and Sunday 6:00 AM – 8:00 PM.' },
  { q: 'Do you have personal trainers?',             a: 'Yes. All our certified trainers are available for personal sessions. Contact us to book a session.' },
  { q: 'Are locker and shower facilities included?', a: 'Yes, all plans include access to locker rooms, showers, and complimentary towel service.' },
]

function FAQPanel({ content, gymId, planName, onSave, setPreviewData }) {
  const dialog = useDialog()
  const [faqLabel,   setFaqLabel]   = useState(content?.faq_label   || '')
  const [faqHeading, setFaqHeading] = useState(content?.faq_heading || '')
  const [items, setItems] = useState(content?.faq_items || [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [headerSaving,  setHeaderSaving]  = useState(false)
  const [headerSuccess, setHeaderSuccess] = useState('')

  function updateFaqLabel(val)   { setFaqLabel(val);   setPreviewData?.(p => ({ ...p, faq_label:   val || undefined })) }
  function updateFaqHeading(val) { setFaqHeading(val); setPreviewData?.(p => ({ ...p, faq_heading: val || undefined })) }

  async function saveHeader() {
    setHeaderSaving(true); setHeaderSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, { faq_label: faqLabel.trim() || null, faq_heading: faqHeading.trim() || null })
      onSave(prev => ({ ...prev, ...updated }))
      setHeaderSuccess('Saved!')
      setTimeout(() => setHeaderSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setHeaderSaving(false) }
  }

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { faq_items: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated })); setItems(newItems)
    setPreviewData?.(p => ({ ...p, faq_items: newItems.length ? newItems : undefined }))
  }

  async function loadDefaults() {
    if (items.length > 0 && !await dialog.confirm('This will replace your current FAQ items with defaults. Continue?')) return
    await persist(DEFAULT_FAQ_ITEMS)
  }

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_FAQ } }) }
  function openEdit(item, idx) { setForm({ mode: 'edit', data: { idx, q: item.q, a: item.a } }) }
  function closeForm() { setForm(null) }
  function patch(key, val) {
    setForm(f => {
      const newData = { ...f.data, [key]: val }
      const draft = { q: newData.q || '', a: newData.a || '' }
      const draftItems = f.mode === 'add'
        ? [...items, draft]
        : items.map((it, i) => i === f.data.idx ? draft : it)
      setPreviewData?.(p => ({ ...p, faq_items: draftItems }))
      return { ...f, data: newData }
    })
  }

  async function handleSave() {
    if (!form.data.q.trim() || !form.data.a.trim()) return
    setSaving(true)
    try {
      const entry = { q: form.data.q.trim(), a: form.data.a.trim() }
      const newItems = form.mode === 'add' ? [...items, entry] : items.map((it, i) => i === form.data.idx ? entry : it)
      await persist(newItems); setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(idx) {
    if (!await dialog.confirm('Delete this FAQ item?')) return
    setDeleting(idx)
    try { await persist(items.filter((_, i) => i !== idx)); if (form?.data?.idx === idx) setForm(null) }
    catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
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
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "FAQ"'>
              <input type="text" value={faqLabel} onChange={e => updateFaqLabel(e.target.value)} placeholder="FAQ" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "GOT QUESTIONS?"'>
              <input type="text" value={faqHeading} onChange={e => updateFaqHeading(e.target.value)} placeholder="GOT QUESTIONS?" className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <SaveBtn saving={headerSaving} onClick={saveHeader} type="button" />
            <SuccessMsg msg={headerSuccess} />
          </div>
        </div>
      </FeatureGate>
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
              <div key={item.q || i}>
                <ItemRow title={item.q} subtitle={item.a?.slice(0, 70) + (item.a?.length > 70 ? '…' : '')}
                  onEdit={() => openEdit(item, i)} onDelete={() => handleDelete(i)} deleting={deleting === i} />
                {form?.mode === 'edit' && form.data.idx === i && (
                  <InlineForm title="Edit Question" onCancel={closeForm} onSave={handleSave} saving={saving}>
                    <Field label="Question" required><input type="text" value={form.data.q} onChange={e => patch('q', e.target.value)} placeholder="Can I cancel anytime?" className={inputCls} /></Field>
                    <Field label="Answer" required><textarea value={form.data.a} onChange={e => patch('a', e.target.value)} rows={3} placeholder="Yes. Monthly plans can be cancelled at any time with no hidden fees." className={inputCls + ' resize-none'} /></Field>
                  </InlineForm>
                )}
              </div>
            ))}
          </div>
          {form?.mode === 'add' && (
            <InlineForm title="New Question" onCancel={closeForm} onSave={handleSave} saving={saving}>
              <Field label="Question" required><input type="text" value={form.data.q} onChange={e => patch('q', e.target.value)} placeholder="Can I cancel anytime?" className={inputCls} /></Field>
              <Field label="Answer" required><textarea value={form.data.a} onChange={e => patch('a', e.target.value)} rows={3} placeholder="Yes. Monthly plans can be cancelled at any time with no hidden fees." className={inputCls + ' resize-none'} /></Field>
            </InlineForm>
          )}
        </div>
      </FeatureGate>
    </div>
  )
}

// ─── Contact Panel ──────────────────────────────────────────────────────────────
const CONTACT_DEFAULT_HOURS = [
  { day: 'Mon – Fri',  time: '6:00 AM – 10:00 PM' },
  { day: 'Saturday',   time: '7:00 AM – 8:00 PM' },
  { day: 'Sunday',     time: '8:00 AM – 6:00 PM' },
]

function ContactPanel({ gym, gymId, onSave }) {
  const dialog = useDialog()
  const [phone, setPhone] = useState(gym?.phone || '')
  const [email, setEmail] = useState(gym?.email || '')
  const [address, setAddress] = useState(gym?.address || '')
  const [workingHours, setWorkingHours] = useState(Array.isArray(gym?.working_hours) ? gym.working_hours : [])
  const [newDay, setNewDay] = useState('')
  const [newTime, setNewTime] = useState('')
  const [socialLinks, setSocialLinks] = useState(gym?.social_links || [])
  const [addPlatform, setAddPlatform] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [location, setLocation] = useState(
    gym?.lat && gym?.lng
      ? { lat: gym.lat, lng: gym.lng, placeName: gym.address || '' }
      : null
  )

  const themeVars = getFullThemeCSSVars(gym || {})
  const mapSrc = (location?.lat && location?.lng)
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : location?.address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(location.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
      : null

  const usedPlatforms = socialLinks.map(l => l.platform)
  const availablePlatforms = SOCIAL_PLATFORMS.filter(p => !usedPlatforms.includes(p.id))
  const previewHours = workingHours.length > 0 ? workingHours : CONTACT_DEFAULT_HOURS

  function addTiming() {
    if (!newDay.trim() || !newTime.trim()) return
    setWorkingHours(p => [...p, { day: newDay.trim(), time: newTime.trim() }])
    setNewDay(''); setNewTime('')
  }

  function addLink() {
    const url = addUrl.trim()
    if (!addPlatform || !url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      dialog.alert('Please enter a valid URL starting with https://')
      return
    }
    setSocialLinks(prev => [...prev, { platform: addPlatform, url }])
    setAddPlatform(''); setAddUrl('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await updateGymDetails({
        gymId,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        working_hours: workingHours,
        social_links: socialLinks,
      })
      onSave(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8">

      {/* ── Form ── */}
      <form onSubmit={handleSave} className="flex-1 min-w-0 space-y-5">
        <SectionHeader title="Contact Info" description="Shown on the Contact page and in the footer of your public website." />

        {/* Working Hours first */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Working Hours</label>
          {workingHours.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">{entry.day}</span>
              <span className="text-xs text-gray-500 flex-1 min-w-0 truncate text-right">{entry.time}</span>
              <button type="button" onClick={() => setWorkingHours(prev => prev.filter((_, i) => i !== idx))}
                className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={newDay} onChange={e => setNewDay(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              placeholder="Day (e.g. Mon – Fri)" className={inputCls + ' flex-1 min-w-0'} />
            <input type="text" value={newTime} onChange={e => setNewTime(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTiming() } }}
              placeholder="Time (e.g. 6 AM – 10 PM)" className={inputCls + ' flex-1 min-w-0'} />
            <button type="button" onClick={addTiming} disabled={!newDay.trim() || !newTime.trim()}
              className="shrink-0 px-3 py-2 bg-violet-100 text-violet-700 font-semibold text-sm rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              Add Timing
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Contact info */}
        <Field label="Phone Number" hint="e.g. +91 98765 43210">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
        </Field>
        <Field label="Email Address">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@yourgym.com" className={inputCls} />
        </Field>
        <Field label="Address" hint="Displayed as text on the contact page and footer.">
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
            placeholder="123 Fitness Street, Andheri West, Mumbai 400053" className={inputCls + ' resize-none'} />
        </Field>
        <Field label="Map Location" hint="Search or pin your gym on the map. Used for the embedded map only.">
          <LocationPicker value={location} onChange={setLocation} />
        </Field>

        <div className="h-px bg-gray-100" />

        {/* Social Links */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Social Links</label>
          {socialLinks.map((link, idx) => {
            const def = SOCIAL_PLATFORMS.find(p => p.id === link.platform)
            return (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <SocialIcon platform={link.platform} className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-600 w-24 shrink-0">{def?.label}</span>
                <span className="text-xs text-gray-400 truncate flex-1">{link.url}</span>
                <button type="button" onClick={() => setSocialLinks(prev => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )
          })}
          {availablePlatforms.length > 0 && (
            <div className="flex gap-2">
              <select value={addPlatform} onChange={e => setAddPlatform(e.target.value)}
                className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors">
                <option value="">Platform…</option>
                {availablePlatforms.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <input type="url" value={addUrl} onChange={e => setAddUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
                placeholder="https://…" className={inputCls + ' flex-1 min-w-0'} />
              <button type="button" onClick={addLink} disabled={!addPlatform || !addUrl.trim()}
                className="shrink-0 px-3 py-2 bg-violet-100 text-violet-700 font-semibold text-sm rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Add
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1"><SaveBtn saving={saving} /><SuccessMsg msg={success} /></div>
      </form>

      {/* ── Live Preview (same frame as other sections) ── */}
      <div className="xl:w-80 shrink-0 sticky top-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-500">Live Preview</span>
          </div>
          <span className="text-xs text-gray-400">Contact Page</span>
        </div>

        <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-900">
          <div
            data-gym-theme={gym?.theme_mode || 'dark'}
            style={{ ...themeVars, background: 'var(--gym-bg)', height: 'calc(100vh - 180px)', overflowY: 'auto' }}
          >
            <div style={{ zoom: 0.65, pointerEvents: 'none', padding: '2rem' }}>

              {/* Working Hours card */}
              <div style={{ padding: '1.75rem', background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)', marginBottom: '1.5rem' }}>
                <h3 className="font-display tracking-wider" style={{ fontSize: '1.25rem', color: 'var(--gym-text)', marginBottom: '1.5rem' }}>WORKING HOURS</h3>
                <div>
                  {previewHours.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < previewHours.length - 1 ? '1px solid var(--gym-border)' : 'none', paddingBottom: i < previewHours.length - 1 ? '1rem' : 0, marginBottom: i < previewHours.length - 1 ? '1rem' : 0 }}>
                      <span className="font-sans text-sm" style={{ color: 'var(--gym-text-secondary)' }}>{h.day}</span>
                      <span className="font-sans text-sm font-semibold" style={{ color: 'var(--gym-primary)' }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact info card */}
              {(phone || email || address) && (
                <div style={{ padding: '1.75rem', background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)', marginBottom: '1.5rem' }}>
                  <h3 className="font-display tracking-wider" style={{ fontSize: '1.25rem', color: 'var(--gym-text)', marginBottom: '1.25rem' }}>CONTACT</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ width: 18, height: 18, color: 'var(--gym-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <span className="font-sans text-sm" style={{ color: 'var(--gym-text-secondary)' }}>{phone}</span>
                      </div>
                    )}
                    {email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <svg style={{ width: 18, height: 18, color: 'var(--gym-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span className="font-sans text-sm" style={{ color: 'var(--gym-text-secondary)' }}>{email}</span>
                      </div>
                    )}
                    {address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <svg style={{ width: 18, height: 18, color: 'var(--gym-primary)', flexShrink: 0, marginTop: 2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span className="font-sans text-sm" style={{ color: 'var(--gym-text-secondary)', whiteSpace: 'pre-line' }}>{address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Map */}
              {mapSrc ? (
                <div style={{ height: '220px', borderRadius: 'var(--gym-card-radius)', overflow: 'hidden' }}>
                  <iframe key={mapSrc} src={mapSrc} title="Map preview" width="100%" height="100%"
                    style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(80%)' }} allowFullScreen />
                </div>
              ) : (
                <div style={{ height: '220px', borderRadius: 'var(--gym-card-radius)', background: 'var(--gym-card)', border: '1px solid var(--gym-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <svg style={{ width: 32, height: 32, margin: '0 auto 0.5rem', color: 'var(--gym-border)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <p className="font-sans text-xs" style={{ color: 'var(--gym-text-secondary)' }}>Add address or pin location</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-gray-400">Changes appear here instantly — hit Save to publish</p>
      </div>
    </div>
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
  const [activeSection, setActiveSection] = useState('theme')
  const [expandedPages, setExpandedPages] = useState(new Set(['settings', 'home']))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [previewData, setPreviewData] = useState(null)
  const [trainersList, setTrainersList] = useState([])

  const planName = subscription?.plan_name ?? 'Starter'
  const showPreview = canAccess('live_preview', planName) && PREVIEW_SECTIONS.has(activeSection)
  const previewGym =
    (activeSection === 'design' && previewData?._designOverride) ? { ...gym, ...previewData._designOverride } :
    (activeSection === 'theme'  && previewData?._themeOverride)  ? { ...gym, ...previewData._themeOverride  } :
    gym

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    sweepStaleDraftEntries(gymId)
    Promise.all([
      fetchGymDetails(gymId),
      fetchCmsContent(gymId).catch(() => null),
      fetchCmsPlans(gymId).catch(() => []),
      fetchCmsTestimonials(gymId).catch(() => []),
      fetchCmsTrainers(gymId).catch(() => []),
    ]).then(([g, c, p, r, t]) => {
      setGym(g); setContent(c); setPlans(p); setTestimonials(r); setTrainersList(t)
      setPreviewData(c)
    }).finally(() => setLoading(false))
  }, [gymId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Find active page/section defs for the breadcrumb
  const activePageDef = PAGES.find(p => p.sections.some(s => s.id === activeSection))
  const activeSectionDef = activePageDef?.sections.find(s => s.id === activeSection)

  function selectSection(id) {
    setActiveSection(id)
    setMobileNavOpen(false)
    const pageId = SECTION_PAGE_MAP[id]
    if (pageId) setExpandedPages(prev => new Set([...prev, pageId]))
  }

  function togglePage(pageId) {
    setExpandedPages(prev => {
      const next = new Set(prev)
      if (next.has(pageId)) {
        next.delete(pageId)
        // If the active section belongs to this page being collapsed, reset to theme
        if (SECTION_PAGE_MAP[activeSection] === pageId) {
          setActiveSection('theme')
        }
      } else {
        next.add(pageId)
      }
      return next
    })
  }

  function handleContentSave(updater) {
    setContent(updater)
    if (typeof updater === 'function') setPreviewData(prev => updater(prev))
    else setPreviewData(updater)
  }

  // ── Sidebar renderer ──
  function renderSidebar(mobile = false) {
    return (
      <ul className={mobile ? 'py-1' : 'space-y-1'}>
        {PAGES.map(page => {
          const accessible = canAccessPage(page.minPlan, planName)
          const isExpanded = expandedPages.has(page.id)
          const isCurrentPage = SECTION_PAGE_MAP[activeSection] === page.id

          return (
            <li key={page.id}>
              {/* Page group header */}
              <button
                type="button"
                onClick={() => accessible && togglePage(page.id)}
                disabled={!accessible}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  !accessible
                    ? 'text-gray-300 cursor-not-allowed'
                    : isCurrentPage || isExpanded
                      ? 'text-violet-700 bg-violet-50'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer'
                }`}
              >
                <span>{page.label}</span>
                {!accessible ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold border border-amber-100">Pro</span>
                ) : (
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Section items */}
              {accessible && isExpanded && (
                <ul className="mt-0.5 ml-2 pl-2 border-l border-gray-100 space-y-0.5">
                  {page.sections.map(sec => {
                    const secLocked = sec.minPlan && !canAccessPage(sec.minPlan, planName)
                    return (
                      <li key={sec.id}>
                        <button
                          type="button"
                          onClick={() => !secLocked && selectSection(sec.id)}
                          disabled={secLocked}
                          className={`w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                            secLocked
                              ? 'cursor-not-allowed opacity-50'
                              : activeSection === sec.id
                                ? 'bg-violet-50 text-violet-700 cursor-pointer'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`block text-sm font-medium ${activeSection === sec.id ? 'text-violet-700' : ''}`}>{sec.label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Hidden indicator dot — Enterprise only */}
                              {canAccess('section_visibility', planName) && (
                                (TOGGLEABLE_SECTIONS.has(sec.id) && (content?.hidden_sections || []).includes(sec.id)) ||
                                (sec.id === 'stats' && (
                                  (content?.hidden_sections || []).includes('stats_home') ||
                                  (content?.hidden_sections || []).includes('stats_about')
                                ))
                              ) && (
                                <span title="Hidden from live site" className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                              )}
                              {secLocked && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold border border-amber-100">Pro</span>}
                            </div>
                          </div>
                          <span className={`block text-xs mt-0.5 ${activeSection === sec.id ? 'text-violet-400' : 'text-gray-400'}`}>{sec.desc}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle — desktop only */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Show navigation' : 'Hide navigation'}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-colors cursor-pointer shrink-0"
          >
            {/* Panel layout icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Website</h1>
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
            <span className="text-gray-400 text-xs">{activePageDef?.label}</span>
            <span className="text-gray-300">›</span>
            <span className="text-violet-600 font-semibold">{activeSectionDef?.label}</span>
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileNavOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 relative p-2">
            {renderSidebar(true)}
          </div>
        )}
      </div>

      {/* CMS layout */}
      <div className={`flex gap-5 items-start ${showPreview ? 'flex-col md:flex-row' : ''}`}>
        {/* Desktop sidebar */}
        <nav
          className="cms-sidebar hidden lg:block shrink-0 sticky top-6 overflow-hidden"
          style={{
            width: sidebarCollapsed ? 0 : '12rem',
            minWidth: 0,
            maxHeight: 'calc(100vh - 3rem)',
            transition: 'width 0.25s ease',
          }}
        >
          <div className="cms-sidebar-inner w-48 overflow-y-auto overscroll-contain max-h-[calc(100vh-3rem)]">
            {renderSidebar()}
          </div>
        </nav>

        {/* Form panel */}
        <div className={`flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 ${showPreview ? 'xl:max-w-lg' : ''}`}>
          {/* Visibility toggle — Enterprise only */}
          {TOGGLEABLE_SECTIONS.has(activeSection) && canAccess('section_visibility', planName) && (
            <SectionVisibilityToggle
              sectionId={activeSection}
              gymId={gymId}
              content={content}
              onSave={handleContentSave}
            />
          )}

          {activeSection === 'theme'              && <ThemePanel gym={gym} gymId={gymId} onSave={setGym} setPreviewData={setPreviewData} />}
          {activeSection === 'design'             && <DesignPanel gym={gym} gymId={gymId} planName={planName} onSave={setGym} setPreviewData={setPreviewData} />}
          {activeSection === 'hero'               && <HeroForm content={content} gym={gym} gymId={gymId} planName={planName} onSave={handleContentSave} onSaveGym={setGym} setPreviewData={setPreviewData} />}
          {activeSection === 'stats'              && <StatsPanel content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'about'              && (
            <div>
              <SectionHeader title="About Section" description="Story, statistics, and brand values. Also shown on the About page." />
              <AboutForm content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />
            </div>
          )}
          {activeSection === 'programs'           && <ProgramsPanel content={content} gymId={gymId} onSave={handleContentSave} planName={planName} setPreviewData={setPreviewData} />}
          {activeSection === 'testimonials'       && <TestimonialsPanel testimonials={testimonials} gymId={gymId} onUpdate={setTestimonials} content={content} onSaveCms={handleContentSave} setPreviewData={setPreviewData} planName={planName} />}
          {activeSection === 'gallery'            && <GalleryPanel content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'cta_home'           && <SingleCTAPanel fieldKey="cta_home" pageLabel="Home Page" content={content} gymId={gymId} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'page_hero_about'    && <PageHeroForm pageKey="about"    content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'why_us_content'     && <WhyUsForm content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'vision_mission'     && <VisionMissionForm content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'cta_about'          && <SingleCTAPanel fieldKey="cta_about" pageLabel="About Page" content={content} gymId={gymId} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'page_hero_pricing'  && <PageHeroForm pageKey="pricing"  content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'pricing'            && <PricingPanel plans={plans} gymId={gymId} onUpdate={setPlans} content={content} onSaveCms={handleContentSave} planName={planName} setPreviewData={setPreviewData} />}
          {activeSection === 'faq'                && <FAQPanel content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'cta_pricing'        && <SingleCTAPanel fieldKey="cta_pricing" pageLabel="Pricing Page" content={content} gymId={gymId} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'page_hero_trainers' && <PageHeroForm pageKey="trainers" content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'trainers'           && <TrainersForm trainers={trainersList} gymId={gymId} planName={planName} onUpdate={setTrainersList} content={content} setPreviewData={setPreviewData} />}
          {activeSection === 'cta_trainers'       && <SingleCTAPanel fieldKey="cta_trainers" pageLabel="Trainers Page" content={content} gymId={gymId} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'page_hero_contact'  && <PageHeroForm pageKey="contact"  content={content} gymId={gymId} planName={planName} onSave={handleContentSave} setPreviewData={setPreviewData} />}
          {activeSection === 'contact'            && <ContactPanel gym={gym} gymId={gymId} onSave={setGym} />}
          {activeSection === 'cta_contact'        && <SingleCTAPanel fieldKey="cta_contact" pageLabel="Contact Page" content={content} gymId={gymId} onSave={handleContentSave} setPreviewData={setPreviewData} />}
        </div>

        {/* Live preview panel — Pro+ only */}
        {showPreview && (
          <div className="flex-1 min-w-0">
            <PreviewPanel
              section={activeSection}
              previewData={previewData}
              gym={previewGym}
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
