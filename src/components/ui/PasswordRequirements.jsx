import { Check, X } from 'lucide-react'

/**
 * Live password requirements checklist.
 *
 * Mirrors the Supabase auth policy:
 *   "Lowercase, uppercase letters and digits" + min length.
 * Supabase enforces this server-side anyway; we surface it inline so
 * the user knows what's wrong as they type instead of after submit.
 *
 * Props:
 *   value    — current password string
 *   minLen   — minimum length (default 6)
 *   visible  — controls whether the checklist renders (e.g. only on focus
 *              or when value is non-empty). Caller decides.
 */
export default function PasswordRequirements({ value = '', minLen = 6, visible = true }) {
  if (!visible) return null

  const checks = [
    { label: `At least ${minLen} characters`, pass: value.length >= minLen },
    { label: 'One lowercase letter (a–z)',    pass: /[a-z]/.test(value) },
    { label: 'One uppercase letter (A–Z)',    pass: /[A-Z]/.test(value) },
    { label: 'One number (0–9)',              pass: /\d/.test(value)    },
  ]

  return (
    <ul className="mt-2 space-y-1">
      {checks.map(({ label, pass }) => (
        <li key={label} className="flex items-center gap-2 text-[11px]">
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              pass ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {pass ? <Check size={9} strokeWidth={3} /> : <X size={8} strokeWidth={2.5} />}
          </span>
          <span className={`transition-colors ${pass ? 'text-gray-700' : 'text-gray-400'}`}>
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Convenience predicate — true when value satisfies all requirements.
 * Use in submit handlers to short-circuit the Supabase call.
 */
export function isPasswordValid(value, minLen = 6) {
  if (!value || value.length < minLen) return false
  if (!/[a-z]/.test(value)) return false
  if (!/[A-Z]/.test(value)) return false
  if (!/\d/.test(value))    return false
  return true
}

/**
 * Translates Supabase's verbose password error into something readable.
 * Falls back to the original message if no pattern matches.
 */
export function friendlyPasswordError(message = '') {
  const m = String(message).toLowerCase()
  if (m.includes('at least one character of each')) {
    return 'Password must include lowercase, uppercase letters and a number.'
  }
  if (m.includes('should be at least')) {
    return 'Password is too short. Use at least 6 characters.'
  }
  if (m.includes('weak')) {
    return 'Password is too weak. Try a longer mix of letters and numbers.'
  }
  return message
}
