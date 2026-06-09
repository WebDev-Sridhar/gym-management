import { useMemo, useState } from 'react'
import {
  calculateBMI, calculateBMR, calculateCalories,
  computeAgeFromDob,
  ACTIVITY_LEVELS, SEX_OPTIONS,
} from '../../lib/calculators'

// Shared calculator card used by both the Member app (Tools tab) and the
// Trainer dashboard (Tools page). Three variants selected via `type` prop:
//
//   type="bmi"       → height, weight inputs → BMI value + WHO category band
//   type="bmr"       → adds dob + sex → BMR (kcal/day at rest)
//   type="calories"  → BMR + activity level → TDEE (kcal/day for the level)
//
// `initial` pre-fills inputs from a member profile (height_cm, weight_kg,
// dob, sex from the members table). Member-app uses the current user's row;
// trainer dashboard uses the selected client's row. Missing fields → blank.
//
// `onProfileChange` lets the parent persist edits back to the members table
// when the user changes a field. Optional — calculator works fine without it
// for a true standalone calculate-and-display flow.
//
// Tailwind classnames intentionally generic-friendly so the same component
// renders cleanly in member-app card style and trainer-dashboard form style.

const inputCls =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </label>
  )
}

const COLOR_CLASSES = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50   text-amber-700   border-amber-200',
  red:     'bg-red-50     text-red-700     border-red-200',
  indigo:  'bg-indigo-50  text-indigo-700  border-indigo-200',
}

export default function CalculatorPanel({
  type,                  // 'bmi' | 'bmr' | 'calories'
  initial = {},          // { heightCm, weightKg, dob, sex }
  onProfileChange,       // optional fn({ heightCm?, weightKg?, dob?, sex? }) → Promise<void>
  saving = false,        // parent controls — disables Save while in flight
  showSave = false,      // hide Save button when parent persists onChange instead
}) {
  // Inputs are LOCAL state so editing feels snappy. The parent persists
  // (optional) via onProfileChange when the user clicks Save or hits a
  // particular field's blur.
  const [heightCm, setHeightCm] = useState(initial.heightCm ?? '')
  const [weightKg, setWeightKg] = useState(initial.weightKg ?? '')
  const [dob, setDob]           = useState(initial.dob ?? '')
  const [sex, setSex]           = useState(initial.sex ?? '')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [persistError, setPersistError]   = useState('')

  // Computed result — re-derives on any input change. Pure-function math so
  // no useEffect, no spinner; result appears instantly.
  const result = useMemo(() => {
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (type === 'bmi') {
      return calculateBMI(w, h)
    }
    if (type === 'bmr') {
      const age = computeAgeFromDob(dob)
      const bmr = calculateBMR({ weightKg: w, heightCm: h, ageYears: age, sex })
      return bmr != null ? { bmr, age } : null
    }
    if (type === 'calories') {
      const age = computeAgeFromDob(dob)
      const bmr = calculateBMR({ weightKg: w, heightCm: h, ageYears: age, sex })
      const tdee = bmr ? calculateCalories(bmr, activityLevel) : null
      return tdee != null ? { tdee, bmr, age, activityLevel } : null
    }
    return null
  }, [type, heightCm, weightKg, dob, sex, activityLevel])

  async function handleSaveProfile() {
    if (!onProfileChange) return
    setPersistError('')
    try {
      await onProfileChange({
        heightCm: heightCm === '' ? null : Number(heightCm),
        weightKg: weightKg === '' ? null : Number(weightKg),
        dob: dob || null,
        sex: sex || null,
      })
    } catch (err) {
      setPersistError(err.message || 'Could not save profile.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {type === 'bmi' && 'BMI Calculator'}
          {type === 'bmr' && 'BMR Calculator'}
          {type === 'calories' && 'Daily Calorie Calculator'}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {type === 'bmi'      && 'Body Mass Index — quick read on weight relative to height.'}
          {type === 'bmr'      && 'Basal Metabolic Rate — calories your body burns at rest.'}
          {type === 'calories' && 'Total daily energy expenditure based on activity level.'}
        </p>
      </div>

      {/* Inputs — only the ones each calculator needs */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Height (cm)">
          <input
            type="number" inputMode="decimal" min="50" max="275" step="0.5"
            value={heightCm} onChange={e => setHeightCm(e.target.value)}
            placeholder="170" className={inputCls}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number" inputMode="decimal" min="20" max="500" step="0.1"
            value={weightKg} onChange={e => setWeightKg(e.target.value)}
            placeholder="65" className={inputCls}
          />
        </Field>

        {(type === 'bmr' || type === 'calories') && (
          <>
            <Field label="Date of birth">
              <input
                type="date"
                max={new Date(Date.now() - 5*365*86400000).toISOString().slice(0,10)}
                value={dob} onChange={e => setDob(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Sex">
              <select
                value={sex} onChange={e => setSex(e.target.value)}
                className={inputCls}
              >
                <option value="">Select…</option>
                {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>

      {type === 'calories' && (
        <Field label="Activity level">
          <select
            value={activityLevel} onChange={e => setActivityLevel(e.target.value)}
            className={inputCls}
          >
            {ACTIVITY_LEVELS.map(a => (
              <option key={a.value} value={a.value}>{a.label} — {a.description}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Result panel */}
      <div className="border-t border-gray-100 pt-4">
        {!result ? (
          <p className="text-xs text-gray-400 italic">
            {type === 'bmi'
              ? 'Enter height and weight to see your BMI.'
              : 'Enter all fields above to see your result.'}
          </p>
        ) : type === 'bmi' ? (
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500">Your BMI</p>
              <p className="text-3xl font-bold text-gray-900">{result.value}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${COLOR_CLASSES[result.color]}`}>
              {result.label}
            </span>
          </div>
        ) : type === 'bmr' ? (
          <div>
            <p className="text-xs text-gray-500">Basal Metabolic Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {result.bmr.toLocaleString('en-IN')} <span className="text-base text-gray-500 font-medium">kcal/day</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Calories burned at complete rest (no activity).</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500">Total daily energy expenditure</p>
            <p className="text-3xl font-bold text-gray-900">
              {result.tdee.toLocaleString('en-IN')} <span className="text-base text-gray-500 font-medium">kcal/day</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maintenance calories at {ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label.toLowerCase()}.
              For weight loss: aim for {Math.round(result.tdee * 0.8).toLocaleString('en-IN')}-{Math.round(result.tdee * 0.85).toLocaleString('en-IN')} kcal/day.
              For weight gain: {Math.round(result.tdee * 1.1).toLocaleString('en-IN')}-{Math.round(result.tdee * 1.15).toLocaleString('en-IN')} kcal/day.
            </p>
          </div>
        )}
      </div>

      {/* Optional Save → persists current input back to member profile */}
      {showSave && onProfileChange && (
        <div className="border-t border-gray-100 pt-4 flex items-center gap-3 flex-wrap">
          <button
            type="button" onClick={handleSaveProfile} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save to profile'}
          </button>
          <p className="text-[11px] text-gray-500">
            Saves height, weight, date of birth, and sex to your profile so calculators auto-fill next time.
          </p>
          {persistError && <p className="text-xs text-red-500">{persistError}</p>}
        </div>
      )}
    </div>
  )
}
