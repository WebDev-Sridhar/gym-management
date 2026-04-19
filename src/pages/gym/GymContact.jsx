import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import { fetchGymContent } from '../../services/gymPublicService'
import { staggerContainer, scrollViewport, slideInLeft, slideInRight } from '../../lib/animations'

const hours = [
  { day: 'Monday – Friday', time: '5:00 AM – 11:00 PM' },
  { day: 'Saturday', time: '6:00 AM – 10:00 PM' },
  { day: 'Sunday', time: '7:00 AM – 8:00 PM' },
  { day: 'Public Holidays', time: '8:00 AM – 6:00 PM' },
]

export default function GymContact() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!gym?.id) return
    fetchGymContent(gym.id).then(setContent).catch(() => null)
  }, [gym?.id])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (!gym) return null

  return (
    <div style={{ background: 'var(--gym-bg)' }}>

      {/* ── Page Hero ── */}
      <section className="relative overflow-hidden pt-36 pb-24" style={{ background: 'var(--gym-surface)' }}>
        <div className="absolute inset-0 opacity-5" style={{ background: 'var(--gym-gradient-diagonal)' }} />
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>
              Reach Out
            </p>
            <h1 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 7.5rem)' }}>
              GET IN<br />TOUCH
            </h1>
            <p className="text-white/40 mt-6 max-w-md font-sans leading-relaxed">
              Questions, tour requests, or just want to say hello — we're here.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Contact Form + Info ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        style={{ borderTop: '1px solid var(--gym-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* Form */}
            <motion.div variants={slideInLeft}>
              <h2 className="font-display text-white tracking-wider text-3xl mb-8">SEND A MESSAGE</h2>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-10 text-center"
                  style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--gym-gradient)' }}>
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-display text-white text-2xl tracking-wider mb-2">MESSAGE SENT</h3>
                  <p className="text-white/50 text-sm font-sans">We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { id: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
                    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
                    { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210' },
                  ].map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-2 font-sans">{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={form[field.id]}
                        onChange={e => setForm({ ...form, [field.id]: e.target.value })}
                        required={field.id !== 'phone'}
                        className="w-full px-5 py-4 rounded-xl text-sm font-sans text-white placeholder-white/20 outline-none transition-all duration-300"
                        style={{
                          background: 'var(--gym-card)',
                          border: '1px solid var(--gym-border)',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--gym-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--gym-border)'}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-2 font-sans">Message</label>
                    <textarea
                      placeholder="How can we help you?"
                      rows={4}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      required
                      className="w-full px-5 py-4 rounded-xl text-sm font-sans text-white placeholder-white/20 outline-none resize-none transition-all duration-300"
                      style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--gym-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--gym-border)'}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold text-sm text-white font-sans cursor-pointer transition-all duration-300 hover:shadow-2xl"
                    style={{ background: 'var(--gym-gradient)', boxShadow: '0 6px 20px var(--gym-glow)' }}
                  >
                    Send Message
                  </motion.button>
                </form>
              )}
            </motion.div>

            {/* Info sidebar */}
            <motion.div variants={slideInRight} className="space-y-6">
              {/* Working hours */}
              <div className="rounded-2xl p-7" style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>
                <h3 className="font-display text-white tracking-wider text-xl mb-6">WORKING HOURS</h3>
                <div className="space-y-4">
                  {hours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ borderBottom: i < hours.length - 1 ? '1px solid var(--gym-border)' : 'none', paddingBottom: i < hours.length - 1 ? '1rem' : 0 }}>
                      <span className="text-white/50 text-sm font-sans">{h.day}</span>
                      <span className="text-white text-sm font-semibold font-sans" style={{ color: 'var(--gym-primary)' }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact details */}
              {(gym.phone || gym.email || gym.address || gym.city) && (
                <div className="rounded-2xl p-7" style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}>
                  <h3 className="font-display text-white tracking-wider text-xl mb-5">CONTACT</h3>
                  <div className="space-y-4">
                    {gym.phone && (
                      <div className="flex items-start gap-3 text-white/50 text-sm font-sans">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <a href={`tel:${gym.phone}`} className="hover:text-white transition-colors">{gym.phone}</a>
                      </div>
                    )}
                    {gym.email && (
                      <div className="flex items-start gap-3 text-white/50 text-sm font-sans">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <a href={`mailto:${gym.email}`} className="hover:text-white transition-colors">{gym.email}</a>
                      </div>
                    )}
                    {(gym.address || gym.city) && (
                      <div className="flex items-start gap-3 text-white/50 text-sm font-sans">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span className="whitespace-pre-line">{gym.address || `${gym.name}, ${gym.city}`}</span>
                      </div>
                    )}
                  </div>
                  {/* Map embed */}
                  {(gym.address || gym.city) && (
                    <div className="mt-5 rounded-xl overflow-hidden" style={{ height: '200px' }}>
                      <iframe
                        title="Location map"
                        width="100%"
                        height="100%"
                        style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(80%)' }}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(gym.address || gym.name + ' ' + gym.city)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <section data-force-white className="relative overflow-hidden" style={{ background: 'var(--gym-gradient-diagonal)' }}>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-white tracking-widest leading-none mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
          >
            {content?.cta_contact || 'COME VISIT US'}
          </motion.h2>
          <Link
            to={`/${gym.slug}/pricing`}
            className="inline-flex items-center gap-2 px-10 py-4 bg-white rounded-xl font-bold text-sm font-sans hover:-translate-y-1 transition-all duration-300"
            style={{ color: 'var(--gym-primary)' }}
          >
            See Our Plans
          </Link>
        </div>
      </section>
    </div>
  )
}
