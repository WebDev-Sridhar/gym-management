import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

const PRESET_COLORS = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9',
  '#10B981', '#F59E0B', '#EF4444', '#EC4899',
]

function ThemePanel({ gym, gymId, onSave }) {
  const dialog = useDialog()
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
      setSuccess('Saved!'); setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PanelHeader title="Theme Settings" desc="Brand identity shown across your public gym website." />
      <form onSubmit={handleSave} className="space-y-5">
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
          <div className="flex flex-col sm:flex-row gap-3 mt-1">
            {[
              { value: 'dark',  label: 'Dark',  Icon: Moon, desc: 'Dark background, light text' },
              { value: 'light', label: 'Light', Icon: Sun,  desc: 'Light background, dark text' },
            ].map(m => (
              <button key={m.value} type="button" onClick={() => setThemeMode(m.value)}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left ${themeMode === m.value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
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
              <button key={c} type="button" onClick={() => setThemeColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
                style={{ backgroundColor: c, borderColor: themeColor === c ? c : 'transparent', boxShadow: themeColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
            ))}
            <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden" />
            <span className="text-xs text-gray-400 font-mono">{themeColor}</span>
          </div>
        </Field>
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
    </div>
  )
}
import { useAuth } from '../../store/AuthContext'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import {
  fetchCmsContent, upsertCmsContent,
  fetchCmsPlans, createCmsPlan, updateCmsPlan, deleteCmsPlan, fetchBillablePlans,
  fetchCmsTrainers, createCmsTrainer, updateCmsTrainer, deleteCmsTrainer,
  fetchCmsTestimonials, createCmsTestimonial, updateCmsTestimonial, deleteCmsTestimonial,
} from '../../services/gymCmsService'
import ImageUploader from './cms/components/ImageUploader'
import { SocialIcon, SOCIAL_PLATFORMS } from '../../lib/socialPlatforms.jsx'
import LocationPicker from '../../components/LocationPicker'
import HeroForm from './cms/sections/HeroForm'
import { useCMSImage, useCMSImageList } from '../../hooks/useCMSImage'
import { deleteFile } from '../../services/storageService'
import { sweepStaleDraftEntries } from '../../lib/cmsDraft'
import { useDialog } from '../../components/ui/Dialog'
import CustomSelect from '../../components/ui/CustomSelect'
import FormModal from '../../components/ui/FormModal'

// ─── Shared UI primitives ───────────────────────────────────────────────────────

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

function SaveBtn({ saving, label = 'Save Changes', onClick, type = 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60"
    >
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

function PanelHeader({ title, desc, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-gray-100">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {desc && <p className="text-sm text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function AddBtn({ onClick, label = 'Add' }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 cursor-pointer transition-colors shrink-0">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  )
}

function ItemRow({ title, subtitle, onEdit, onDelete, deleting, badge }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          {badge && <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-bold">{badge}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onEdit}
          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer">
          Edit
        </button>
        <button type="button" onClick={onDelete} disabled={deleting}
          className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function InlineForm({ title, onCancel, onSave, saving, children }) {
  return (
    <FormModal title={title} onClose={onCancel}>
      {children}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Cancel
        </button>
        <button type="button" onClick={onSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
          {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </FormModal>
  )
}

function EmptyState({ label }) {
  return (
    <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

// ─── Section panels ─────────────────────────────────────────────────────────────

const STAT_PLACEHOLDERS = [
  { value: '500+', label: 'Members' },
  { value: '15+',  label: 'Trainers' },
  { value: '50+',  label: 'Classes/Week' },
  { value: '10+',  label: 'Years Running' },
]

const FEATURE_PLACEHOLDERS = [
  'World-Class Equipment',
  'Expert Coaching',
  'Proven Programs',
  'Real Community',
]

function AboutPanel({ content, gymId, onSave, planName }) {
  const dialog = useDialog()
  const [aboutText, setAboutText] = useState(content?.about_text || '')
  const [aboutImage, setAboutImage] = useState(content?.about_image || '')
  const [aboutImages, setAboutImages] = useState(content?.about_images || [])
  const [pointTitles, setPointTitles] = useState(() =>
    Array.from({ length: 4 }, (_, i) => content?.home_features?.[i] || '')
  )
  const [stats, setStats] = useState(() =>
    content?.stats?.length >= 4
      ? content.stats.slice(0, 4).map(s => ({ value: s.value || '', label: s.label || '' }))
      : [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function patchPointTitle(i, val) {
    setPointTitles(prev => prev.map((t, idx) => idx === i ? val : t))
  }
  function patchStat(i, key, val) {
    setStats(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s))
  }

  async function save() {
    setSaving(true); setSuccess('')
    try {
      const hasPoints = pointTitles.some(t => t.trim())
      const hasStats = stats.some(s => s.value.trim() || s.label.trim())
      const updated = await upsertCmsContent(gymId, {
        about_text:    aboutText.trim() || null,
        about_image:   aboutImage.trim() || null,
        about_images:  aboutImages.length ? aboutImages : null,
        home_features: hasPoints ? pointTitles.map(t => t.trim()) : null,
        stats:         hasStats ? stats.map(s => ({ value: s.value.trim(), label: s.label.trim() })) : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!'); setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-1">
      <PanelHeader title="About Section" desc="Story, stats & values shown on your site." />

      <Field label="About Description" hint="2–3 sentences about your gym, culture, and mission.">
        <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={4}
          placeholder="We are more than a gym. We are a community built on sweat, discipline, and results."
          className={inputCls + ' resize-none'} />
      </Field>

      <div className="pt-6 mt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-800 mb-0.5">Feature Points</p>
        <p className="text-xs text-gray-400 mb-4">4 bullet points shown below the description on the home page.</p>
        <div className="space-y-2">
          {pointTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white bg-violet-600">{i + 1}</span>
              <input type="text" value={title} onChange={e => patchPointTitle(i, e.target.value)}
                placeholder={FEATURE_PLACEHOLDERS[i]} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-800 mb-0.5">About Image</p>
        <p className="text-xs text-gray-400 mb-4">Upload multiple images and select one as the active photo.</p>
        <ImageUploader gymId={gymId} section="about" currentUrl={aboutImage} onChange={url => setAboutImage(url)}
          imageList={aboutImages} onListChange={setAboutImages} planName={planName}
          label="About Section Images" hint="Upload multiple images and select one as the active photo." />
      </div>

      <div className="pt-6 mt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-800 mb-0.5">Stats</p>
        <p className="text-xs text-gray-400 mb-4">4 numbers shown in the stats strip. Leave empty to use defaults.</p>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-2 gap-3">
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

      <div className="flex items-center gap-3 pt-4">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
          {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <SuccessMsg msg={success} />
      </div>
    </div>
  )
}

const PROG_CATEGORIES = ['STRENGTH', 'HIIT', 'YOGA', 'CARDIO', 'BOXING', 'CROSSFIT']
const EMPTY_PROG = { title: '', category: '', description: '', image: '' }

function StarterProgramInlineForm({ mode, data, gymId, planName, imageCount, onSave, onCancel }) {
  const dialog = useDialog()
  const [title,       setTitle]       = useState(data.title)
  const [category,    setCategory]    = useState(data.category)
  const [description, setDescription] = useState(data.description)
  const [saving,      setSaving]      = useState(false)

  const img = useCMSImage({
    gymId,
    fieldKey: `prog_img_${data.idx ?? 'new'}`,
    section: 'programs',
    initialUrl: data.image || '',
  })

  async function handleCancel() { await img.discard(); onCancel() }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const finalImage = await img.commit()
      await onSave({ title: title.trim(), category, description: description.trim() || null, image: finalImage || null })
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label="Title" required><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Strength Training" className={inputCls} /></Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2 mt-1">
          {PROG_CATEGORIES.map(c => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${category === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description of this program…" className={inputCls + ' resize-none'} /></Field>
      <ImageUploader gymId={gymId} section="programs" currentUrl={img.url} onChange={img.handleUrl} onFileSelected={img.handleFile} isPending={img.isPending} planName={planName} usageCount={imageCount} label="Program Image" hint="Landscape image works best." />
      {img.error && <p className="text-xs text-red-500">{img.error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
        <SaveBtn saving={saving || img.uploading} onClick={handleSave} label={img.uploading ? 'Uploading…' : 'Save'} />
      </div>
    </div>
  )
}

function ProgramsPanel({ content, gymId, onSave, planName }) {
  const dialog = useDialog()
  const [items, setItems] = useState(content?.training_programs || [])
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { training_programs: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated })); setItems(newItems)
  }

  async function handleInlineSave(payload) {
    const newItems = form.mode === 'add' ? [...items, payload] : items.map((it, i) => i === form.data.idx ? payload : it)
    await persist(newItems); setForm(null)
  }

  return (
    <div className="space-y-5">
      <PanelHeader title="Training Programs" desc="Cards shown on the home page programs section."
        action={<AddBtn onClick={() => setForm({ mode: 'add', data: { ...EMPTY_PROG } })} label="Add Program" />} />
      {items.length === 0 && !form && <EmptyState label="No programs yet. Add your first training card." />}
      <div className="space-y-2">
        {items.map((it, i) => (
          <ItemRow key={i} title={it.title} subtitle={it.category || 'No category'}
            onEdit={() => setForm({ mode: 'edit', data: { idx: i, title: it.title, category: it.category || '', description: it.description || '', image: it.image || '' } })}
            onDelete={async () => { if (!await dialog.confirm('Delete this program?')) return; setDeleting(i); try { if (it.image) await deleteFile(it.image); await persist(items.filter((_, j) => j !== i)) } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) } }}
            deleting={deleting === i} />
        ))}
      </div>
      {form && (
        <FormModal title={form.mode === 'add' ? 'New Program' : 'Edit Program'} onClose={() => setForm(null)}>
          <StarterProgramInlineForm
            key={form.mode === 'add' ? 'new' : form.data.idx}
            mode={form.mode}
            data={form.data}
            gymId={gymId}
            planName={planName}
            imageCount={items.filter(it => it.image).length}
            onSave={handleInlineSave}
            onCancel={() => setForm(null)}
          />
        </FormModal>
      )}
    </div>
  )
}

function ReviewsPanel({ testimonials: init, gymId, onUpdate, planName }) {
  const dialog = useDialog()
  const [items, setItems] = useState(init)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.name.trim() || !form.data.message.trim()) return
    setSaving(true)
    try {
      const payload = { member_name: form.data.name.trim(), message: form.data.message.trim(), rating: form.data.rating, image_url: form.data.image_url.trim() || null }
      let updated
      if (form.mode === 'add') { const created = await createCmsTestimonial(gymId, payload); updated = [...items, created] }
      else { const saved = await updateCmsTestimonial(form.data.id, payload); updated = items.map(t => t.id === saved.id ? saved : t) }
      setItems(updated); onUpdate(updated); setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this review?')) return
    setDeleting(id)
    try { await deleteCmsTestimonial(id); const updated = items.filter(t => t.id !== id); setItems(updated); onUpdate(updated) }
    catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      <PanelHeader title="Member Reviews" desc="Testimonials shown on your home page."
        action={<AddBtn onClick={() => setForm({ mode: 'add', data: { name: '', message: '', rating: 5, image_url: '' } })} label="Add Review" />} />
      {items.length === 0 && !form && <EmptyState label="No reviews yet. Add your first member testimonial." />}
      <div className="space-y-2">
        {items.map(t => (
          <ItemRow key={t.id} title={t.member_name} subtitle={`${'★'.repeat(t.rating || 5)} · ${t.message?.slice(0, 60)}…`}
            onEdit={() => setForm({ mode: 'edit', data: { id: t.id, name: t.member_name || '', message: t.message || '', rating: t.rating || 5, image_url: t.image_url || '' } })}
            onDelete={() => handleDelete(t.id)} deleting={deleting === t.id} />
        ))}
      </div>
      {form && (
        <InlineForm title={form.mode === 'add' ? 'New Review' : 'Edit Review'} onCancel={() => setForm(null)} onSave={handleSave} saving={saving}>
          <Field label="Member Name" required><input type="text" value={form.data.name} onChange={e => patch('name', e.target.value)} placeholder="Priya Sharma" className={inputCls} /></Field>
          <Field label="Rating">
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => patch('rating', s)} className="text-2xl leading-none cursor-pointer hover:scale-110 transition-transform" style={{ color: s <= form.data.rating ? '#F59E0B' : '#D1D5DB' }}>★</button>
              ))}
            </div>
          </Field>
          <Field label="Review Text" required><textarea value={form.data.message} onChange={e => patch('message', e.target.value)} rows={4} placeholder="This gym completely changed my fitness journey…" className={inputCls + ' resize-none'} /></Field>
          <ImageUploader gymId={gymId} section="trainers" currentUrl={form.data.image_url} onChange={url => patch('image_url', url)} planName={planName} usageCount={items.filter(t => t.image_url).length} label="Member Photo (optional)" hint="Square photo works best." />
        </InlineForm>
      )}
    </div>
  )
}

const WHY_US_PLACEHOLDERS = [
  { title: 'Expert Coaching',       description: 'Certified trainers who build programs around your goals.' },
  { title: 'Proven Programs',       description: 'Science-backed workouts that deliver measurable results.' },
  { title: 'Premium Equipment',     description: 'State-of-the-art machines and free weights, always maintained.' },
  { title: 'Real Community',        description: 'A supportive environment where members push each other to succeed.' },
]

function WhyUsPanel({ content, gymId, onSave }) {
  const dialog = useDialog()
  const [items, setItems] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      title:       content?.why_us?.[i]?.title       || '',
      description: content?.why_us?.[i]?.description || '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function patchItem(i, key, val) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const valid = items.filter(it => it.title.trim() || it.description.trim())
      const updated = await upsertCmsContent(gymId, {
        why_us: valid.length ? items.map(w => ({ title: w.title.trim(), description: w.description.trim() })) : null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!'); setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <PanelHeader title="Why Choose Us" desc="4 feature cards shown on the About page. Leave empty to use defaults." />
      <div className="space-y-3">
        <div className="h-px bg-gray-100" />
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
      <div className="flex items-center gap-3">
        <SaveBtn saving={saving} />
        <SuccessMsg msg={success} />
      </div>
    </form>
  )
}

function VisionPanel({ content, gymId, onSave }) {
  const dialog = useDialog()
  const [vision, setVision] = useState(content?.vision_text || '')
  const [mission, setMission] = useState(content?.mission_text || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSuccess('')
    try {
      const updated = await upsertCmsContent(gymId, {
        vision_text: vision.trim() || null,
        mission_text: mission.trim() || null,
      })
      onSave(prev => ({ ...prev, ...updated }))
      setSuccess('Saved!'); setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PanelHeader title="Vision & Mission" desc="Purpose statements shown on the About page." />
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Vision" hint="Where you're headed — the big-picture future you're building toward.">
          <textarea value={vision} onChange={e => setVision(e.target.value)} rows={4}
            placeholder="To become the most impactful fitness community in the city…"
            className={inputCls + ' resize-none'} />
        </Field>
        <Field label="Mission" hint="How you get there — your daily commitment and approach.">
          <textarea value={mission} onChange={e => setMission(e.target.value)} rows={4}
            placeholder="To empower every member with world-class coaching, community, and facilities…"
            className={inputCls + ' resize-none'} />
        </Field>
        <div className="flex items-center gap-3">
          <SaveBtn saving={saving} />
          <SuccessMsg msg={success} />
        </div>
      </form>
    </div>
  )
}

const EMPTY_PLAN = { plan_id: '', features_text: '', is_popular: false }

function formatDurationDays(days) {
  if (!days) return ''
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  const months = Math.round(days / 30)
  if (months === 1) return '1 month'
  if (months === 12) return '1 year'
  return `${months} months`
}

function PlansPanel({ plans: initPlans, content, gymId, onUpdate, onSaveCms }) {
  const dialog = useDialog()
  const [plans, setPlans] = useState(initPlans)
  const [includedText, setIncludedText] = useState(content?.included_features?.length ? content.included_features.join('\n') : '')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [featSaving, setFeatSaving] = useState(false)
  const [featSuccess, setFeatSuccess] = useState('')
  const [billablePlans, setBillablePlans] = useState([])

  useEffect(() => {
    if (!gymId) return
    fetchBillablePlans(gymId).then(setBillablePlans).catch(() => setBillablePlans([]))
  }, [gymId])

  const linkedPlanIds = new Set(plans.map(p => p.plan_id).filter(Boolean))

  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.plan_id) {
      dialog.alert('Please select a gym plan to link.')
      return
    }
    setSaving(true)
    try {
      const linked = billablePlans.find(p => p.id === form.data.plan_id)
      const payload = {
        plan_id: form.data.plan_id,
        name: linked?.name ?? '',
        price: Number(linked?.price ?? 0),
        duration_label: formatDurationDays(linked?.duration_days),
        features: form.data.features_text.split('\n').map(f => f.trim()).filter(Boolean),
        is_popular: form.data.is_popular,
      }
      let updated
      if (form.mode === 'add') {
        const created = await createCmsPlan(gymId, { ...payload, sort_order: plans.length })
        created.plan = linked
        updated = [...plans, created]
      } else {
        const saved = await updateCmsPlan(form.data.id, payload)
        saved.plan = linked
        updated = plans.map(p => p.id === saved.id ? saved : p)
      }
      setPlans(updated); onUpdate(updated); setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this plan?')) return
    setDeleting(id)
    try { await deleteCmsPlan(id); const updated = plans.filter(p => p.id !== id); setPlans(updated); onUpdate(updated); if (form?.data?.id === id) setForm(null) }
    catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  async function saveIncluded(e) {
    e.preventDefault()
    setFeatSaving(true); setFeatSuccess('')
    try {
      const features = includedText.split('\n').map(f => f.trim()).filter(Boolean)
      const updated = await upsertCmsContent(gymId, { included_features: features.length ? features : null })
      onSaveCms(prev => ({ ...prev, ...updated }))
      setFeatSuccess('Saved!'); setTimeout(() => setFeatSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setFeatSaving(false) }
  }

  return (
    <div className="space-y-5">
      <PanelHeader title="Membership Plans" desc="Plans shown on your Pricing page."
        action={<AddBtn onClick={() => setForm({ mode: 'add', data: { ...EMPTY_PLAN } })} label="Add Plan" />} />

      {plans.length === 0 && !form && <EmptyState label="No plans yet. Add your first pricing plan." />}

      {billablePlans.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          You don't have any billable plans yet. <a href="/owner-dashboard/plans" className="font-semibold underline">Create one first</a> — these are what members actually pay for.
        </div>
      )}

      <div className="space-y-2">
        {plans.map(p => {
          const linked = p.plan
          const unlinked = !linked
          const subtitle = unlinked
            ? '⚠ Not linked to a billable plan — checkout disabled'
            : `${linked.name} · ₹${Number(linked.price).toLocaleString('en-IN')} · ${formatDurationDays(linked.duration_days)} · ${(p.features || []).length} feature${(p.features || []).length !== 1 ? 's' : ''}`
          return (
            <ItemRow
              key={p.id}
              title={linked?.name || p.name || '(unlinked)'}
              subtitle={subtitle}
              badge={p.is_popular ? 'Popular' : null}
              onEdit={() => setForm({
                mode: 'edit',
                data: {
                  id: p.id,
                  plan_id: p.plan_id || '',
                  features_text: (p.features || []).join('\n'),
                  is_popular: p.is_popular || false,
                },
              })}
              onDelete={() => handleDelete(p.id)}
              deleting={deleting === p.id}
            />
          )
        })}
      </div>

      {form && (() => {
        const selectedPlan = billablePlans.find(p => p.id === form.data.plan_id)
        const stillLinkedButMissing = form.mode === 'edit' && form.data.plan_id && !selectedPlan
        return (
          <InlineForm title={form.mode === 'add' ? 'New Plan' : 'Edit Plan'} onCancel={() => setForm(null)} onSave={handleSave} saving={saving}>
            <Field label="Linked Gym Plan" required hint="This plan will be automatically assigned after successful payment.">
              <CustomSelect
                value={form.data.plan_id}
                onChange={v => patch('plan_id', v)}
                placeholder="— Select a plan —"
                options={[
                  ...billablePlans.map(bp => {
                    const isLinkedElsewhere = linkedPlanIds.has(bp.id) && bp.id !== form.data.plan_id
                    return {
                      value: bp.id,
                      label: `${bp.name} — ₹${Number(bp.price).toLocaleString('en-IN')} / ${formatDurationDays(bp.duration_days)}`,
                      disabled: isLinkedElsewhere,
                      hint: isLinkedElsewhere ? 'already linked' : undefined,
                    }
                  }),
                  ...(stillLinkedButMissing ? [{ value: form.data.plan_id, label: '⚠ Linked plan no longer exists' }] : []),
                ]}
              />
            </Field>

            {selectedPlan && (
              <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 text-xs text-violet-900">
                <div className="font-semibold">{selectedPlan.name}</div>
                <div className="mt-0.5 text-violet-700">
                  ₹{Number(selectedPlan.price).toLocaleString('en-IN')} · {formatDurationDays(selectedPlan.duration_days)}
                </div>
              </div>
            )}

            <Field label="Features" hint="One per line. Shown on the public pricing card.">
              <textarea
                value={form.data.features_text}
                onChange={e => patch('features_text', e.target.value)}
                rows={4}
                placeholder={'Gym floor access\nLocker room\nFree parking'}
                className={inputCls + ' resize-none'}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.data.is_popular}
                onChange={e => patch('is_popular', e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              <span className="text-gray-700 font-medium">Mark as popular plan</span>
            </label>
          </InlineForm>
        )
      })()}

      <form onSubmit={saveIncluded} className="space-y-4 pt-4 border-t border-gray-100">
        <div className="pt-2 mt-2">
          <p className="text-sm font-semibold text-gray-800 mb-0.5">Included In All Plans</p>
          <p className="text-xs text-gray-400 mb-4">Section header and bullet points shown below pricing cards. One item per line.</p>
        </div>
        <textarea value={includedText} onChange={e => setIncludedText(e.target.value)} rows={6}
          placeholder={'24/7 gym floor access\nFree fitness assessment\nLocker & shower facilities\nFree parking\nMember mobile app\nNo joining fee ever'}
          className={inputCls + ' resize-none'} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={featSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
            {featSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
            {featSaving ? 'Saving…' : 'Save Features'}
          </button>
          <SuccessMsg msg={featSuccess} />
        </div>
      </form>
    </div>
  )
}

const EMPTY_FAQ = { q: '', a: '' }

function FAQPanel({ content, gymId, onSave }) {
  const dialog = useDialog()
  const [items, setItems] = useState(content?.faq_items || [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function persist(newItems) {
    const updated = await upsertCmsContent(gymId, { faq_items: newItems.length ? newItems : null })
    onSave(prev => ({ ...prev, ...updated })); setItems(newItems)
  }

  function patch(key, val) {
    setForm(f => {
      const newData = { ...f.data, [key]: val }
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

  const DEFAULT_FAQS = [
    { q: 'Can I cancel my membership anytime?', a: 'Yes. Monthly plans can be cancelled at any time with no hidden fees or penalties.' },
    { q: 'Is there a joining or registration fee?', a: 'No joining fee ever. Pay only for your chosen plan and start training immediately.' },
    { q: 'Do you offer a free trial?', a: 'Yes! We offer a 1-day free trial pass for new members. Visit us at the front desk to get started.' },
    { q: 'What are the gym timings?', a: 'We are open Monday–Saturday 5:30 AM – 10:30 PM and Sunday 6:00 AM – 8:00 PM.' },
    { q: 'Do you have personal trainers?', a: 'Yes. All our certified trainers are available for personal sessions. Contact us to book a session.' },
  ]

  return (
    <div className="space-y-5">
      <PanelHeader title="FAQ" desc="Accordion questions shown on the Pricing page."
        action={
          <div className="flex items-center gap-2">
            {items.length === 0 && (
              <button type="button" onClick={async () => { if (!await dialog.confirm('Load default FAQ items?')) return; await persist(DEFAULT_FAQS) }}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                Load Defaults
              </button>
            )}
            <AddBtn onClick={() => setForm({ mode: 'add', data: { ...EMPTY_FAQ } })} label="Add Question" />
          </div>
        } />

      {items.length === 0 && !form && <EmptyState label="No FAQ items yet. Add questions or load defaults." />}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i}>
            <ItemRow title={item.q} subtitle={item.a?.slice(0, 70) + (item.a?.length > 70 ? '…' : '')}
              onEdit={() => setForm({ mode: 'edit', data: { idx: i, q: item.q, a: item.a } })}
              onDelete={async () => { if (!await dialog.confirm('Delete this question?')) return; setDeleting(i); try { await persist(items.filter((_, j) => j !== i)); if (form?.data?.idx === i) setForm(null) } finally { setDeleting(null) } }}
              deleting={deleting === i} />
            {form?.mode === 'edit' && form.data.idx === i && (
              <div className="mt-1">
                <InlineForm title="Edit Question" onCancel={() => setForm(null)} onSave={handleSave} saving={saving}>
                  <Field label="Question" required><input type="text" value={form.data.q} onChange={e => patch('q', e.target.value)} placeholder="Can I cancel anytime?" className={inputCls} /></Field>
                  <Field label="Answer" required><textarea value={form.data.a} onChange={e => patch('a', e.target.value)} rows={3} placeholder="Yes. Monthly plans can be cancelled at any time with no hidden fees." className={inputCls + ' resize-none'} /></Field>
                </InlineForm>
              </div>
            )}
          </div>
        ))}
      </div>
      {form?.mode === 'add' && (
        <InlineForm title="New Question" onCancel={() => setForm(null)} onSave={handleSave} saving={saving}>
          <Field label="Question" required><input type="text" value={form.data.q} onChange={e => patch('q', e.target.value)} placeholder="Can I cancel anytime?" className={inputCls} /></Field>
          <Field label="Answer" required><textarea value={form.data.a} onChange={e => patch('a', e.target.value)} rows={3} placeholder="Yes. Monthly plans can be cancelled at any time with no hidden fees." className={inputCls + ' resize-none'} /></Field>
        </InlineForm>
      )}
    </div>
  )
}

const EMPTY_TRAINER = { name: '', specialization: '', image_url: '', bio: '' }

// ─── Gallery Panel ──────────────────────────────────────────────────────────────
function GalleryPanel({ content, gymId, onSave }) {
  const dialog = useDialog()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const galleryImgs = useCMSImageList({
    gymId,
    fieldKey: 'gallery_images',
    section: 'gallery',
    initialList: content?.gallery_images || [],
  })

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
      <PanelHeader title="Gallery" desc="Photo grid shown on your home page. Leave empty to hide the section." />
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
        planName="Starter"
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

function StarterCoachInlineForm({ mode, data, gymId, planName, imageCount, onSave, onCancel }) {
  const dialog = useDialog()
  const [name,           setName]           = useState(data.name)
  const [specialization, setSpecialization] = useState(data.specialization)
  const [bio,            setBio]            = useState(data.bio)
  const [saving,         setSaving]         = useState(false)

  const img = useCMSImage({
    gymId,
    fieldKey: `coach_img_${data.id || 'new'}`,
    section: 'trainers',
    initialUrl: data.image_url || '',
  })

  async function handleCancel() { await img.discard(); onCancel() }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const finalImage = await img.commit()
      await onSave({ name: name.trim(), specialization: specialization.trim() || null, image_url: finalImage || null, bio: bio.trim() || null })
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label="Full Name" required><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" className={inputCls} /></Field>
      <Field label="Specialization" hint="e.g. Strength & Conditioning, Yoga, Boxing"><input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="Strength & Conditioning" className={inputCls} /></Field>
      <ImageUploader gymId={gymId} section="trainers" currentUrl={img.url} onChange={img.handleUrl} onFileSelected={img.handleFile} isPending={img.isPending} planName={planName} usageCount={imageCount} label="Coach Photo" hint="Square or portrait photo works best." />
      {img.error && <p className="text-xs text-red-500">{img.error}</p>}
      <Field label="Bio" hint="Short bio — 1–2 sentences."><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Ravi has 10 years of experience in strength training…" className={inputCls + ' resize-none'} /></Field>
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
        <SaveBtn saving={saving || img.uploading} onClick={handleSave} label={img.uploading ? 'Uploading…' : 'Save'} />
      </div>
    </div>
  )
}

function CoachesPanel({ trainers: initTrainers, gymId, onUpdate, planName }) {
  const dialog = useDialog()
  const [trainers, setTrainers] = useState(initTrainers)
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleInlineSave(payload) {
    let updated
    if (form.mode === 'add') { const created = await createCmsTrainer(gymId, { ...payload, sort_order: trainers.length }); updated = [...trainers, created] }
    else { const saved = await updateCmsTrainer(form.data.id, payload); updated = trainers.map(t => t.id === saved.id ? saved : t) }
    setTrainers(updated); onUpdate(updated); setForm(null)
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this coach?')) return
    setDeleting(id)
    try {
      const trainer = trainers.find(t => t.id === id)
      if (trainer?.image_url) await deleteFile(trainer.image_url)
      await deleteCmsTrainer(id)
      const updated = trainers.filter(t => t.id !== id)
      setTrainers(updated); onUpdate(updated)
      if (form?.data?.id === id) setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      <PanelHeader title="Coach Profiles" desc="Team bios shown on the Trainers page."
        action={<AddBtn onClick={() => setForm({ mode: 'add', data: { ...EMPTY_TRAINER } })} label="Add Coach" />} />
      {trainers.length === 0 && !form && <EmptyState label="No coaches yet. Add your first team member." />}
      <div className="space-y-2">
        {trainers.map(t => (
          <ItemRow key={t.id} title={t.name} subtitle={t.specialization || 'No specialization set'}
            onEdit={() => setForm({ mode: 'edit', data: { id: t.id, name: t.name || '', specialization: t.specialization || '', image_url: t.image_url || '', bio: t.bio || '' } })}
            onDelete={() => handleDelete(t.id)} deleting={deleting === t.id} />
        ))}
      </div>
      {form && (
        <FormModal title={form.mode === 'add' ? 'New Coach' : 'Edit Coach'} onClose={() => setForm(null)}>
          <StarterCoachInlineForm
            key={form.data.id || 'new'}
            mode={form.mode}
            data={form.data}
            gymId={gymId}
            planName={planName}
            imageCount={trainers.filter(t => t.image_url).length}
            onSave={handleInlineSave}
            onCancel={() => setForm(null)}
          />
        </FormModal>
      )}
    </div>
  )
}

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

  const usedPlatforms = socialLinks.map(l => l.platform)
  const availablePlatforms = SOCIAL_PLATFORMS.filter(p => !usedPlatforms.includes(p.id))

  function addTiming() {
    if (!newDay.trim() || !newTime.trim()) return
    setWorkingHours(p => [...p, { day: newDay.trim(), time: newTime.trim() }])
    setNewDay(''); setNewTime('')
  }

  function addLink() {
    if (!addPlatform || !addUrl.trim()) return
    setSocialLinks(prev => [...prev, { platform: addPlatform, url: addUrl.trim() }])
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
      setSuccess('Saved!'); setTimeout(() => setSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PanelHeader title="Contact Info" desc="Shown on the Contact page and in your site footer." />
        <form onSubmit={handleSave} className="space-y-4">

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
                <CustomSelect
                  value={addPlatform}
                  onChange={setAddPlatform}
                  placeholder="Platform…"
                  className="w-36"
                  options={availablePlatforms.map(p => ({ value: p.id, label: p.label }))}
                />
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

          <div className="flex items-center gap-3">
            <SaveBtn saving={saving} />
            <SuccessMsg msg={success} />
          </div>
        </form>
    </div>
  )
}

// ─── Sidebar sections ───────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'theme',    label: 'Theme',             desc: 'Colors & branding' },
  { id: 'hero',     label: 'Hero Banner',       desc: 'Full-page landing section' },
  { id: 'about',    label: 'About Section',    desc: 'Story, stats & values' },
  { id: 'programs', label: 'Programs',          desc: 'Training cards' },
  { id: 'reviews',  label: 'Reviews',           desc: 'Member feedback' },
  { id: 'why_us',   label: 'Why Choose Us',    desc: '4 feature cards' },
  { id: 'vision',   label: 'Vision & Mission', desc: 'Purpose statements' },
  { id: 'plans',    label: 'Plans',             desc: 'Membership plans' },
  { id: 'faq',      label: 'FAQ',              desc: 'Accordion questions' },
  { id: 'coaches',  label: 'Coach Profiles',   desc: 'Team & bios' },
  { id: 'gallery',  label: 'Gallery',          desc: 'Photo grid' },
  { id: 'contact',  label: 'Contact Info',     desc: 'Phone, email & address' },
]

// ─── Main component ─────────────────────────────────────────────────────────────

export default function StarterWebsitePage() {
  const { gymId } = useAuth()
  const [gym, setGym] = useState(null)
  const [content, setContent] = useState(null)
  const [plans, setPlans] = useState([])
  const [trainers, setTrainers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('theme')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const activeSectionDef = SECTIONS.find(s => s.id === activeSection)

  function selectSection(id) {
    setActiveSection(id)
    setMobileNavOpen(false)
  }

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    sweepStaleDraftEntries(gymId)
    Promise.all([
      fetchGymDetails(gymId).catch(() => null),
      fetchCmsContent(gymId).catch(() => null),
      fetchCmsPlans(gymId).catch(() => []),
      fetchCmsTrainers(gymId).catch(() => []),
      fetchCmsTestimonials(gymId).catch(() => []),
    ]).then(([g, c, p, t, te]) => {
      setGym(g); setContent(c); setPlans(p); setTrainers(t); setTestimonials(te)
    }).finally(() => setLoading(false))
  }, [gymId])

  function handleContentSave(updater) {
    setContent(updater)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Website Editor</h1>
          <p className="text-sm text-gray-400 mt-0.5">Edit your public website content</p>
        </div>
        {gym?.slug && (
          <a
            href={`/${gym.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Site
          </a>
        )}
      </div>

      {/* Pro upgrade banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-900">Upgrade to Pro for the full CMS</p>
          <p className="hidden sm:block text-xs text-violet-600 mt-0.5">Live preview, section heading editor, Design controls, page-level CTAs and more.</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-violet-600 text-white rounded-full shrink-0">Pro</span>
      </div>

      {/* Mobile section picker — sits above content, hidden on desktop */}
      <div className="lg:hidden">
        <button type="button" onClick={() => setMobileNavOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 cursor-pointer hover:border-gray-300 transition-colors">
          <span className="text-violet-600 font-semibold">{activeSectionDef?.label}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileNavOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 relative p-2">
            <ul className="space-y-0.5">
              {SECTIONS.map(sec => (
                <li key={sec.id}>
                  <button type="button" onClick={() => selectSection(sec.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer ${activeSection === sec.id ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
                    <span className={`block text-sm font-medium ${activeSection === sec.id ? 'text-violet-700' : ''}`}>{sec.label}</span>
                    <span className={`block text-xs mt-0.5 ${activeSection === sec.id ? 'text-violet-400' : 'text-gray-400'}`}>{sec.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Layout — sidebar (desktop) + content */}
      <div className="flex gap-5 items-start">

        {/* Sidebar — desktop only */}
        <nav className="cms-sidebar hidden lg:flex flex-col w-44 shrink-0 sticky top-6 overflow-y-auto overscroll-contain" style={{ height: 'calc(100vh - 8.5rem)' }}>
          <ul className="space-y-0.5">
            {SECTIONS.map(sec => (
              <li key={sec.id}>
                <button
                  type="button"
                  onClick={() => selectSection(sec.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeSection === sec.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <span className={`block text-sm font-medium ${activeSection === sec.id ? 'text-violet-700' : ''}`}>{sec.label}</span>
                  <span className={`block text-xs mt-0.5 ${activeSection === sec.id ? 'text-violet-400' : 'text-gray-400'}`}>{sec.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          {activeSection === 'theme' && (
            <ThemePanel gym={gym} gymId={gymId} onSave={setGym} />
          )}
          {activeSection === 'hero' && (
            <HeroForm content={content} gym={gym} gymId={gymId} planName="Starter" onSave={handleContentSave} onSaveGym={setGym} />
          )}
          {activeSection === 'about' && (
            <AboutPanel content={content} gymId={gymId} onSave={handleContentSave} planName="Starter" />
          )}
          {activeSection === 'programs' && (
            <ProgramsPanel content={content} gymId={gymId} onSave={handleContentSave} planName="Starter" />
          )}
          {activeSection === 'reviews' && (
            <ReviewsPanel testimonials={testimonials} gymId={gymId} onUpdate={setTestimonials} planName="Starter" />
          )}
          {activeSection === 'why_us' && (
            <WhyUsPanel content={content} gymId={gymId} onSave={handleContentSave} />
          )}
          {activeSection === 'vision' && (
            <VisionPanel content={content} gymId={gymId} onSave={handleContentSave} />
          )}
          {activeSection === 'plans' && (
            <PlansPanel plans={plans} content={content} gymId={gymId} onUpdate={setPlans} onSaveCms={handleContentSave} planName="Starter" />
          )}
          {activeSection === 'faq' && (
            <FAQPanel content={content} gymId={gymId} onSave={handleContentSave} />
          )}
          {activeSection === 'coaches' && (
            <CoachesPanel trainers={trainers} gymId={gymId} onUpdate={setTrainers} planName="Starter" />
          )}
          {activeSection === 'gallery' && (
            <GalleryPanel content={content} gymId={gymId} onSave={handleContentSave} />
          )}
          {activeSection === 'contact' && (
            <ContactPanel gym={gym} gymId={gymId} onSave={setGym} />
          )}
        </div>
      </div>
    </div>
  )
}
