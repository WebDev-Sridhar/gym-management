import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const DEFAULT_CLS =
  'w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all'

/**
 * PasswordInput — input with a show/hide eye toggle on the right edge.
 *
 * Accepts all standard <input> props (value, onChange, onFocus, onBlur,
 * style, etc.). Pass `className=""` if you want to drop the default
 * Tailwind styling and provide your own via `style` (e.g. gym public site
 * with --gym-* CSS variables).
 *
 * The component always reserves right-side padding (~44px) so the eye
 * icon never overlaps typed characters, regardless of the caller's
 * className/style.
 *
 * The toggle button is tabIndex=-1 so it doesn't disrupt form tab order.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = '',
  required = false,
  autoFocus = false,
  className = DEFAULT_CLS,
  style,
  iconColor,
  ...rest
}) {
  const [show, setShow] = useState(false)

  // Merge style; paddingRight LAST so it wins over shorthand `padding`.
  const mergedStyle = { ...(style || {}), paddingRight: 44 }

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className={className}
        style={mergedStyle}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
        style={iconColor ? { color: iconColor } : undefined}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
