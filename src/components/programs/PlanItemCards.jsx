import { X } from 'lucide-react'

/**
 * Per-item editor cards for the workout/diet template builders.
 *
 * Shared between:
 *   • owner ProgramsPage   — light theme  (Tailwind classes)
 *   • trainer TrainerWorkoutsPage  — dark theme  (inline rgba styles)
 *   • trainer TrainerMembersPage   — dark theme  (inline rgba styles)
 *
 * The previous cramped 5–6 column grid clipped Notes/Items to ~250px in a
 * `wide` modal. Card layout gives each long-text field a full-row textarea
 * + groups numeric fields in 2–3 col sub-grids. Mobile-safe because every
 * cell stays ≥ 80px even at 320px viewport.
 *
 * Both cards take the same callback shape so call sites can drop them in:
 *   onUpdate(patch)  — merge patch into the row
 *   onRemove()       — remove the row
 *
 * Pass `dark` to swap to the trainer-page palette (white/rgba on #0f1020).
 */

const cardClsLight = 'border border-gray-200 rounded-xl p-3 sm:p-4 bg-white space-y-3 hover:border-gray-300 transition-colors'
const cardClsDark  = 'rounded-xl p-3 sm:p-4 space-y-3 transition-colors border'
const cardStyleDark = {
  background: 'rgba(255,255,255,0.04)',
  borderColor: 'rgba(255,255,255,0.1)',
}

const inputClsLight = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all'
// For dark: place placeholder color via Tailwind arbitrary class so the
// rgba placeholder colour matches the rest of the trainer aesthetic.
const inputClsDark  = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all border placeholder:text-[rgba(255,255,255,0.25)]'
const inputStyleDark = {
  background: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.1)',
  color: '#f5f5f7',
  fontFamily: 'inherit',
}

const labelClsLight = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1'
const labelClsDark  = 'block text-[10px] font-bold uppercase tracking-wider mb-1'
const labelStyleDark = { color: 'rgba(255,255,255,0.45)' }

const hintClsLight = 'text-gray-300 font-normal normal-case'
const hintClsDark  = 'font-normal normal-case'
const hintStyleDark = { color: 'rgba(255,255,255,0.25)' }

function Label({ children, hint, dark }) {
  return (
    <label className={dark ? labelClsDark : labelClsLight} style={dark ? labelStyleDark : undefined}>
      {children}
      {hint && (
        <span className={'ml-1 ' + (dark ? hintClsDark : hintClsLight)} style={dark ? hintStyleDark : undefined}>
          {hint}
        </span>
      )}
    </label>
  )
}

function Field({ dark, multiline = false, ...inputProps }) {
  const cls = dark ? inputClsDark : inputClsLight
  const style = dark ? inputStyleDark : undefined
  return multiline
    ? <textarea {...inputProps} rows={inputProps.rows ?? 2} className={`${cls} resize-none`} style={style} />
    : <input {...inputProps} className={cls} style={style} />
}

function RemoveBtn({ dark, onClick, label }) {
  if (dark) {
    return (
      <button type="button" onClick={onClick} title={label}
        className="p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center"
        style={{
          background: 'transparent',
          color: 'rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}>
        <X size={14} />
      </button>
    )
  }
  return (
    <button type="button" onClick={onClick} title={label}
      className="text-gray-300 hover:text-red-500 cursor-pointer p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 flex items-center justify-center">
      <X size={14} />
    </button>
  )
}

export function ExerciseCard({ row, index, onUpdate, onRemove, dark = false }) {
  return (
    <div className={dark ? cardClsDark : cardClsLight} style={dark ? cardStyleDark : undefined}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Label dark={dark} hint={`#${index + 1}`}>Exercise</Label>
          <Field dark={dark}
            value={row.name || ''}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="e.g. Barbell Bench Press"
            style={{ ...(dark ? inputStyleDark : {}), fontWeight: 600 }}
          />
        </div>
        <div className="pt-5">
          <RemoveBtn dark={dark} onClick={onRemove} label="Remove exercise" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div>
          <Label dark={dark}>Sets</Label>
          <Field dark={dark}
            value={row.sets || ''}
            onChange={e => onUpdate({ sets: e.target.value })}
            placeholder="4" type="number" min="0"
          />
        </div>
        <div>
          <Label dark={dark}>Reps</Label>
          <Field dark={dark}
            value={row.reps || ''}
            onChange={e => onUpdate({ reps: e.target.value })}
            placeholder="8-12"
          />
        </div>
        <div>
          <Label dark={dark}>Rest</Label>
          <Field dark={dark}
            value={row.rest || ''}
            onChange={e => onUpdate({ rest: e.target.value })}
            placeholder="60s"
          />
        </div>
      </div>
      <div>
        <Label dark={dark} hint="optional">Notes</Label>
        <Field dark={dark} multiline rows={2}
          value={row.notes || ''}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Form cues, target weight, tempo, alternates…"
        />
      </div>
    </div>
  )
}

export function MealCard({ row, index, onUpdate, onRemove, dark = false }) {
  return (
    <div className={dark ? cardClsDark : cardClsLight} style={dark ? cardStyleDark : undefined}>
      <div className="flex items-start gap-2">
        <div className="w-20 sm:w-24 shrink-0">
          <Label dark={dark}>Time</Label>
          <Field dark={dark}
            value={row.time || ''}
            onChange={e => onUpdate({ time: e.target.value })}
            placeholder="8 AM"
          />
        </div>
        <div className="flex-1 min-w-0">
          <Label dark={dark} hint={`#${index + 1}`}>Meal</Label>
          <Field dark={dark}
            value={row.meal_name || ''}
            onChange={e => onUpdate({ meal_name: e.target.value })}
            placeholder="e.g. Post-workout shake"
            style={{ ...(dark ? inputStyleDark : {}), fontWeight: 600 }}
          />
        </div>
        <div className="pt-5">
          <RemoveBtn dark={dark} onClick={onRemove} label="Remove meal" />
        </div>
      </div>
      <div>
        <Label dark={dark}>Items / ingredients</Label>
        <Field dark={dark} multiline rows={2}
          value={row.items || ''}
          onChange={e => onUpdate({ items: e.target.value })}
          placeholder="Chicken breast 200g, brown rice 100g, broccoli 50g…"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div>
          <Label dark={dark}>Protein (g)</Label>
          <Field dark={dark}
            value={row.protein || ''}
            onChange={e => onUpdate({ protein: e.target.value })}
            placeholder="30" type="number" min="0"
          />
        </div>
        <div>
          <Label dark={dark}>Calories</Label>
          <Field dark={dark}
            value={row.calories || ''}
            onChange={e => onUpdate({ calories: e.target.value })}
            placeholder="400" type="number" min="0"
          />
        </div>
      </div>
    </div>
  )
}
