import { useState, useEffect, useRef } from 'react'
import { createPublicOrder, openPublicCheckout } from '../../services/publicCheckoutService'

// ── Keyframe animations injected once ──────────────────────────────────────
const CSS = `
@keyframes pcm-fadein   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
@keyframes pcm-fadeout  { from { opacity:1; transform:translateY(0) }    to { opacity:0; transform:translateY(-18px) } }
@keyframes pcm-spin     { to { transform:rotate(360deg) } }
@keyframes pcm-pulse-ring {
  0%   { transform:scale(0.85); opacity:0.7 }
  50%  { transform:scale(1.1);  opacity:0.3 }
  100% { transform:scale(0.85); opacity:0.7 }
}
@keyframes pcm-draw-check {
  from { stroke-dashoffset:60 }
  to   { stroke-dashoffset:0  }
}
@keyframes pcm-draw-x {
  from { stroke-dashoffset:30 }
  to   { stroke-dashoffset:0  }
}
@keyframes pcm-bounce-in {
  0%   { transform:scale(0.4); opacity:0 }
  60%  { transform:scale(1.12) }
  80%  { transform:scale(0.95) }
  100% { transform:scale(1);   opacity:1 }
}
@keyframes pcm-float {
  0%,100% { transform:translateY(0) }
  50%      { transform:translateY(-6px) }
}
`
let cssInjected = false
function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return
  cssInjected = true
  const el = document.createElement('style')
  el.textContent = CSS
  document.head.appendChild(el)
}

// ── Step components ─────────────────────────────────────────────────────────

