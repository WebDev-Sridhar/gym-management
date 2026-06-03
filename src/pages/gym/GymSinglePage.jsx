// V3 CMS rebuild: Solo Coach public website — single scrolling page with
// anchor navigation + embedded contact form. Reuses the same section
// components as the multi-page site, so updates to those (HeroSection,
// AboutSection, etc.) automatically reflect here.
//
// Rendered by GymLayout when activePlan === 'free'. The nav links in
// GymNavbar swap to anchor hrefs (#about, #plans, #contact) when
// rendering on a Solo Coach gym.
//
// Why not GymHome with extra sections: GymHome is shared with the
// multi-page flow (loaded at /) and is content-driven for what's
// shown ON the homepage of a multi-page site. A separate file is
// clearer: this page IS the whole site for Solo Coach.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import {
  fetchGymContent,
  fetchGymPlans,
  fetchTestimonials,
} from '../../services/gymPublicService'
import { submitContactMessage } from '../../services/contactService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { generateGymTheme } from '../../lib/gymTheme'

import HeroSection from '../../components/gym/sections/HeroSection'
import AboutSection from '../../components/gym/sections/AboutSection'
import ProgramsGridSection from '../../components/gym/sections/ProgramsGridSection'
import TestimonialsSection from '../../components/gym/sections/TestimonialsSection'
import PricingCard from '../../components/gym/PricingCard'
import PublicCheckoutModal from '../../components/gym/PublicCheckoutModal'

// Same defaults the multi-page GymContact uses, so a Solo Coach gym that
// hasn't set working_hours still gets a sensible placeholder schedule.
const DEFAULT_HOURS = [
  { day: 'Mon – Fri', time: '6:00 AM – 10:00 PM' },
  { day: 'Saturday',  time: '7:00 AM – 8:00 PM'  },
  { day: 'Sunday',    time: '8:00 AM – 6:00 PM'  },
]

