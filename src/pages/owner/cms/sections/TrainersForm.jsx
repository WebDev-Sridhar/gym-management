import { useState } from 'react'
import {
  createCmsTrainer, updateCmsTrainer, deleteCmsTrainer,
} from '../../../../services/gymCmsService'
import ImageUploader from '../components/ImageUploader'

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

const EMPTY_TRAINER = { name: '', specialization: '', image_url: '', bio: '' }

/**
 * TrainersForm — CRUD for gym_trainers with ImageUploader per trainer.
 *
 * Props:
 *   trainers    array   — initial list from DB
 *   gymId       string
 *   planName    string  — for image limits
 *   onUpdate    fn      — called with updated trainers array
 */
export default function TrainersForm({ trainers: initTrainers, gymId, planName, onUpdate }) {
  const [trainers, setTrainers] = useState(initTrainers)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function openAdd() { setForm({ mode: 'add', data: { ...EMPTY_TRAINER } }) }
  function openEdit(t) {
    setForm({ mode: 'edit', data: { id: t.id, name: t.name || '', specialization: t.specialization || '', image_url: t.image_url || '', bio: t.bio || '' } })
  }
  function closeForm() { setForm(null) }
  function patch(key, val) { setForm(f => ({ ...f, data: { ...f.data, [key]: val } })) }

  async function handleSave() {
    if (!form.data.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.data.name.trim(),
        specialization: form.data.specialization.trim() || null,
        image_url: form.data.image_url.trim() || null,
        bio: form.data.bio.trim() || null,
      }
      let updated
      if (form.mode === 'add') {
        const created = await createCmsTrainer(gymId, { ...payload, sort_order: trainers.length })
        updated = [...trainers, created]
      } else {
        const saved = await updateCmsTrainer(form.data.id, payload)
        updated = trainers.map(t => t.id === saved.id ? saved : t)
      }
      setTrainers(updated); onUpdate(updated); setForm(null)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this trainer?')) return
    setDeleting(id)
    try {
      await deleteCmsTrainer(id)
      const updated = trainers.filter(t => t.id !== id)
      setTrainers(updated); onUpdate(updated)
      if (form?.data?.id === id) setForm(null)
    } catch (err) { alert(err.message) } finally { setDeleting(null) }
  }

  // Count trainers with images for limit display
  const imageCount = trainers.filter(t => t.image_url).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-gray-100">
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

      {/* Inline form */}
      {form && (
        <div className="mt-3 p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {form.mode === 'add' ? 'New Trainer' : 'Edit Trainer'}
          </p>

          <Field label="Full Name">
            <input type="text" value={form.data.name} onChange={e => patch('name', e.target.value)}
              placeholder="e.g. Ravi Kumar" className={inputCls} />
          </Field>

          <Field label="Specialization" hint="e.g. Strength & Conditioning, Yoga, Boxing">
            <input type="text" value={form.data.specialization} onChange={e => patch('specialization', e.target.value)}
              placeholder="Strength & Conditioning" className={inputCls} />
          </Field>

          <ImageUploader
            gymId={gymId}
            section="trainers"
            currentUrl={form.data.image_url}
            onChange={url => patch('image_url', url)}
            planName={planName}
            usageCount={imageCount}
            label="Trainer Photo"
            hint="Square or portrait photo works best."
          />

          <Field label="Bio" hint="Short bio — 1–2 sentences.">
            <textarea value={form.data.bio} onChange={e => patch('bio', e.target.value)} rows={3}
              placeholder="Ravi has 10 years of experience in strength training…" className={inputCls + ' resize-none'} />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-60">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
