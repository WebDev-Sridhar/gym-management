import { useState } from 'react'
import { Link } from 'react-router-dom'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking, trackEvent } from '../../lib/hooks/usePageTracking'
import { CAREERS_CONTENT } from '../../lib/content/careers'
import { mapCareersData } from '../../lib/mappers/marketingMapper'
import { submitContactLead } from '../../services/leadsService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CareersPage() {
  usePageTracking('careers')
  const data = mapCareersData(CAREERS_CONTENT)
  const hasOpenings = data.jobs.length > 0

  // Talent-pool form state. Renders below the (empty) jobs list so
  // candidates can register interest even when nothing's open.
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', honeypot: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')  // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  const update = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!form.email.trim()) next.email = 'Please enter your email.'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Please enter a valid email address.'
    if (!form.message.trim() || form.message.trim().length < 10) next.message = 'Please write a bit more so we know what you’re looking for.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.honeypot) return   // bot — silent drop
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
        source: 'careers_page',
      })
      trackEvent('careers_lead_submitted', { source: 'careers_page' })
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '', honeypot: '' })
    } catch (err) {
      console.error('[CareersPage] submit failed', err)
      setErrorMessage(err.message || data.talentPool.errorMessage)
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

          {/* Active openings (currently empty by design — see careers.js note). */}
          {hasOpenings && (
            <div className="max-w-3xl mx-auto space-y-6 mb-16">
              {data.jobs.map((job) => (
                <div key={job.id || job.role} className="border border-border rounded-xl p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-text-primary font-bold">{job.role}</h3>
                    <p className="text-text-muted text-sm">{job.location}</p>
                  </div>
                  <Link
                    to={CAREERS_CONTENT.applyTo || '/contact'}
                    className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-90 transition"
                    aria-label={`Apply for ${job.role}`}
                  >
                    Apply
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* No-openings + talent-pool form. Mirrors the contact form's
              shape so the submission lands in contact_leads with
              source='careers_page' for filtering. */}
          {!hasOpenings && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-text-primary">{data.noOpeningsCopy.headline}</h2>
                <p className="text-text-secondary mt-3">{data.noOpeningsCopy.description}</p>
              </div>

              <div className="border border-border rounded-2xl p-8 bg-bg-elevated/30">
                <h3 className="text-text-primary font-semibold mb-6 text-center">{data.talentPool.formHeading}</h3>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Honeypot */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="careers-company">Company</label>
                    <input
                      id="careers-company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.honeypot}
                      onChange={update('honeypot')}
                    />
                  </div>

                  <div>
                    <label htmlFor="careers-name" className="sr-only">{data.talentPool.namePlaceholder}</label>
                    <input
                      id="careers-name"
                      type="text"
                      placeholder={data.talentPool.namePlaceholder}
                      value={form.name}
                      onChange={update('name')}
                      autoComplete="name"
                      aria-invalid={errors.name ? 'true' : 'false'}
                      className={inputClass}
                    />
                    {errors.name && <p className="text-sm text-red-400 mt-2">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="careers-email" className="sr-only">{data.talentPool.emailPlaceholder}</label>
                    <input
                      id="careers-email"
                      type="email"
                      placeholder={data.talentPool.emailPlaceholder}
                      value={form.email}
                      onChange={update('email')}
                      autoComplete="email"
                      aria-invalid={errors.email ? 'true' : 'false'}
                      className={inputClass}
                    />
                    {errors.email && <p className="text-sm text-red-400 mt-2">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="careers-phone" className="sr-only">{data.talentPool.phonePlaceholder}</label>
                    <input
                      id="careers-phone"
                      type="tel"
                      placeholder={data.talentPool.phonePlaceholder}
                      value={form.phone}
                      onChange={update('phone')}
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="careers-message" className="sr-only">{data.talentPool.messagePlaceholder}</label>
                    <textarea
                      id="careers-message"
                      placeholder={data.talentPool.messagePlaceholder}
                      rows={5}
                      value={form.message}
                      onChange={update('message')}
                      aria-invalid={errors.message ? 'true' : 'false'}
                      className={inputClass}
                    />
                    {errors.message && <p className="text-sm text-red-400 mt-2">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full py-3 bg-accent-purple text-white rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition"
                  >
                    {status === 'submitting' ? data.talentPool.submittingLabel : data.talentPool.submitLabel}
                  </button>

                  {status === 'success' && (
                    <p role="status" className="text-sm text-emerald-400 text-center">
                      {data.talentPool.successMessage}
                    </p>
                  )}
                  {status === 'error' && (
                    <p role="alert" className="text-sm text-red-400 text-center">
                      {errorMessage || data.talentPool.errorMessage}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

        </SectionWrapper>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
