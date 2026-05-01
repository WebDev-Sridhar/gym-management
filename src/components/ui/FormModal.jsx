import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * FormModal — centered overlay modal for CMS add/edit forms.
 *
 * Props:
 *   title    — header text
 *   onClose  — called on backdrop click, Escape, or X button
 *   children — form content (including any save/cancel buttons)
 *   wide     — use max-w-2xl instead of max-w-lg (default false)
 */
export default function FormModal({ title, onClose, children, wide = false }) {
  const backdropRef = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleBackdrop(e) {
    if (e.target === backdropRef.current) onClose()
  }

  return createPortal(
    <div
      ref={backdropRef}
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={`relative w-full bg-white rounded-2xl shadow-2xl flex flex-col ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer -mr-1 p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
