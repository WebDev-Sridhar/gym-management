import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, ShieldCheck, Info } from 'lucide-react'
import { useDialog } from '../../../../components/ui/Dialog'
import { LEGAL_PAGES, getDefaultLegalContent } from '../../../../lib/content/gym-legal'
import { fetchLegalPages, upsertLegalPage, setLegalEnabled, resetLegalPage } from '../../../../services/gymLegalService'
import { Sk } from '../../../../components/ui/Skeleton'

let _seq = 0
const newId = () => `s${Date.now()}_${_seq++}`

const INPUT = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

function seedFromDefault(pageKey, gym) {
  const def = getDefaultLegalContent(pageKey, gym)
  return {
    title: def?.title || '',
    intro: def?.intro || '',
    sections: (def?.sections || []).map(s => ({ id: s.id || newId(), heading: s.heading || '', body: s.body || '' })),
  }
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/**
 * LegalPanel — owner CMS editor for the per-gym legal pages. Lets the owner
 * edit each page's title / intro / sections (seeded from the Gymmobius default
 * wording), reorder/add/remove sections, toggle each page on or off (with a
 * compliance warning for Privacy/Terms/Refund), and reset to default.
 */
export default function LegalPanel({ gymId, gym }) {
  const dialog = useDialog()
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({})   // page_key → { enabled, title, intro, sections, dirty, saving }
  const [openKey, setOpenKey] = useState(null)

  useEffect(() => {
    if (!gymId) return
    let cancelled = false
    setLoading(true)
    fetchLegalPages(gymId)
      .then(rows => {
        if (cancelled) return
        const byKey = {}
        for (const r of rows) byKey[r.page_key] = r
        const d = {}
        for (const p of LEGAL_PAGES) {
          const row = byKey[p.key]
          const hasCustom = row && Array.isArray(row.sections) && row.sections.length
          const seed = hasCustom
            ? { title: row.title || '', intro: row.intro || '', sections: row.sections.map(s => ({ id: s.id || newId(), heading: s.heading || '', body: s.body || '' })) }
            : seedFromDefault(p.key, gym)
          d[p.key] = { enabled: row ? row.enabled : true, ...seed, dirty: false, saving: false }
        }
        setDraft(d)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId, gym])

  const patch = (key, p) => setDraft(prev => ({ ...prev, [key]: { ...prev[key], ...p, dirty: true } }))

  function updateSection(key, idx, p) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], dirty: true, sections: prev[key].sections.map((s, i) => i === idx ? { ...s, ...p } : s) } }))
  }
  function addSection(key) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], dirty: true, sections: [...prev[key].sections, { id: newId(), heading: '', body: '' }] } }))
  }
  function removeSection(key, idx) {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], dirty: true, sections: prev[key].sections.filter((_, i) => i !== idx) } }))
  }
  function moveSection(key, idx, dir) {
    setDraft(prev => {
      const arr = [...prev[key].sections]
      const j = idx + dir
      if (j < 0 || j >= arr.length) return prev
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return { ...prev, [key]: { ...prev[key], dirty: true, sections: arr } }
    })
  }

  async function toggleEnabled(p) {
    const cur = draft[p.key]
    const next = !cur.enabled
    if (!next && p.core) {
      const ok = await dialog.confirm(`${p.label} is recommended for payment compliance — Razorpay / RBI norms expect a visible policy, and India's DPDP Act expects a privacy notice. Hide it from your website anyway?`)
      if (!ok) return
    }
    setDraft(prev => ({ ...prev, [p.key]: { ...prev[p.key], enabled: next } }))
    try {
      await setLegalEnabled(gymId, p.key, next)
    } catch (err) {
      dialog.alert(err.message || 'Failed to update')
      setDraft(prev => ({ ...prev, [p.key]: { ...prev[p.key], enabled: cur.enabled } }))
    }
  }

  async function save(p) {
    const cur = draft[p.key]
    if (!cur.title?.trim()) { dialog.alert('A page title is required.'); return }
    setDraft(prev => ({ ...prev, [p.key]: { ...prev[p.key], saving: true } }))
    try {
      const sections = cur.sections
        .filter(s => (s.heading || '').trim() || (s.body || '').trim())
        .map(s => ({ id: s.id, heading: (s.heading || '').trim(), body: (s.body || '').trim() }))
      await upsertLegalPage(gymId, p.key, {
        enabled: cur.enabled,
        title: cur.title.trim(),
        intro: (cur.intro || '').trim(),
        sections,
      })
      setDraft(prev => ({ ...prev, [p.key]: { ...prev[p.key], saving: false, dirty: false } }))
    } catch (err) {
      dialog.alert(err.message || 'Failed to save')
      setDraft(prev => ({ ...prev, [p.key]: { ...prev[p.key], saving: false } }))
    }
  }

  async function reset(p) {
    const ok = await dialog.confirm(`Reset ${p.label} to the default Gymmobius wording? Your custom edits for this page will be removed.`)
    if (!ok) return
    try {
      await resetLegalPage(gymId, p.key)
      setDraft(prev => ({ ...prev, [p.key]: { enabled: true, ...seedFromDefault(p.key, gym), dirty: false, saving: false } }))
    } catch (err) {
      dialog.alert(err.message || 'Failed to reset')
    }
  }

  if (loading) {
    return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Sk key={i} h={64} r={12} />)}</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Legal Pages</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          These appear in your website footer. Edit the wording to match your gym, reorder or add points, or switch a page off.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-indigo-100 p-3">
        <Info size={15} className="text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-900/80 leading-relaxed">
          The default wording is a general template, not legal advice. Review it for your gym and local laws — and consider having a professional check it before you rely on it.
        </p>
      </div>

      {LEGAL_PAGES.map(p => {
        const d = draft[p.key]
        if (!d) return null
        const open = openKey === p.key
        return (
          <div key={p.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : p.key)}
                className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
              >
                <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{p.label}</span>
                    {p.core && <ShieldCheck size={13} className="text-emerald-500 shrink-0" title="Recommended for compliance" />}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    /{p.path} · {p.core ? 'recommended' : 'optional'}{!d.enabled && ' · hidden from site'}
                  </span>
                </span>
              </button>
              <Toggle on={d.enabled} onChange={() => toggleEnabled(p)} />
            </div>

            {open && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Page title</label>
                  <input value={d.title} onChange={e => patch(p.key, { title: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Intro paragraph</label>
                  <textarea value={d.intro} onChange={e => patch(p.key, { intro: e.target.value })} rows={3} className={INPUT + ' resize-none'} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Sections</label>
                  <div className="space-y-3">
                    {d.sections.map((s, idx) => (
                      <div key={s.id} className="rounded-lg border border-gray-200 bg-gray-50/40 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={s.heading}
                            onChange={e => updateSection(p.key, idx, { heading: e.target.value })}
                            placeholder="Section heading (e.g. 1. Membership term)"
                            className={INPUT + ' bg-white'}
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => moveSection(p.key, idx, -1)} disabled={idx === 0} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer" title="Move up"><ArrowUp size={14} /></button>
                            <button type="button" onClick={() => moveSection(p.key, idx, 1)} disabled={idx === d.sections.length - 1} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer" title="Move down"><ArrowDown size={14} /></button>
                            <button type="button" onClick={() => removeSection(p.key, idx)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete section"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <textarea
                          value={s.body}
                          onChange={e => updateSection(p.key, idx, { body: e.target.value })}
                          placeholder="Section text…"
                          rows={4}
                          className={INPUT + ' bg-white resize-y'}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addSection(p.key)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add section
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => reset(p)} className="text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
                    Reset to default
                  </button>
                  <button
                    type="button"
                    onClick={() => save(p)}
                    disabled={!d.dirty || d.saving}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {d.saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
