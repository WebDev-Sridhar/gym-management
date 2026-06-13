import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Rocket, Compass, Globe2, Sparkles } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, slideInLeft, slideInRight } from '../components-v2/ui/ScrollReveal'
import { usePageTracking, trackEvent } from '../lib/hooks/usePageTracking'
import { CAREERS_CONTENT } from '../lib/content/careers'
import { mapCareersData } from '../lib/mappers/marketingMapper'
import { submitContactLead } from '../services/leadsService'
import { ROUTES } from '../lib/constants/routes'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputClass = 'w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition'

const VALUES = [
  {
    icon: Users,
    title: 'A genuinely small team',
    description: "Under 15 people, building the whole product. No layers, no politics — just the work and the people doing it.",
  },
  {
    icon: Rocket,
    title: 'Ship fast, see it land',
    description: "We're early. What you build this week is in front of real gym owners next week — not stuck behind a six-month roadmap.",
  },
  {
    icon: Compass,
    title: 'Real influence',
    description: "Early teams shape direction. Your opinion on what to build next actually changes what gets built next.",
  },
  {
    icon: Globe2,
    title: 'Remote-friendly, India-based',
    description: "Work from where you're productive. We're an India-based team building for India-based gyms.",
  },
]

export default function CareersPageV2() {
  usePageTracking('careers_v2')
  const data = mapCareersData(CAREERS_CONTENT)
  const hasOpenings = data.jobs.length > 0

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
    if (!form.message.trim() || form.message.trim().length < 10) next.message = 'Please write a bit more so we know what you’re looking for.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.honeypot) return // bot — silent drop
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
        source: 'careers_page_v2',
      })
      trackEvent('careers_lead_submitted', { source: 'careers_page_v2' })
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '', honeypot: '' })
    } catch (err) {
      console.error('[CareersPageV2] submit failed', err)
      setErrorMessage(err.message || data.talentPool.errorMessage)
      setStatus('error')
    }
  }

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.CAREERS }}>
      <PageHero eyebrow="Careers" title={data.hero.title} subtitle={data.hero.subtitle} />

      {/* Values */}
      <SectionContainer background="white" innerClassName="!pt-0">
        <StaggerGroup className="grid sm:grid-cols-2 gap-6">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title} variant={fadeUp} className="bg-gray-50 rounded-2xl border border-gray-100 p-8">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      {/* Openings / talent pool */}
      <SectionContainer background="gray">
        {hasOpenings && (
          <StaggerGroup className="max-w-3xl mx-auto space-y-4 mb-16">
            {data.jobs.map((job) => (
              <StaggerItem
                key={job.id || job.role}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{job.role}</h3>
                  <p className="text-sm text-gray-500">{job.location}</p>
                </div>
                <Link to={CAREERS_CONTENT.applyTo || ROUTES.V2.CONTACT}>
                  <Button size="md" aria-label={`Apply for ${job.role}`}>Apply</Button>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}

        {!hasOpenings && (
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
            <ScrollReveal variant={slideInLeft}>
              <Eyebrow>No openings right now</Eyebrow>
              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{data.noOpeningsCopy.headline}</h2>
              <p className="mt-3 text-gray-500 leading-relaxed">{data.noOpeningsCopy.description}</p>

              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Join the talent pool</div>
                  <div className="text-sm text-gray-500 mt-1">
                    We reach out to people in the pool first when a role opens — before it's posted anywhere.
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal variant={slideInRight} delay={0.1} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10">
              <h3 className="text-gray-900 font-semibold mb-6 text-center">{data.talentPool.formHeading}</h3>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="careers-v2-company">Company</label>
                  <input
                    id="careers-v2-company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={update('honeypot')}
                  />
                </div>

                <div>
                  <label htmlFor="careers-v2-name" className="sr-only">{data.talentPool.namePlaceholder}</label>
                  <input
                    id="careers-v2-name"
                    type="text"
                    placeholder={data.talentPool.namePlaceholder}
                    value={form.name}
                    onChange={update('name')}
                    autoComplete="name"
                    aria-invalid={errors.name ? 'true' : 'false'}
                    className={inputClass}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-2">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="careers-v2-email" className="sr-only">{data.talentPool.emailPlaceholder}</label>
                  <input
                    id="careers-v2-email"
                    type="email"
                    placeholder={data.talentPool.emailPlaceholder}
                    value={form.email}
                    onChange={update('email')}
                    autoComplete="email"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    className={inputClass}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-2">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="careers-v2-phone" className="sr-only">{data.talentPool.phonePlaceholder}</label>
                  <input
                    id="careers-v2-phone"
                    type="tel"
                    placeholder={data.talentPool.phonePlaceholder}
                    value={form.phone}
                    onChange={update('phone')}
                    autoComplete="tel"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="careers-v2-message" className="sr-only">{data.talentPool.messagePlaceholder}</label>
                  <textarea
                    id="careers-v2-message"
                    placeholder={data.talentPool.messagePlaceholder}
                    rows={5}
                    value={form.message}
                    onChange={update('message')}
                    aria-invalid={errors.message ? 'true' : 'false'}
                    className={inputClass}
                  />
                  {errors.message && <p className="text-sm text-red-500 mt-2">{errors.message}</p>}
                </div>

                <Button as="button" type="submit" size="lg" disabled={status === 'submitting'} className="w-full disabled:opacity-60 disabled:cursor-not-allowed">
                  {status === 'submitting' ? data.talentPool.submittingLabel : data.talentPool.submitLabel}
                </Button>

                {status === 'success' && (
                  <p role="status" className="text-sm text-emerald-600 text-center">{data.talentPool.successMessage}</p>
                )}
                {status === 'error' && (
                  <p role="alert" className="text-sm text-red-500 text-center">{errorMessage || data.talentPool.errorMessage}</p>
                )}
              </form>
            </ScrollReveal>
          </div>
        )}
      </SectionContainer>
    </V2PageShell>
  )
}
