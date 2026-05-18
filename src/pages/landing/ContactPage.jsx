import { useState } from 'react'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking, trackEvent } from '../../lib/hooks/usePageTracking'
import { CONTACT_CONTENT } from '../../lib/content/contact'
import { mapContactData } from '../../lib/mappers/marketingMapper'
import { submitContactLead } from '../../services/leadsService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactPage() {
  usePageTracking('contact')
  const data = mapContactData(CONTACT_CONTENT)

  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', honeypot: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!form.email.trim()) next.email = 'Please enter your email.'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Please enter a valid email address.'
    if (!form.message.trim()) next.message = 'Please enter a message.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.honeypot) return // silent drop for bots

    const v = validate()
    setErrors(v)
    if (Object.keys(v).length) return

    setStatus('submitting')
    try {
      await submitContactLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        source: 'contact_page',
      })
      trackEvent('contact_lead_submitted', { source: 'contact_page' })
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '', honeypot: '' })
    } catch (err) {
      console.error('[ContactPage] submit failed', err)
      setStatus('error')
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/40'

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <SectionWrapper>

          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-text-primary">{data.hero.title}</h1>
            <p className="text-text-secondary mt-4">
              {data.hero.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="max-w-xl mx-auto space-y-6">

            {/* Honeypot — hidden from humans, attractive to bots */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="contact-company">Company</label>
              <input
                id="contact-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.honeypot}
                onChange={update('honeypot')}
              />
            </div>

            <div>
              <label htmlFor="contact-name" className="sr-only">{data.form.nameLabel}</label>
              <input
                id="contact-name"
                type="text"
                placeholder={data.form.nameLabel}
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                className={inputClass}
              />
              {errors.name && (
                <p id="contact-name-error" className="text-sm text-red-400 mt-2">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="contact-email" className="sr-only">{data.form.emailLabel}</label>
              <input
                id="contact-email"
                type="email"
                placeholder={data.form.emailLabel}
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'contact-email-error' : undefined}
                className={inputClass}
              />
              {errors.email && (
                <p id="contact-email-error" className="text-sm text-red-400 mt-2">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="contact-phone" className="sr-only">{data.form.phoneLabel}</label>
              <input
                id="contact-phone"
                type="tel"
                placeholder={data.form.phoneLabel}
                value={form.phone}
                onChange={update('phone')}
                autoComplete="tel"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="sr-only">{data.form.messageLabel}</label>
              <textarea
                id="contact-message"
                placeholder={data.form.messageLabel}
                rows={4}
                value={form.message}
                onChange={update('message')}
                aria-invalid={errors.message ? 'true' : 'false'}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                className={inputClass}
              />
              {errors.message && (
                <p id="contact-message-error" className="text-sm text-red-400 mt-2">{errors.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-3 bg-accent-purple text-white rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              {status === 'submitting' ? data.form.submittingLabel : data.form.submitLabel}
            </button>

            {status === 'success' && (
              <p role="status" className="text-sm text-emerald-400 text-center">
                {data.form.successMessage}
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="text-sm text-red-400 text-center">
                {data.form.errorMessage}
              </p>
            )}

          </form>

        </SectionWrapper>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