function StepForm({ plan, gymName, onSubmit, accent }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--gym-bg)',
    border: '1px solid var(--gym-border-strong)', borderRadius: '10px',
    fontSize: '14px', color: 'var(--gym-text)', outline: 'none', transition: 'border-color 0.15s',
  }

  function handleFocus(e)  { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 1px ${accent}` }
  function handleBlur(e)   { e.target.style.borderColor = 'var(--gym-border-strong)'; e.target.style.boxShadow = 'none' }

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter your name')
    const clean = phone.replace(/\D/g, '')
    if (clean.length !== 10 && !(clean.length === 12 && clean.startsWith('91'))) return setError('Enter a valid 10-digit phone number')
    if (!plan?.id) return setError('Plan not selected')
    onSubmit({ name: name.trim(), phone: clean, email: email.trim() || undefined })
  }

  return (
    <form onSubmit={submit} style={{ animation: 'pcm-fadein 0.3s ease-out' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--gym-text)', fontFamily: 'var(--gym-font)' }}>
            Join {gymName}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--gym-text-muted)' }}>Quick signup — no account needed</p>
        </div>
      </div>

      {/* Plan summary */}
      <div className="mb-5 px-4 py-3.5 flex items-center justify-between"
        style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border-strong)', borderRadius: 'var(--gym-card-radius)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{plan?.name || 'Plan'}</p>
          {plan?.duration_label && <p className="text-xs mt-0.5" style={{ color: 'var(--gym-text-muted)' }}>{plan.duration_label}</p>}
        </div>
        <p className="text-2xl font-bold" style={{ color: accent, fontFamily: 'var(--gym-font)' }}>
          ₹{Number(plan?.price || 0).toLocaleString('en-IN')}
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-3 mb-5">
        {[
          { label: 'Your name', req: true,  type: 'text',  val: name,  set: setName,  ph: 'Full name', af: true },
          { label: 'Phone',     req: true,  type: 'tel',   val: phone, set: v => setPhone(v.replace(/\D/g,'')), ph: '10-digit mobile', max: 10 },
          { label: 'Email',     req: false, type: 'email', val: email, set: setEmail, ph: 'you@email.com' },
        ].map(({ label, req, type, val, set, ph, af, max }) => (
          <div key={label}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gym-text-secondary)' }}>
              {label}
              {req ? <span style={{ color: accent }}> *</span> : <span style={{ color: 'var(--gym-text-muted)' }}> (optional)</span>}
            </label>
            <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
              autoFocus={af} maxLength={max} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      <button type="submit" className="w-full py-3.5 font-bold text-sm text-white cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderRadius: 'var(--gym-card-radius)', transition: 'opacity 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
        Continue to Pay ₹{Number(plan?.price || 0).toLocaleString('en-IN')} →
      </button>

      <p className="text-[11px] text-center mt-3" style={{ color: 'var(--gym-text-muted)' }}>
        Secured by Razorpay · WhatsApp confirmation after payment
      </p>
    </form>
  )
}

function StepProcessing({ accent }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center"
      style={{ animation: 'pcm-fadein 0.3s ease-out' }}>
      {/* Orbit rings */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${accent}30`, animation: 'pcm-pulse-ring 2s ease-in-out infinite' }} />
        <div className="absolute inset-2 rounded-full" style={{ border: `2px solid ${accent}50`, animation: 'pcm-pulse-ring 2s ease-in-out infinite 0.4s' }} />
        <div className="absolute inset-4 rounded-full flex items-center justify-center"
          style={{ background: `${accent}18` }}>
          <svg className="w-8 h-8" style={{ animation: 'pcm-spin 1s linear infinite', color: accent }}
            fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>
      </div>

      <h3 className="text-base font-bold mb-2" style={{ color: 'var(--gym-text)' }}>Opening Payment</h3>
      <p className="text-sm" style={{ color: 'var(--gym-text-muted)' }}>
        Razorpay is loading — complete your payment in the popup
      </p>

      {/* Animated dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} className="w-2 h-2 rounded-full"
            style={{ background: accent, animation: `pcm-pulse-ring 1.2s ease-in-out ${d}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function StepSuccess({ result, gymName, plan, accent, onClose }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-6"
      style={{ animation: 'pcm-fadein 0.4s ease-out' }}>

      {/* Animated checkmark circle */}
      <div className="relative mb-6" style={{ animation: 'pcm-bounce-in 0.5s cubic-bezier(.17,.67,.43,1.2) both' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M10 20 L17 27 L30 13" stroke="white" strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="60" style={{ animation: 'pcm-draw-check 0.5s 0.3s ease-out forwards', strokeDashoffset: 60 }} />
          </svg>
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full" style={{ background: `${accent}25`, transform: 'scale(1.3)', animation: 'pcm-pulse-ring 2.5s ease-in-out infinite' }} />
      </div>

      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--gym-text)', fontFamily: 'var(--gym-font)' }}>
        Welcome, {result?.memberName}!
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--gym-text-secondary)' }}>
        Your membership is now active
      </p>

      {/* Member card */}
      <div className="w-full rounded-2xl p-5 mb-6 text-left"
        style={{
          background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
          border: `1px solid ${accent}30`,
          animation: 'pcm-fadein 0.4s 0.4s ease-out both',
        }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            {result?.memberName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--gym-text)' }}>{result?.memberName}</p>
            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>{gymName} Member</p>
          </div>
          <div className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: `${accent}20`, color: accent }}>
            ACTIVE
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gym-text-muted)' }}>Plan</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{result?.planName || plan?.name}</p>
          </div>
          {result?.expiresAt && (
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gym-text-muted)' }}>Valid until</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>
                {new Date(result.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      <button onClick={onClose} className="w-full py-3.5 font-bold text-sm text-white cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderRadius: 'var(--gym-card-radius)' }}>
        Done — Let&apos;s Go! 🎉
      </button>
    </div>
  )
}

function StepFailed({ error, accent, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-6"
      style={{ animation: 'pcm-fadein 0.4s ease-out' }}>

      {/* Animated X circle */}
      <div className="relative mb-6" style={{ animation: 'pcm-bounce-in 0.5s cubic-bezier(.17,.67,.43,1.2) both' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M13 13 L27 27" stroke="white" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray="30" style={{ animation: 'pcm-draw-x 0.35s 0.3s ease-out forwards', strokeDashoffset: 30 }} />
            <path d="M27 13 L13 27" stroke="white" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray="30" style={{ animation: 'pcm-draw-x 0.35s 0.45s ease-out forwards', strokeDashoffset: 30 }} />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(239,68,68,0.2)', transform: 'scale(1.3)', animation: 'pcm-pulse-ring 2.5s ease-in-out infinite' }} />
      </div>

      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--gym-text)' }}>Payment Failed</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--gym-text-secondary)' }}>
        {error || 'Something went wrong. Please try again.'}
      </p>

      <button onClick={onRetry} className="w-full py-3.5 font-bold text-sm text-white cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderRadius: 'var(--gym-card-radius)' }}>
        Try Again
      </button>
    </div>
  )
}

