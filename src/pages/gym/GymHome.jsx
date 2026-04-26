import { useState, useEffect } from 'react'
import { useGym } from '../../store/GymContext'
import {
  fetchGymContent,
  fetchGymPlans,
  fetchGymTrainers,
  fetchTestimonials,
} from '../../services/gymPublicService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { generateGymTheme } from '../../lib/gymTheme'

import HeroSection from '../../components/gym/sections/HeroSection'
import StatsSection from '../../components/gym/sections/StatsSection'
import ProgramsGridSection from '../../components/gym/sections/ProgramsGridSection'
import AboutSection from '../../components/gym/sections/AboutSection'
import TrainersSection from '../../components/gym/sections/TrainersSection'
import TestimonialsSection from '../../components/gym/sections/TestimonialsSection'
import GallerySection from '../../components/gym/sections/GallerySection'
import CTABanner from '../../components/gym/sections/CTABanner'

export default function GymHome() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'
  const theme = generateGymTheme(themeColor)

  useEffect(() => {
    if (!gym?.id) return
    Promise.all([
      fetchGymContent(gym.id).catch((e) => { console.error('fetchGymContent:', e); return null }),
      fetchGymPlans(gym.id).catch(() => []),
      fetchGymTrainers(gym.id).catch(() => []),
      fetchTestimonials(gym.id).catch(() => []),
    ]).then(([c, , t, r]) => {
      setContent(c)
      setTrainers(t || [])
      setTestimonials(r || [])
    }).finally(() => setLoading(false))
  }, [gym?.id])

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

  return (
    <>
      {!hidden.includes('hero')         && <HeroSection gym={gym} content={content} defaults={defaults} />}
      {!hidden.includes('stats_home')    && <StatsSection defaults={defaults} content={content} />}
      {!hidden.includes('programs')     && <ProgramsGridSection content={content} defaults={defaults} />}
      {!hidden.includes('about')        && <AboutSection content={content} defaults={defaults} />}
      {!hidden.includes('trainers')     && <TrainersSection gym={gym} trainers={trainers} defaults={defaults} themeColor={theme.primary} content={content} />}
      {!hidden.includes('testimonials') && <TestimonialsSection testimonials={testimonials} defaults={defaults} content={content} />}
      {!hidden.includes('gallery')       && <GallerySection defaults={defaults} content={content} />}
      {!hidden.includes('cta_home')     && <CTABanner gym={gym} content={content} defaults={defaults} />}
    </>
  )
}
