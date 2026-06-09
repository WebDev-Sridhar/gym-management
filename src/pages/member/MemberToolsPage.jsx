import { useState, useMemo } from 'react'
import { useMemberData } from '../../store/MemberDataContext'
import { updateMemberHealth } from '../../services/membershipService'
import CalculatorPanel from '../../components/calculators/CalculatorPanel'
import { calculateAll } from '../../lib/calculators'

// Member app → Tools tab.
//
// Two-part layout:
//   1. "Your details" card — editable height/weight/dob/sex. Saved values
//      become the pre-fill source for the calculators below.
//   2. Three CalculatorPanel cards (BMI / BMR / Calories) that read the
//      member's stored profile via `initial=`. Members can also tweak the
//      inputs in-place for "what if" exploration without persisting.
//
// We deliberately put the health profile here (not on the Profile tab) so
// the data-entry + calculation workflow is one screen — fewer tab jumps.

const inputCls =
  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

export default function MemberToolsPage() {
  const { member, setMember } = useMemberData()
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')

  // Local form state mirrors the stored profile. Initialized once from
  // member; useState ignores prop changes after mount — that's fine because
  // setMember after a Save updates the same context object the parent reads
  // and we don't want the form fighting the user's in-progress edits.
  const [heightCm, setHeightCm] = useState(member?.height_cm ?? '')
  const [weightKg, setWeightKg] = useState(member?.weight_kg ?? '')
  const [dob, setDob]           = useState(member?.dob ?? '')
  const [sex, setSex]           = useState(member?.sex ?? '')

  // Snapshot of saved profile values for the calculators. This is what the
  // CalculatorPanel uses as pre-fill — we pass the SAVED values, not the
  // local in-progress form values, so calculators show "what the gym has on
  // file" until the member explicitly saves changes.
  const initial = useMemo(() => ({
    heightCm: member?.height_cm ?? '',
    weightKg: member?.weight_kg ?? '',
    dob:      member?.dob ?? '',
    sex:      member?.sex ?? '',
  }), [member?.height_cm, member?.weight_kg, member?.dob, member?.sex])

  // Summary metrics for the header card — null if any required field missing.
  const summary = useMemo(
    () => calculateAll({
      weightKg: Number(initial.weightKg) || 0,
      heightCm: Number(initial.heightCm) || 0,
      dob: initial.dob,
      sex: initial.sex,
    }),
    [initial],
  )

  async function handleSave() {
    setSaving(true); setSaveMsg(''); setSaveErr('')
    try {
      const updated = await updateMemberHealth({
        memberId: member.id,
        heightCm: heightCm === '' ? null : heightCm,
        weightKg: weightKg === '' ? null : weightKg,
        dob: dob || null,
        sex: sex || null,
      })
      setMember(updated)
      setSaveMsg('Saved! Calculators below now use your updated profile.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveErr(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '16px', paddingBottom: '88px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }} className="space-y-4">

        {/* Header */}
        <div style={{ marginTop: '4px' }}>
          <h1 className="text-xl font-bold text-gray-900">Health Tools</h1>
          <p className="text-xs text-gray-500 mt-1">Update your details once, use the calculators anytime.</p>
        </div>

        {/* At-a-glance summary card — only if member has logged enough data */}
        {summary.bmi && (
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider opacity-80">Your snapshot</p>
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

        {/* Profile editor — saves to members table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Used to personalize calculator results. Editable anytime.</p>
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
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saveMsg && <span className="text-xs text-emerald-600">{saveMsg}</span>}
            {saveErr && <span className="text-xs text-red-500">{saveErr}</span>}
          </div>
        </div>

        {/* The three calculators */}
        <CalculatorPanel type="bmi"      initial={initial} />
        <CalculatorPanel type="bmr"      initial={initial} />
        <CalculatorPanel type="calories" initial={initial} />

        <p className="text-[11px] text-gray-400 text-center pt-2">
          BMR uses the Mifflin-St Jeor formula. These calculators are estimates — talk to a doctor or registered dietitian for personalized guidance.
        </p>
      </div>
    </div>
  )
}
