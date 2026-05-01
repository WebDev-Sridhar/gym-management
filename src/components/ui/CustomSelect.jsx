import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * CustomSelect — drop-in replacement for <select>.
 * Dropdown renders in a portal so it's never clipped by overflow:hidden containers.
 *
 * Props:
 *   value       — controlled value (string)
 *   onChange    — (value: string) => void
 *   options     — [{ value, label, disabled?, hint? }]
 *   placeholder — shown when no value selected (default "Select...")
 *   compact     — smaller padding for inline / table-row use
 *   className   — extra classes on the wrapper div
 *   disabled    — disables the whole control
 */
export default function CustomSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select...',
  compact = false,
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flip: false })
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const selected = options.find((o) => o.value === value)

  const MAX_DROPDOWN_H = 240 // matches max-h-56 (224px) + borders

  function calcPos() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const flip = spaceBelow < MAX_DROPDOWN_H && r.top > spaceBelow
    setPos({
      top: flip ? 'auto' : r.bottom + 4,
      bottom: flip ? window.innerHeight - r.top + 4 : 'auto',
      left: r.left,
      width: r.width,
      flip,
    })
  }

  function openDropdown() {
    if (disabled) return
    calcPos()
    setOpen(true)
  }

  function toggleDropdown() {
    if (open) setOpen(false)
    else openDropdown()
  }

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return
    const onScroll = () => calcPos()
    const onResize = () => calcPos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  // Close on outside click (both trigger area and portal dropdown)
  useEffect(() => {
    if (!open) return
    function handleOut(e) {
      const inTrigger = triggerRef.current?.contains(e.target)
      const inDropdown = dropdownRef.current?.contains(e.target)
      if (!inTrigger && !inDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const px = compact ? 'px-2.5' : 'px-3'
  const py = compact ? 'py-1.5' : 'py-2.5'
  const textSz = compact ? 'text-xs' : 'text-sm'

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`w-full flex items-center justify-between gap-2 ${px} ${py} ${textSz} bg-gray-50 border rounded-lg text-left transition-colors outline-none
          ${open ? 'border-violet-500 ring-1 ring-violet-500 bg-white' : 'border-gray-200 hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? (pos.flip ? 'rotate-0' : 'rotate-180') : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown rendered in portal — never clipped by parent overflow */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
        >
          <ul className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400">No options</li>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (opt.disabled) return
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors text-sm
                      ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}
                      ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="flex-1 min-w-0 truncate">
                      <span className={isSelected ? 'font-medium text-violet-900' : 'text-gray-800'}>
                        {opt.label}
                      </span>
                      {opt.hint && (
                        <span className="ml-2 text-gray-400 text-xs">{opt.hint}</span>
                      )}
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-violet-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}
