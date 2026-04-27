import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

const DialogContext = createContext(null)

export function useDialog() {
  return useContext(DialogContext)
}

function DialogModal({ type, title, message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={type === 'alert' ? onConfirm : onCancel} />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-[fadeScaleIn_0.15s_ease-out]">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mx-auto ${type === 'confirm' ? 'bg-red-50' : 'bg-amber-50'}`}>
          {type === 'confirm' ? (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          {title && <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>}
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className={`flex gap-2 ${type === 'alert' ? 'justify-center' : ''}`}>
          {type === 'confirm' && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors cursor-pointer ${
              type === 'confirm'
                ? 'flex-1 bg-red-500 hover:bg-red-600'
                : 'px-8 bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {type === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function DialogProvider({ children }) {
  const [state, setState] = useState(null)

  const alert = useCallback((message, title) =>
    new Promise(resolve => setState({ type: 'alert', message, title: title ?? '', resolve }))
  , [])

  const confirm = useCallback((message, title) =>
    new Promise(resolve => setState({ type: 'confirm', message, title: title ?? '', resolve }))
  , [])

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {state && (
        <DialogModal
          type={state.type}
          title={state.title}
          message={state.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  )
}
