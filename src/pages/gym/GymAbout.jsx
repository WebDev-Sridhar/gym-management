import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, Award, Target, Users } from 'lucide-react'
import { useGym } from '../../store/GymContext'
import { fetchGymContent } from '../../services/gymPublicService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { staggerContainer, scrollViewport, fadeUp, slideInLeft, slideInRight } from '../../lib/animations'
import StatCounter from '../../components/gym/ui/StatCounter'

const UNS = 'https://images.unsplash.com/photo-'
const fit = '?w=900&q=80&auto=format&fit=crop'

const whyItems = [
  { Icon: Dumbbell, title: 'World-Class Equipment', desc: 'Over 200 pieces of premium equipment, updated every year. Everything you need to crush your goals.' },
  { Icon: Award,    title: 'Expert Coaching',       desc: 'Every trainer is certified and passionate. We match you to a coach who fits your style and goals.' },
  { Icon: Target,   title: 'Proven Programs',       desc: '50+ structured classes per week — from beginner-friendly to elite athlete training.' },
  { Icon: Users,    title: 'Real Community',        desc: 'Over 500 members who push each other to be better. Join a tribe that celebrates every milestone.' },
]

const visionMission = [
  {
    label: 'Our Vision',
    text: 'To be the city\'s most transformative fitness community — where every person, regardless of starting point, achieves their strongest self.',
  },
  {
    label: 'Our Mission',
    text: 'To provide elite coaching, world-class facilities, and an unbreakable community that makes extraordinary fitness results accessible to all.',
  },
]

export default function GymAbout() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gym?.id) return
    fetchGymContent(gym.id).then(setContent).catch(() => null).finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--gym-bg)' }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gym-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const defaults = getDefaultContent(gym?.name, gym?.city)
  const aboutText = content?.about_text || defaults.about.description

  // CMS overrides for stats, why us, vision, mission
  const displayStats = content?.stats?.length > 0 ? content.stats : defaults.stats
  const displayWhyUs = content?.why_us?.length >= 4
    ? content.why_us
    : whyItems.map(w => ({ title: w.title, description: w.desc }))
  const visionText  = content?.vision  || visionMission[0].text
  const missionText = content?.mission || visionMission[1].text

  return (
    <div style={{ background: 'var(--gym-bg)' }}>

      {/* ── Page Hero ── */}
      <section className="relative overflow-hidden pt-36 pb-24" style={{ background: 'var(--gym-surface)' }}>
        <div className="absolute inset-0 opacity-5" style={{ background: 'var(--gym-gradient-diagonal)' }} />
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>
              Our Story
            </p>
            <h1 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 7.5rem)' }}>
              ABOUT<br />{gym.name.toUpperCase()}
            </h1>
            {gym.city && (
              <div className="flex items-center gap-2 mt-6 text-white/40 text-sm font-sans">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {gym.city}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── About Story ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        style={{ borderTop: '1px solid var(--gym-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={slideInLeft}>
              <p className="text-sm sm:text-base font-sans leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>{aboutText}</p>
              <div className="mt-8 h-px w-24" style={{ background: 'var(--gym-gradient)' }} />
            </motion.div>
            <motion.div variants={slideInRight} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img src={`${UNS}1571019614242-c5c5dee9f50b${fit}`} alt="Gym story" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 opacity-10" style={{ background: 'var(--gym-gradient)', mixBlendMode: 'color' }} />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Why Choose Us ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)', borderBottom: '1px solid var(--gym-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div variants={fadeUp} className="mb-14 text-center">
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>Why Us</p>
            <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              THE {gym.name.toUpperCase()} DIFFERENCE
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayWhyUs.map((item, i) => {
              const Icon = whyItems[i]?.Icon
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-2xl p-7"
                  style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
                  whileHover={{ borderColor: 'var(--gym-border-strong)', y: -3 }}
                  transition={{ duration: 0.3 }}
                >
                  {Icon && (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--gym-glow)', border: '1px solid var(--gym-border-strong)' }}>
                      <Icon size={20} style={{ color: 'var(--gym-primary)' }} strokeWidth={1.75} />
                    </div>
                  )}
                  <h3 className="font-display text-white tracking-wider text-xl mb-2">{item.title.toUpperCase()}</h3>
                  <p className="text-white/50 text-sm font-sans leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ── Vision & Mission ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div variants={fadeUp} className="mb-12 text-center">
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>Purpose</p>
            <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>VISION & MISSION</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[{ label: visionMission[0].label, text: visionText }, { label: visionMission[1].label, text: missionText }].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="rounded-2xl p-8 relative overflow-hidden"
                style={{ border: '1px solid var(--gym-border)', background: 'var(--gym-card)' }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'var(--gym-gradient)' }} />
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>{item.label}</p>
                <p className="text-white/65 font-sans leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Stats ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)', borderBottom: '1px solid var(--gym-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {displayStats.map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} className="flex flex-col items-center py-8 relative">
                {i < 3 && <div className="absolute right-0 top-1/4 bottom-1/4 w-px hidden lg:block" style={{ background: 'var(--gym-border)' }} />}
                <StatCounter value={stat.value} label={stat.label} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <section data-force-white className="relative overflow-hidden" style={{ background: 'var(--gym-gradient-diagonal)' }}>
        <div className="absolute inset-0 opacity-20 bg-black" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="font-display text-white tracking-widest leading-none mb-6"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
          >
            {content?.cta_about || 'JOIN US TODAY'}
          </motion.h2>
          <Link
            to={`/${gym.slug}/pricing`}
            className="inline-flex items-center gap-2 px-10 py-4 bg-white rounded-xl font-bold text-sm font-sans hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl"
            style={{ color: 'var(--gym-primary)' }}
          >
            View Membership Plans
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