function StepAlreadyActive({ accent, onClose }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-6"
      style={{ animation: 'pcm-fadein 0.4s ease-out' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: `${accent}18`, border: `2px solid ${accent}40`, animation: 'pcm-bounce-in 0.5s cubic-bezier(.17,.67,.43,1.2) both' }}>
        <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--gym-text)', fontFamily: 'var(--gym-font)' }}>
        Already a Member
      </h2>
      <p className="text-sm mb-2" style={{ color: 'var(--gym-text-secondary)' }}>
        You already have an active membership at this gym.
      </p>
      <p className="text-sm mb-8" style={{ color: 'var(--gym-text-muted)' }}>
        To renew or update your plan, please use the <span style={{ color: accent }} className="font-semibold">Member App</span>.
      </p>
      <button onClick={onClose} className="w-full py-3.5 font-bold text-sm text-white cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderRadius: 'var(--gym-card-radius)' }}>
        Got it
      </button>
    </div>
  )
}

// ── Main modal ──────────────────────────────────────────────────────────────

export default function PublicCheckoutModal({ open, onClose, gymSlug, gymName, plan, themeColor }) {
  const [step, setStep] = useState('form') // 'form' | 'processing' | 'success' | 'failed' | 'already_active'
  const [result, setResult]   = useState(null)
  const [failMsg, setFailMsg] = useState('')
  const overlayRef = useRef(null)
  const accent = themeColor || '#8B5CF6'

  injectCSS()

  useEffect(() => {
    if (!open) { setStep('form'); setResult(null); setFailMsg('') }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current && step === 'form') onClose()
  }

  async function handleFormSubmit({ name, phone, email }) {
    setStep('processing')
    try {
      const order = await createPublicOrder({ gymSlug, planId: plan.id, name, phone, email })
      const res = await openPublicCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: order.razorpayKeyId,
        gymName: order.gymName || gymName,
        planName: order.planName || plan.name,
        prefill: order.prefill,
        themeColor: accent,
      })
      setResult(res)
      setStep('success')
    } catch (err) {
      if (err?.message === 'checkout_dismissed') {
        setStep('form')
      } else if (err?.message?.includes('already_active') || err?.message?.includes('active membership')) {
        setStep('already_active')
      } else {
        setFailMsg(err.message || 'Payment could not be completed')
        setStep('failed')
      }
    }
  }

  return (
    <div ref={overlayRef} onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>

      <div className="w-full max-w-md"
        style={{
          background: 'var(--gym-surface)',
          border: '1px solid var(--gym-border-strong)',
          borderRadius: 'clamp(16px, var(--gym-card-radius, 16px), 24px)',
          boxShadow: 'var(--gym-shadow)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}>

        {/* Close button — only on form step; other steps have their own action buttons */}
        {step === 'form' && (
          <div className="flex justify-end px-5 pt-4 pb-0">
            <button type="button" onClick={onClose} aria-label="Close"
              className="cursor-pointer p-1 rounded-lg transition-colors"
              style={{ color: 'var(--gym-text-muted)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className={step === 'form' ? 'px-6 pb-6 pt-2' : ''}>
          {step === 'form'          && <StepForm plan={plan} gymName={gymName} accent={accent} onSubmit={handleFormSubmit} />}
          {step === 'processing'    && <StepProcessing accent={accent} />}
          {step === 'success'       && <StepSuccess result={result} gymName={gymName} plan={plan} accent={accent} onClose={onClose} />}
          {step === 'failed'        && <StepFailed error={failMsg} accent={accent} onRetry={() => setStep('form')} />}
          {step === 'already_active' && <StepAlreadyActive accent={accent} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
