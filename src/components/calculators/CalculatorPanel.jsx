import { useMemo, useState } from 'react'
import {
  calculateBMI, calculateBMR, calculateCalories,
  ACTIVITY_LEVELS,
} from '../../lib/calculators'
import CustomSelect from '../ui/CustomSelect'

// Shared calculator card used by both the Member app (Tools tab) and the
// Trainer dashboard (Tools page). Three variants selected via `type` prop:
//
//   type="bmi"       → height, weight inputs → BMI value + WHO category band
//   type="bmr"       → adds age + sex → BMR (kcal/day at rest)
//   type="calories"  → BMR + activity level → TDEE (kcal/day for the level)
//
// `initial` pre-fills inputs from a member profile (height_cm, weight_kg,
// age, sex from the members table). Member-app uses the current user's row;
// trainer dashboard uses the selected client's row. Missing fields → blank.
//
// Theme: dark, matching the Member + Trainer mobile-app palettes (rgba whites
// on near-black, indigo-400 accents). No light variant — the owner-side
// "Health" section in MemberDrawer is built inline against its own theme,
// not via this component.

// ─── Style atoms ────────────────────────────────────────────────────────────

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

const BMI_COLOR = {
  emerald: { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)', text: '#34d399' },
  amber:   { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
  red:     { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', text: '#f87171' },
}

function SexToggle({ value, onChange }) {
  // Binary choice — 2-button group is friendlier on mobile than a dropdown.
  // Same male/female options the underlying BMR formula supports.
  const btn = (v, lbl) => ({
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
      <button type="button" style={btn('male', 'Male')}     onClick={() => onChange('male')}>Male</button>
      <button type="button" style={btn('female', 'Female')} onClick={() => onChange('female')}>Female</button>
    </div>
  )
}

export default function CalculatorPanel({
  type,                  // 'bmi' | 'bmr' | 'calories'
  initial = {},          // { heightCm, weightKg, age, sex }
}) {
  const [heightCm, setHeightCm] = useState(initial.heightCm ?? '')
  const [weightKg, setWeightKg] = useState(initial.weightKg ?? '')
  const [age, setAge]           = useState(initial.age ?? '')
  const [sex, setSex]           = useState(initial.sex ?? '')
  const [activityLevel, setActivityLevel] = useState('moderate')

  // Computed result — re-derives instantly on any input change (no useEffect,
  // no spinner; pure-function math).
  const result = useMemo(() => {
    const h = Number(heightCm)
    const w = Number(weightKg)
    const a = Number(age)
    if (type === 'bmi') {
      return calculateBMI(w, h)
    }
    if (type === 'bmr') {
      const bmr = calculateBMR({ weightKg: w, heightCm: h, ageYears: a, sex })
      return bmr != null ? { bmr } : null
    }
    if (type === 'calories') {
      const bmr = calculateBMR({ weightKg: w, heightCm: h, ageYears: a, sex })
      const tdee = bmr ? calculateCalories(bmr, activityLevel) : null
      return tdee != null ? { tdee, activityLevel } : null
    }
    return null
  }, [type, heightCm, weightKg, age, sex, activityLevel])

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
          {type === 'bmi'      && 'BMI Calculator'}
          {type === 'bmr'      && 'BMR Calculator'}
          {type === 'calories' && 'Daily Calorie Calculator'}
        </h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
          {type === 'bmi'      && 'Body Mass Index — weight relative to height.'}
          {type === 'bmr'      && 'Basal Metabolic Rate — calories burned at rest.'}
          {type === 'calories' && 'Daily energy expenditure based on activity.'}
        </p>
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label}>Height (cm)</label>
          <input
            type="number" inputMode="decimal" min="50" max="275" step="0.5"
            value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170"
            style={input}
          />
        </div>
        <div>
          <label style={label}>Weight (kg)</label>
          <input
            type="number" inputMode="decimal" min="20" max="500" step="0.1"
            value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="65"
            style={input}
          />
        </div>

        {(type === 'bmr' || type === 'calories') && (
          <>
            <div>
              <label style={label}>Age (years)</label>
              <input
                type="number" inputMode="numeric" min="5" max="120" step="1"
                value={age} onChange={e => setAge(e.target.value)} placeholder="28"
                style={input}
              />
            </div>
            <div>
              <label style={label}>Sex</label>
              <SexToggle value={sex} onChange={setSex} />
            </div>
          </>
        )}
      </div>

      {type === 'calories' && (
        <div style={{ marginTop: 12 }}>
          <label style={label}>Activity level</label>
          <CustomSelect
            dark
            value={activityLevel}
            onChange={setActivityLevel}
            options={ACTIVITY_LEVELS.map(a => ({ value: a.value, label: a.label, hint: a.description }))}
          />
        </div>
      )}

      {/* Result */}
      <div style={{
        marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {!result ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', margin: 0 }}>
            {type === 'bmi'
              ? 'Enter height and weight to see your BMI.'
              : 'Enter all fields above to see your result.'}
          </p>
        ) : type === 'bmi' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your BMI</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{result.value}</p>
            </div>
            <span style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: BMI_COLOR[result.color].bg,
              border: `1px solid ${BMI_COLOR[result.color].border}`,
              color: BMI_COLOR[result.color].text,
            }}>
              {result.label}
            </span>
          </div>
        ) : type === 'bmr' ? (
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basal Metabolic Rate</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
              {result.bmr.toLocaleString('en-IN')} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>kcal/day</span>
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' }}>
              Calories burned at complete rest (no activity).
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total daily energy expenditure</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
              {result.tdee.toLocaleString('en-IN')} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>kcal/day</span>
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>
              Maintenance at {ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label.toLowerCase()}.
              For weight loss: <span style={{ color: '#fbbf24' }}>{Math.round(result.tdee * 0.8).toLocaleString('en-IN')}–{Math.round(result.tdee * 0.85).toLocaleString('en-IN')} kcal/day</span>.
              For weight gain: <span style={{ color: '#34d399' }}>{Math.round(result.tdee * 1.1).toLocaleString('en-IN')}–{Math.round(result.tdee * 1.15).toLocaleString('en-IN')} kcal/day</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
