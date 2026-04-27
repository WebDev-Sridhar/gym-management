import { useState } from 'react'
import {
  createCmsTrainer, updateCmsTrainer, deleteCmsTrainer, upsertCmsContent,
} from '../../../../services/gymCmsService'
import { deleteFile } from '../../../../services/storageService'
import { useCMSImage } from '../../../../hooks/useCMSImage'
import ImageUploader from '../components/ImageUploader'
import FeatureGate from '../components/FeatureGate'
import { useDialog } from '../../../../components/ui/Dialog'

const inputCls =
  'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

function ItemRow({ title, subtitle, onEdit, onDelete, deleting }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
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

// ─── Inline form extracted as sub-component ────────────────────────────────
// This ensures useCMSImage lifecycle (draft cleanup) ties to the form's mount/unmount.
function TrainerInlineForm({ mode, data, gymId, planName, imageCount, onSave, onCancel }) {
  const dialog = useDialog()
  const [name,           setName]           = useState(data.name)
  const [specialization, setSpecialization] = useState(data.specialization)
  const [bio,            setBio]            = useState(data.bio)
  const [saving,         setSaving]         = useState(false)

  const img = useCMSImage({
    gymId,
    fieldKey: `trainer_img_${data.id || 'new'}`,
    section: 'trainers',
    initialUrl: data.image_url || '',
  })

  async function handleCancel() {
    await img.discard()   // deletes temp file if not yet committed — no orphan
    onCancel()
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const finalImageUrl = await img.commit()
      await onSave({
        name: name.trim(),
        specialization: specialization.trim() || null,
        image_url: finalImageUrl || null,
        bio: bio.trim() || null,
      })
    } catch (err) { dialog.alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="mt-3 p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {mode === 'add' ? 'New Trainer' : 'Edit Trainer'}
      </p>

      <Field label="Full Name">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Ravi Kumar" className={inputCls} />
      </Field>

      <Field label="Specialization" hint="e.g. Strength & Conditioning, Yoga, Boxing">
        <input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)}
          placeholder="Strength & Conditioning" className={inputCls} />
      </Field>

      <ImageUploader
        gymId={gymId}
        section="trainers"
        currentUrl={img.url}
        onChange={img.handleUrl}
        onFileSelected={img.handleFile}
        isPending={img.isPending}
        planName={planName}
        usageCount={imageCount}
        label="Trainer Photo"
        hint="Square or portrait photo works best."
      />
      {img.error && <p className="text-xs text-red-500">{img.error}</p>}

      <Field label="Bio" hint="Short bio — 1–2 sentences.">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
          placeholder="Ravi has 10 years of experience in strength training…" className={inputCls + ' resize-none'} />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving || img.uploading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
          {(saving || img.uploading) && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
          {saving ? 'Saving…' : img.uploading ? 'Uploading…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Main TrainersForm ─────────────────────────────────────────────────────
const EMPTY_TRAINER = { name: '', specialization: '', image_url: '', bio: '' }

export default function TrainersForm({ trainers: initTrainers, gymId, planName, onUpdate, content, setPreviewData }) {
  const dialog = useDialog()
  const [sectionLabel,    setSectionLabel]    = useState(content?.trainers_section_label    || '')
  const [sectionHeading,  setSectionHeading]  = useState(content?.trainers_section_heading  || '')
  const [sectionSubtitle, setSectionSubtitle] = useState(content?.trainers_section_subtitle || '')
  const [trainers, setTrainers] = useState(initTrainers)
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [headerSaving,  setHeaderSaving]  = useState(false)
  const [headerSuccess, setHeaderSuccess] = useState('')

  function updateLabel(val)    { setSectionLabel(val);    setPreviewData?.(p => ({ ...p, trainers_section_label:    val || undefined })) }
  function updateHeading(val)  { setSectionHeading(val);  setPreviewData?.(p => ({ ...p, trainers_section_heading:  val || undefined })) }
  function updateSubtitle(val) { setSectionSubtitle(val); setPreviewData?.(p => ({ ...p, trainers_section_subtitle: val || undefined })) }

  async function saveHeader() {
    setHeaderSaving(true); setHeaderSuccess('')
    try {
      await upsertCmsContent(gymId, {
        trainers_section_label:    sectionLabel.trim()    || null,
        trainers_section_heading:  sectionHeading.trim()  || null,
        trainers_section_subtitle: sectionSubtitle.trim() || null,
      })
      setHeaderSuccess('Saved!')
      setTimeout(() => setHeaderSuccess(''), 3000)
    } catch (err) { dialog.alert(err.message) } finally { setHeaderSaving(false) }
  }

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_TRAINER } }) }
  function openEdit(t) {
    setForm({ mode: 'edit', data: { id: t.id, name: t.name || '', specialization: t.specialization || '', image_url: t.image_url || '', bio: t.bio || '' } })
  }

  async function handleInlineSave(payload) {
    let updated
    if (form.mode === 'add') {
      const created = await createCmsTrainer(gymId, { ...payload, sort_order: trainers.length })
      updated = [...trainers, created]
    } else {
      const saved = await updateCmsTrainer(form.data.id, payload)
      updated = trainers.map(t => t.id === saved.id ? saved : t)
    }
    setTrainers(updated); onUpdate(updated)
    setPreviewData?.(p => ({ ...p, _trainers: updated, _ts: Date.now() }))
    setForm(null)
  }

  async function handleDelete(id) {
    if (!await dialog.confirm('Delete this trainer?')) return
    setDeleting(id)
    try {
      const trainer = trainers.find(t => t.id === id)
      if (trainer?.image_url) await deleteFile(trainer.image_url)
      await deleteCmsTrainer(id)
      const updated = trainers.filter(t => t.id !== id)
      setTrainers(updated); onUpdate(updated)
      setPreviewData?.(p => ({ ...p, _trainers: updated, _ts: Date.now() }))
      if (form?.data?.id === id) setForm(null)
    } catch (err) { dialog.alert(err.message) } finally { setDeleting(null) }
  }

  const imageCount = trainers.filter(t => t.image_url).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Trainers</h3>
          <p className="text-sm text-gray-400 mt-0.5">Coach profiles shown on your public website.</p>
        </div>
        <button type="button" onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 cursor-pointer transition-colors shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Trainer
        </button>
      </div>

      {/* Section Header */}
      <FeatureGate feature="edit_headings" planName={planName}>
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section Header <span className="text-gray-400 font-normal normal-case">(shown on the home page trainers section)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" hint='Default: "Expert Coaches"'>
              <input type="text" value={sectionLabel} onChange={e => updateLabel(e.target.value)} placeholder="Expert Coaches" className={inputCls} />
            </Field>
            <Field label="Heading" hint='Default: "MEET THE COACHES"'>
              <input type="text" value={sectionHeading} onChange={e => updateHeading(e.target.value)} placeholder="MEET THE COACHES" className={inputCls} />
            </Field>
          </div>
          <Field label="Subtitle">
            <input type="text" value={sectionSubtitle} onChange={e => updateSubtitle(e.target.value)} placeholder="World-class experts. Real results. Built for you." className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveHeader} disabled={headerSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
              {headerSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
              {headerSaving ? 'Saving…' : 'Save Changes'}
            </button>
            {headerSuccess && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {headerSuccess}
              </span>
            )}
          </div>
        </div>
      </FeatureGate>

      {trainers.length === 0 && !form && (
        <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 mb-4">
          <p className="text-sm text-gray-400">No trainers yet. Add your first coach.</p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {trainers.map(t => (
          <ItemRow
            key={t.id}
            title={t.name}
            subtitle={t.specialization || 'No specialization set'}
            onEdit={() => openEdit(t)}
            onDelete={() => handleDelete(t.id)}
            deleting={deleting === t.id}
          />
        ))}
      </div>

      {/* Inline form — extracted as sub-component so useCMSImage unmounts on cancel */}
      {form && (
        <TrainerInlineForm
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
