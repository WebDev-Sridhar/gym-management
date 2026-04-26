import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import { fetchGymTrainers, fetchGymContent } from '../../services/gymPublicService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { staggerContainer, scrollViewport, fadeUp } from '../../lib/animations'
import TrainerCard from '../../components/gym/TrainerCard'

export default function GymTrainers() {
  const { gym } = useGym()
  const [trainers, setTrainers] = useState([])
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gym?.id) return
    Promise.all([
      fetchGymTrainers(gym.id).catch(() => []),
      fetchGymContent(gym.id).catch(() => null),
    ]).then(([t, c]) => { setTrainers(t); setContent(c) }).finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--gym-bg)' }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gym-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const defaults        = getDefaultContent(gym?.name, gym?.city)
  const displayTrainers = trainers.length > 0 ? trainers : defaults.trainers.fallbackTrainers
  const heroImg         = content?.trainers_page_image || null
  const heroAlign       = content?.trainers_page_align || 'left'
  const hidden      = Array.isArray(content?.hidden_sections) ? content.hidden_sections : []

  return (
    <div style={{ background: 'var(--gym-bg)' }}>

      {/* ── Page Hero ── */}
      {!hidden.includes('page_hero_trainers') && (
        <section className="relative overflow-hidden pt-36 pb-24"
          style={{ background: heroImg ? 'transparent' : 'var(--gym-surface)' }}>
          {heroImg ? (
            <>
              <img src={heroImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.62)' }} />
            </>
          ) : (
            <div className="absolute inset-0 opacity-5" style={{ background: 'var(--gym-gradient-diagonal)' }} />
          )}
          <div className={`relative max-w-6xl mx-auto px-6 ${heroAlign === 'center' ? 'text-center' : ''}`}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {content?.trainers_page_label || 'Expert Coaches'}
              </p>
              <h1 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'var(--gym-h1-size)' }}>
                {content?.trainers_page_title ? content.trainers_page_title.toUpperCase() : <>MEET THE<br />COACHES</>}
              </h1>
              <p className={`text-white/40 mt-6 font-sans leading-relaxed ${heroAlign === 'center' ? 'max-w-md mx-auto' : 'max-w-md'}`}>
                {content?.trainers_page_desc || defaults.trainers.subtitle}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Trainer Grid + Spotlight ── */}
      {!hidden.includes('trainers') && (
        <>
          <motion.section
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
            style={{ borderTop: '1px solid var(--gym-border)' }}
          >
            <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: "var(--gym-section-py)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayTrainers.map(trainer => (
                  <TrainerCard key={trainer.id} trainer={trainer} />
                ))}
              </div>
            </div>
          </motion.section>

          {displayTrainers.length > 0 && (
            <motion.section
              variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
              style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)', borderBottom: '1px solid var(--gym-border)' }}
            >
              <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: "var(--gym-section-py)" }}>
                <motion.div variants={fadeUp} className="mb-12">
                  <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>Featured</p>
                  <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>TRAINER SPOTLIGHT</h2>
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <motion.div variants={fadeUp} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    {displayTrainers[0].image_url ? (
                      <img src={displayTrainers[0].image_url} alt={displayTrainers[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gym-card)' }}>
                        <div className="w-32 h-32 rounded-full flex items-center justify-center text-white text-6xl font-display" style={{ background: 'var(--gym-gradient)' }}>
                          {displayTrainers[0].name.charAt(0)}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <h3 className="font-display text-white tracking-wider" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
                      {displayTrainers[0].name.toUpperCase()}
                    </h3>
                    {displayTrainers[0].specialization && (
                      <p className="text-sm font-bold tracking-[0.15em] uppercase mt-2 mb-6 font-sans" style={{ color: 'var(--gym-primary)' }}>
                        {displayTrainers[0].specialization}
                      </p>
                    )}
                    {displayTrainers[0].bio && (
                      <p className="text-white/60 font-sans leading-relaxed mb-8">{displayTrainers[0].bio}</p>
                    )}
                    <div className="h-px mb-8" style={{ background: 'var(--gym-border)' }} />
                    <Link
                      to={`/${gym.slug}/pricing`}
                      className="inline-flex items-center gap-2 px-8 py-4 font-bold text-sm font-sans text-white hover:-translate-y-0.5 transition-all duration-300"
                      style={{ background: 'var(--gym-gradient)', boxShadow: '0 8px 24px var(--gym-glow)', borderRadius: 'var(--gym-card-radius)' }}
                    >
                      Train with {displayTrainers[0].name.split(' ')[0]}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.section>
          )}
        </>
      )}

      {/* ── CTA ── */}
      {!hidden.includes('cta_trainers') && (
        <section data-force-white className="relative overflow-hidden" style={{ background: 'var(--gym-gradient-diagonal)' }}>
          <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-display text-white tracking-widest leading-none mb-8"
              style={{ fontSize: 'var(--gym-h1-size)' }}
            >
              READY TO TRAIN?
            </motion.h2>
            <Link
              to={`/${gym.slug}/pricing`}
              className="inline-flex items-center gap-2 px-10 py-4 bg-white font-bold text-sm font-sans hover:-translate-y-1 transition-all duration-300"
              style={{ color: 'var(--gym-primary)', borderRadius: 'var(--gym-card-radius)' }}
            >
              View Membership Plans
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
