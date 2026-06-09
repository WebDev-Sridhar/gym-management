import { useState, useMemo } from 'react'
import { useMemberData } from '../../store/MemberDataContext'
import { updateMemberHealth } from '../../services/membershipService'
import CalculatorPanel from '../../components/calculators/CalculatorPanel'
import { calculateAll } from '../../lib/calculators'

// Member app → Tools tab.
// Dark theme matches the rest of the member app (#0f1023 base, rgba whites,
// indigo-400 accents). Same shell/spacing pattern as MemberApp.jsx and
// MemberProfilePage.jsx so the tab transition feels native.
//
// Layout:
//   1. Snapshot card — gradient indigo, shows current BMI/BMR/TDEE at a glance
//   2. "Your details" editor — height, weight, age, sex with Save
//   3. Three CalculatorPanel cards pre-filled from saved profile

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

export default function MemberToolsPage() {
  const { member, setMember } = useMemberData()
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')

  const [heightCm, setHeightCm] = useState(member?.height_cm ?? '')
  const [weightKg, setWeightKg] = useState(member?.weight_kg ?? '')
  const [age, setAge]           = useState(member?.age ?? '')
  const [sex, setSex]           = useState(member?.sex ?? '')

  // Snapshot uses SAVED values (what the gym has on file) so calculators
  // below see "current truth" until member explicitly saves their edits.
  const initial = useMemo(() => ({
    heightCm: member?.height_cm ?? '',
    weightKg: member?.weight_kg ?? '',
    age:      member?.age ?? '',
    sex:      member?.sex ?? '',
  }), [member?.height_cm, member?.weight_kg, member?.age, member?.sex])

  const summary = useMemo(
    () => calculateAll({
      weightKg: Number(initial.weightKg) || 0,
      heightCm: Number(initial.heightCm) || 0,
      ageYears: Number(initial.age)      || 0,
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
        age: age === '' ? null : age,
        sex: sex || null,
      })
      setMember(updated)
      setSaveMsg('Saved! Calculators below now use your updated details.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveErr(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px 96px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header */}
        <div style={{ marginTop: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Health Tools</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
            Update your details once. Use the calculators anytime.
          </p>
        </div>

        {/* Snapshot card (only when at least BMI computes) */}
        {summary.bmi && (
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 18,
            padding: 18,
            color: '#fff',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, margin: 0 }}>
              Your snapshot
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
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Your details</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              Used to personalize calculator results. Editable anytime.
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSave} disabled={saving} style={{
              padding: '10px 18px',
              background: saving ? 'rgba(129,140,248,0.5)' : '#818cf8',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saveMsg && <span style={{ fontSize: 12, color: '#34d399' }}>{saveMsg}</span>}
            {saveErr && <span style={{ fontSize: 12, color: '#f87171' }}>{saveErr}</span>}
          </div>
        </div>

        {/* Calculators */}
        <CalculatorPanel type="bmi"      initial={initial} />
        <CalculatorPanel type="bmr"      initial={initial} />
        <CalculatorPanel type="calories" initial={initial} />

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 8, margin: 0, lineHeight: 1.5 }}>
          BMR uses the Mifflin-St Jeor formula. These are estimates — consult a doctor or dietitian for personalized guidance.
        </p>
      </div>
    </div>
  )
}