export default function GymSinglePage() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [plans, setPlans] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState(null)

  // Inline contact form state — same shape as GymContact's full-page form.
  // Phone is optional; the contact_messages insert RLS accepts anon writes.
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const themeColor = gym?.theme_color || '#8B5CF6'
  const theme = generateGymTheme(themeColor)

  useEffect(() => {
    if (!gym?.id) return
    Promise.all([
      fetchGymContent(gym.id).catch(() => null),
      fetchGymPlans(gym.id).catch(() => []),
      fetchTestimonials(gym.id).catch(() => []),
    ]).then(([c, p, t]) => {
      setContent(c)
      setPlans(p || [])
      setTestimonials(t || [])
    }).finally(() => setLoading(false))
  }, [gym?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      await submitContactMessage({
        gymId: gym.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      })
      setSubmitSuccess(true)
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch (err) {
      setSubmitError(err.message || 'Failed to send. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--gym-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor, borderTopColor: 'transparent' }} />
          <p className="text-white/30 text-xs tracking-[0.2em] uppercase font-sans">Loading</p>
        </div>
      </div>
    )
  }

  const defaults = getDefaultContent(gym?.name, gym?.city)
  const hidden   = Array.isArray(content?.hidden_sections) ? content.hidden_sections : []
  const displayPlans = plans.length > 0 ? plans : (defaults.programs.fallbackPlans || [])
  const hours = (Array.isArray(gym?.working_hours) && gym.working_hours.length > 0)
    ? gym.working_hours
    : DEFAULT_HOURS
  const showMap = !!(gym?.address || gym?.city || (gym?.lat && gym?.lng))

  return (
    <>
      {/* Each section gets a scroll-target id matching the SOLO_SECTIONS
          in StarterWebsitePage so anchor nav lines up. scroll-mt-24 keeps
          the heading clear of a sticky 96px navbar. */}

      <section id="hero" className="scroll-mt-24">
        {!hidden.includes('hero') && (
          <HeroSection gym={gym} content={content} defaults={defaults} />
        )}
      </section>

      <section id="about" className="scroll-mt-24">
        {!hidden.includes('about') && (
          <AboutSection content={content} defaults={defaults} />
        )}
      </section>

      <section id="programs" className="scroll-mt-24">
        {!hidden.includes('programs') && (
          <ProgramsGridSection content={content} defaults={defaults} />
        )}
      </section>

      {/* Plans section — same data + card as the multi-page Pricing page,
          but inline. Skipped entirely if the gym has no published plans
          and we don't have fallback defaults. */}
      <section id="plans" className="scroll-mt-24" style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}>
        {!hidden.includes('plans') && displayPlans.length > 0 && (
          <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: 'var(--gym-section-py)' }}>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {content?.plans_section_label || 'Membership'}
              </p>
              <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
                {(content?.plans_section_heading || defaults.programs.heading || 'CHOOSE A PLAN').toUpperCase()}
              </h2>
              <p className="text-white/45 mt-4 max-w-lg mx-auto font-sans">
                {content?.plans_section_subtitle || defaults.programs.subtitle || ''}
              </p>
            </div>
            <div className={`grid gap-6 ${
              displayPlans.length === 1 ? 'max-w-sm mx-auto' :
              displayPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {displayPlans.map(plan => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  onSelect={gym?.razorpay_enabled ? setCheckoutPlan : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="reviews" className="scroll-mt-24">
        {!hidden.includes('testimonials') && testimonials.length > 0 && (
          <TestimonialsSection testimonials={testimonials} defaults={defaults} content={content} themeColor={theme.primary} />
        )}
      </section>

      {/* Contact section — inline form + gym info. Always shown on Solo
          Coach (no hidden_sections gate) because it's the only way for a
          visitor to reach the gym on a single-page site. */}
      <section id="contact" className="scroll-mt-24" style={{ background: 'var(--gym-bg)', borderTop: '1px solid var(--gym-border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
              Get in touch
            </p>
            <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
              {(content?.contact_heading || 'CONTACT US').toUpperCase()}
            </h2>
            <p className="text-white/45 mt-4 max-w-lg mx-auto font-sans">
              Questions about training, classes, or membership? Send a message — we usually reply within a day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Form */}
            <div className="p-7" style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}>
              {submitSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--gym-gradient)' }}>
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-display text-white text-xl tracking-wider mb-2">MESSAGE SENT</h3>
                  <p className="text-white/50 text-sm font-sans">We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { id: 'name',  label: 'Full Name',    type: 'text',  placeholder: 'Your name',         required: true },
                    { id: 'email', label: 'Email',         type: 'email', placeholder: 'your@email.com',   required: true },
                    { id: 'phone', label: 'Phone',         type: 'tel',   placeholder: '+91 98765 43210', required: false },
                  ].map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-2 font-sans">{field.label}</label>
                      <input type={field.type} placeholder={field.placeholder} value={form[field.id]}
                        onChange={e => setForm({ ...form, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full px-4 py-3 text-sm font-sans text-white placeholder-white/20 outline-none transition-all"
                        style={{ background: 'var(--gym-bg)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--gym-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--gym-border)'}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-2 font-sans">Message</label>
                    <textarea placeholder="How can we help?" rows={4} value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })} required
                      className="w-full px-4 py-3 text-sm font-sans text-white placeholder-white/20 outline-none resize-none transition-all"
                      style={{ background: 'var(--gym-bg)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--gym-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--gym-border)'}
                    />
                  </div>
                  {submitError && <p className="text-red-400 text-xs font-sans">{submitError}</p>}
                  <button type="submit" disabled={submitting}
                    className="w-full py-3.5 font-bold text-sm text-white font-sans cursor-pointer transition-all disabled:opacity-60"
                    style={{ background: 'var(--gym-gradient)', boxShadow: '0 4px 16px var(--gym-glow)', borderRadius: 'var(--gym-card-radius)' }}
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Right column: gym info + working hours + map. Matches the
                multi-page GymContact structure so the single-page experience
                doesn't lose information when downgrading from a full /contact
                route. */}
            <div className="space-y-6">

              {/* Gym contact details — fields hidden when empty so unfilled
                  Solo Coach gyms don't see "—" placeholders. */}
              <div className="p-6 space-y-5" style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}>
                <h3 className="font-display text-white tracking-wider text-base mb-1">REACH US</h3>
                {gym?.phone && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <a href={`tel:${gym.phone}`} className="text-white/70 text-sm font-sans hover:text-white">{gym.phone}</a>
                  </div>
                )}
                {gym?.email && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <a href={`mailto:${gym.email}`} className="text-white/70 text-sm font-sans hover:text-white break-all">{gym.email}</a>
                  </div>
                )}
                {(gym?.address || gym?.city) && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <p className="text-white/70 text-sm font-sans whitespace-pre-line">{gym.address || gym.city}</p>
                  </div>
                )}
              </div>

              {/* Working hours — falls back to DEFAULT_HOURS placeholder so
                  empty gyms still show plausible info instead of a blank box. */}
              <div className="p-6" style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}>
                <h3 className="font-display text-white tracking-wider text-base mb-5">WORKING HOURS</h3>
                <div className="space-y-3">
                  {hours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ borderBottom: i < hours.length - 1 ? '1px solid var(--gym-border)' : 'none', paddingBottom: i < hours.length - 1 ? '0.75rem' : 0 }}>
                      <span className="text-white/50 text-sm font-sans">{h.day}</span>
                      <span className="text-sm font-semibold font-sans" style={{ color: theme.primary }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embedded Google Map — lat/lng if set (precise pin),
                  otherwise the address (or "name + city" as fallback)
                  search. iframe is read-only; no API key required. */}
              {showMap && (
                <div className="overflow-hidden" style={{ height: '220px', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}>
                  <iframe title="Location map" width="100%" height="100%"
                    style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(80%)' }}
                    src={gym.lat && gym.lng
                      ? `https://maps.google.com/maps?q=${gym.lat},${gym.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                      : `https://maps.google.com/maps?q=${encodeURIComponent(gym.address || `${gym.name} ${gym.city || ''}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
                    }
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Public checkout — reused from the multi-page Pricing flow. */}
      <PublicCheckoutModal
        open={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        gymSlug={gym?.slug}
        gymName={gym?.name}
        plan={checkoutPlan}
        themeColor={gym?.theme_color}
      />
    </>
  )
}
