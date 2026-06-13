import { useState } from 'react'
import { Mail, Clock, MessageCircle, CheckCircle2 } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { fadeUp, slideInLeft, slideInRight } from '../components-v2/ui/ScrollReveal'
import WhatsAppCTA from '../components/ui/WhatsAppCTA'
import { usePageTracking, trackEvent } from '../lib/hooks/usePageTracking'
import { CONTACT_CONTENT } from '../lib/content/contact'
import { mapContactData } from '../lib/mappers/marketingMapper'
import { submitContactLead } from '../services/leadsService'
import { ROUTES, SITE } from '../lib/constants/routes'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputClass = 'w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition'

const WHAT_HAPPENS_NEXT = [
  'A real person reads your message — no ticket queue, no bots.',
  "We reply within one business day, usually faster.",
  "If it's a sales question, we'll offer a quick call or demo — only if you want one.",
]

export default function ContactPageV2() {
  usePageTracking('contact_v2')
  const data = mapContactData(CONTACT_CONTENT)

  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', honeypot: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

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
    setErrorMessage('')
    try {
      await submitContactLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        source: 'contact_page_v2',
      })
      trackEvent('contact_lead_submitted', { source: 'contact_page_v2' })
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '', honeypot: '' })
    } catch (err) {
      console.error('[ContactPageV2] submit failed', err)
      setErrorMessage(err.message || data.form.errorMessage)
      setStatus('error')
    }
  }

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.CONTACT }}>
      <PageHero eyebrow="Contact" title={data.hero.title} subtitle={data.hero.subtitle} />

      <SectionContainer background="gray">
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
          {/* Info column */}
          <ScrollReveal variant={slideInLeft} className="space-y-8">
            <div>
              <Eyebrow>Other ways to reach us</Eyebrow>
              <div className="mt-5 space-y-3">
                <a href={`mailto:${SITE.SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Mail size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Email support</div>
                    <div className="text-sm text-gray-500">{SITE.SUPPORT_EMAIL}</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <MessageCircle size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">WhatsApp</div>
                    <div className="text-sm text-gray-500">Quick questions, fastest response</div>
                  </div>
                  <WhatsAppCTA variant="link" label="Chat" />
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
                  <span className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0">
                    <Clock size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Response time</div>
                    <div className="text-sm text-gray-500">Within one business day</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Eyebrow>What happens next</Eyebrow>
              <ul className="mt-5 space-y-3">
                {WHAT_HAPPENS_NEXT.map((step) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Form column */}
          <ScrollReveal variant={slideInRight} delay={0.1} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Honeypot — hidden from humans, attractive to bots */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-v2-company">Company</label>
                <input
                  id="contact-v2-company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={update('honeypot')}
                />
              </div>

              <div>
                <label htmlFor="contact-v2-name" className="sr-only">{data.form.nameLabel}</label>
                <input
                  id="contact-v2-name"
                  type="text"
                  placeholder={data.form.nameLabel}
                  value={form.name}
                  onChange={update('name')}
                  autoComplete="name"
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'contact-v2-name-error' : undefined}
                  className={inputClass}
                />
                {errors.name && (
                  <p id="contact-v2-name-error" className="text-sm text-red-500 mt-2">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact-v2-email" className="sr-only">{data.form.emailLabel}</label>
                <input
                  id="contact-v2-email"
                  type="email"
                  placeholder={data.form.emailLabel}
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'contact-v2-email-error' : undefined}
                  className={inputClass}
                />
                {errors.email && (
                  <p id="contact-v2-email-error" className="text-sm text-red-500 mt-2">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact-v2-phone" className="sr-only">{data.form.phoneLabel}</label>
                <input
                  id="contact-v2-phone"
                  type="tel"
                  placeholder={data.form.phoneLabel}
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-v2-message" className="sr-only">{data.form.messageLabel}</label>
                <textarea
                  id="contact-v2-message"
                  placeholder={data.form.messageLabel}
                  rows={4}
                  value={form.message}
                  onChange={update('message')}
                  aria-invalid={errors.message ? 'true' : 'false'}
                  aria-describedby={errors.message ? 'contact-v2-message-error' : undefined}
                  className={inputClass}
                />
                {errors.message && (
                  <p id="contact-v2-message-error" className="text-sm text-red-500 mt-2">{errors.message}</p>
                )}
              </div>

              <Button as="button" type="submit" size="lg" disabled={status === 'submitting'} className="w-full disabled:opacity-60 disabled:cursor-not-allowed">
                {status === 'submitting' ? data.form.submittingLabel : data.form.submitLabel}
              </Button>

              {status === 'success' && (
                <p role="status" className="text-sm text-emerald-600 text-center">{data.form.successMessage}</p>
              )}
              {status === 'error' && (
                <p role="alert" className="text-sm text-red-500 text-center">{errorMessage || data.form.errorMessage}</p>
              )}
            </form>
          </ScrollReveal>
        </div>
      </SectionContainer>
    </V2PageShell>
  )
}
