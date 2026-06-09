import { useState, useMemo } from 'react'
import { useTrainerData } from '../../store/TrainerDataContext'
import { updateMemberHealth } from '../../services/membershipService'
import CalculatorPanel from '../../components/calculators/CalculatorPanel'
import { calculateAll } from '../../lib/calculators'

// Trainer dashboard → Tools tab.
//
// Flow:
//   1. Trainer picks a member from the dropdown (their assigned clients only).
//   2. Selected member's stored health profile (height/weight/dob/sex) pre-
//      fills an editable card.
//   3. Trainer can update + save the profile (writes to members table).
//   4. Three calculator cards below use the saved profile as pre-fill.
//   5. Or: trainer picks "No member — quick calc" to use the calculators
//      without persisting anything (useful for a walk-in inquiry).
//
// Mirrors the member-app Tools page (same CalculatorPanel + updateMemberHealth
// service) so the math + UI stay consistent across both audiences.

const inputCls =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

export default function TrainerToolsPage() {
  const { members, refreshMembers } = useTrainerData()
  const [selectedId, setSelectedId] = useState('')   // member id, or '' for standalone
  const [heightCm, setHeightCm]     = useState('')
  const [weightKg, setWeightKg]     = useState('')
  const [dob, setDob]               = useState('')
  const [sex, setSex]               = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')
  const [saveErr, setSaveErr]       = useState('')

  const selected = useMemo(
    () => (members ?? []).find(m => m.id === selectedId) ?? null,
    [members, selectedId],
  )

  // When trainer picks a different member, hydrate the form from that
  // member's stored values. Standalone mode (no member) keeps whatever's
  // currently entered.
  function handlePickMember(id) {
    setSelectedId(id)
    setSaveMsg(''); setSaveErr('')
    if (!id) return
    const m = (members ?? []).find(x => x.id === id)
    if (!m) return
    setHeightCm(m.height_cm ?? '')
    setWeightKg(m.weight_kg ?? '')
    setDob(m.dob ?? '')
    setSex(m.sex ?? '')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true); setSaveMsg(''); setSaveErr('')
    try {
      await updateMemberHealth({
        memberId: selected.id,
        heightCm: heightCm === '' ? null : heightCm,
        weightKg: weightKg === '' ? null : weightKg,
        dob: dob || null,
        sex: sex || null,
      })
      await refreshMembers?.()
      setSaveMsg(`Saved ${selected.name}'s profile.`)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveErr(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  // What the calculators pre-fill from — uses the LOCAL form values so the
  // trainer can tweak inputs without saving (e.g. "what if Ravi lost 5kg?").
  // When a member is selected, this defaults to their stored values via
  // handlePickMember; otherwise it's whatever the trainer typed.
  const initial = useMemo(() => ({
    heightCm, weightKg, dob, sex,
  }), [heightCm, weightKg, dob, sex])

  // Summary card uses the current local-state values so it updates live as
  // the trainer types.
  const summary = useMemo(
    () => calculateAll({
      weightKg: Number(weightKg) || 0,
      heightCm: Number(heightCm) || 0,
      dob, sex,
    }),
    [heightCm, weightKg, dob, sex],
  )

  if (members === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '16px' }}>
        <div className="max-w-2xl mx-auto pt-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            Loading…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '16px', paddingBottom: '88px' }}>
      <div className="max-w-2xl mx-auto space-y-4">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Health Tools</h1>
          <p className="text-xs text-gray-500 mt-1">
            BMI, BMR, and daily calorie calculators. Pick a member to pre-fill their stored profile, or use standalone for a quick calculation.
          </p>
        </div>

        {/* Member picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-1">Member</span>
            <select value={selectedId} onChange={e => handlePickMember(e.target.value)} className={inputCls}>
              <option value="">— Quick calculation (no member) —</option>
              {(members ?? []).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.height_cm && m.weight_kg ? '  ·  profile complete' : '  ·  profile incomplete'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1.5">
              {selected
                ? 'Editing this member’s details writes back to their profile when you click Save.'
                : 'Standalone mode — no saving, just calculate.'}
            </p>
          </label>
        </div>

        {/* Live snapshot card */}
        {summary.bmi && (
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider opacity-80">
              {selected ? `${selected.name}'s snapshot` : 'Live snapshot'}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-[10px] uppercase opacity-70">BMI</p>
                <p className="text-xl font-bold">{summary.bmi.value}</p>
                <p className="text-[10px] opacity-80">{summary.bmi.label}</p>
              </div>
              {summary.bmr && (
                <div>
                  <p className="text-[10px] uppercase opacity-70">BMR</p>
                  <p className="text-xl font-bold">{summary.bmr.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] opacity-80">kcal/day rest</p>
                </div>
              )}
              {summary.calories && (
                <div>
                  <p className="text-[10px] uppercase opacity-70">TDEE</p>
                  <p className="text-xl font-bold">{summary.calories.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] opacity-80">moderate activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile editor — only enabled when a member is selected */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Profile details</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected
                ? `Editing ${selected.name}. Save persists to their member record.`
                : 'Type values here to feed the calculators below — nothing is saved without a member selected.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Height (cm)</span>
              <input type="number" inputMode="decimal" min="50" max="275" step="0.5"
                value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Weight (kg)</span>
              <input type="number" inputMode="decimal" min="20" max="500" step="0.1"
                value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="65" className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Date of birth</span>
              <input type="date" max={new Date(Date.now() - 5*365*86400000).toISOString().slice(0,10)}
                value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Sex</span>
              <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>
          {selected && (
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save to profile'}
              </button>
              {saveMsg && <span className="text-xs text-emerald-600">{saveMsg}</span>}
              {saveErr && <span className="text-xs text-red-500">{saveErr}</span>}
            </div>
          )}
        </div>

        {/* The three calculators — feed from the LOCAL form state so they
            update live as the trainer types, no save round-trip needed. */}
        <CalculatorPanel type="bmi"      initial={initial} />
        <CalculatorPanel type="bmr"      initial={initial} />
        <CalculatorPanel type="calories" initial={initial} />

        <p className="text-[11px] text-gray-400 text-center pt-2">
          BMR uses the Mifflin-St Jeor formula. Use these as starting points for diet programming — adjust based on client response over 2-3 weeks.
        </p>
      </div>
    </div>
  )
}
