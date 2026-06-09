import { useState, useMemo } from 'react'
import { useTrainerData } from '../../store/TrainerDataContext'
import { updateMemberHealth } from '../../services/membershipService'
import CalculatorPanel from '../../components/calculators/CalculatorPanel'
import CustomSelect from '../../components/ui/CustomSelect'
import { calculateAll } from '../../lib/calculators'

// Trainer dashboard → Tools tab.
// Dark theme matches the rest of the trainer app.
//
// Flow:
//   1. Member picker (CustomSelect dark) — assigned clients only, hints
//      whether profile is complete vs incomplete
//   2. Profile editor — height/weight/age/sex (saves to selected member)
//   3. Snapshot card (live from local form state)
//   4. Three CalculatorPanel cards pre-filled from local form

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  padding: 16,
}
const input = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#f5f5f7',
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
}
const label = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 6,
}

function SexToggle({ value, onChange }) {
  const btn = (v) => ({
    flex: 1,
    padding: '10px 12px',
    background: value === v ? 'rgba(129,140,248,0.18)' : 'rgba(255,255,255,0.05)',
    border: value === v ? '1px solid rgba(129,140,248,0.5)' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: value === v ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  })
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" style={btn('male')}   onClick={() => onChange('male')}>Male</button>
      <button type="button" style={btn('female')} onClick={() => onChange('female')}>Female</button>
    </div>
  )
}

export default function TrainerToolsPage() {
  const { members, refreshMembers } = useTrainerData()
  const [selectedId, setSelectedId] = useState('')
  const [heightCm, setHeightCm]     = useState('')
  const [weightKg, setWeightKg]     = useState('')
  const [age, setAge]               = useState('')
  const [sex, setSex]               = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')
  const [saveErr, setSaveErr]       = useState('')

  const selected = useMemo(
    () => (members ?? []).find(m => m.id === selectedId) ?? null,
    [members, selectedId],
  )

  function handlePickMember(id) {
    setSelectedId(id)
    setSaveMsg(''); setSaveErr('')
    if (!id) return
    const m = (members ?? []).find(x => x.id === id)
    if (!m) return
    setHeightCm(m.height_cm ?? '')
    setWeightKg(m.weight_kg ?? '')
    setAge(m.age ?? '')
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
        age: age === '' ? null : age,
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

  // Live snapshot uses local form state — updates as trainer types so
  // "what if Ravi loses 5kg" can be explored without saving.
  const initial = useMemo(() => ({ heightCm, weightKg, age, sex }), [heightCm, weightKg, age, sex])
  const summary = useMemo(
    () => calculateAll({
      weightKg: Number(weightKg) || 0,
      heightCm: Number(heightCm) || 0,
      ageYears: Number(age)      || 0,
      sex,
    }),
    [heightCm, weightKg, age, sex],
  )

  // Member picker options — show profile-complete hint inline
  const memberOptions = useMemo(() => [
    { value: '', label: 'Quick calculation (no member)' },
    ...(members ?? []).map(m => ({
      value: m.id,
      label: m.name,
      hint: m.height_cm && m.weight_kg && m.age && m.sex ? 'profile complete' : 'profile incomplete',
    })),
  ], [members])

  if (members === null) {
    return (
      <div style={{ padding: '20px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Loading…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 96px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ marginTop: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Health Tools</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
            BMI, BMR, and daily calorie calculators. Pick a client to pre-fill their profile, or use standalone.
          </p>
        </div>

        {/* Member picker */}
        <div style={card}>
          <label style={label}>Member</label>
          <CustomSelect
            dark
            value={selectedId}
            onChange={handlePickMember}
            placeholder="Quick calculation (no member)"
            options={memberOptions}
          />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', lineHeight: 1.4 }}>
            {selected
              ? 'Editing this client\'s details writes back to their profile when you click Save.'
              : 'Standalone mode — no saving, just calculate.'}
          </p>
        </div>

        {/* Snapshot — live from local state */}
        {summary.bmi && (
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 18,
            padding: 18,
            color: '#fff',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, margin: 0 }}>
              {selected ? `${selected.name}'s snapshot` : 'Live snapshot'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 9, opacity: 0.7, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>BMI</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 0' }}>{summary.bmi.value}</p>
                <p style={{ fontSize: 10, opacity: 0.8, margin: 0 }}>{summary.bmi.label}</p>
              </div>
              {summary.bmr && (
                <div>
                  <p style={{ fontSize: 9, opacity: 0.7, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>BMR</p>
                  <p style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 0' }}>{summary.bmr.toLocaleString('en-IN')}</p>
                  <p style={{ fontSize: 10, opacity: 0.8, margin: 0 }}>kcal at rest</p>
                </div>
              )}
              {summary.calories && (
                <div>
                  <p style={{ fontSize: 9, opacity: 0.7, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TDEE</p>
                  <p style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 0' }}>{summary.calories.toLocaleString('en-IN')}</p>
                  <p style={{ fontSize: 10, opacity: 0.8, margin: 0 }}>moderate activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile editor */}
        <div style={card}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Profile details</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              {selected
                ? `Editing ${selected.name}. Save persists to their member record.`
                : 'Type values here to feed the calculators below — nothing saves without a member selected.'}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Height (cm)</label>
              <input type="number" inputMode="decimal" min="50" max="275" step="0.5"
                value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" style={input} />
            </div>
            <div>
              <label style={label}>Weight (kg)</label>
              <input type="number" inputMode="decimal" min="20" max="500" step="0.1"
                value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="65" style={input} />
            </div>
            <div>
              <label style={label}>Age (years)</label>
              <input type="number" inputMode="numeric" min="5" max="120" step="1"
                value={age} onChange={e => setAge(e.target.value)} placeholder="28" style={input} />
            </div>
            <div>
              <label style={label}>Sex</label>
              <SexToggle value={sex} onChange={setSex} />
            </div>
          </div>
          {selected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleSave} disabled={saving} style={{
                padding: '10px 18px',
                background: saving ? 'rgba(129,140,248,0.5)' : '#818cf8',
                border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Saving…' : 'Save to profile'}
              </button>
              {saveMsg && <span style={{ fontSize: 12, color: '#34d399' }}>{saveMsg}</span>}
              {saveErr && <span style={{ fontSize: 12, color: '#f87171' }}>{saveErr}</span>}
            </div>
          )}
        </div>

        {/* Calculators */}
        <CalculatorPanel type="bmi"      initial={initial} />
        <CalculatorPanel type="bmr"      initial={initial} />
        <CalculatorPanel type="calories" initial={initial} />

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 8, margin: 0, lineHeight: 1.5 }}>
          BMR uses Mifflin-St Jeor. Use these as starting points — adjust based on client response over 2-3 weeks.
        </p>
      </div>
    </div>
  )
}
