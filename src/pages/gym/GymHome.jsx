import { useState, useEffect } from 'react'
import { useGym } from '../../store/GymContext'
import { fetchGymContent, fetchGymPlans, fetchGymTrainers, fetchTestimonials } from '../../services/gymPublicService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { generateGymTheme } from '../../lib/gymTheme'

import HeroSection from '../../components/gym/sections/HeroSection'
import AboutSection from '../../components/gym/sections/AboutSection'
import ProgramsSection from '../../components/gym/sections/ProgramsSection'
import TrainersSection from '../../components/gym/sections/TrainersSection'
import TestimonialsSection from '../../components/gym/sections/TestimonialsSection'
import CTABanner from '../../components/gym/sections/CTABanner'

export default function GymHome() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [plans, setPlans] = useState([])
  const [trainers, setTrainers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'
  const theme = generateGymTheme(themeColor)

  useEffect(() => {
    if (!gym?.id) return

    Promise.all([
      fetchGymContent(gym.id).catch(() => null),
      fetchGymPlans(gym.id).catch(() => []),
      fetchGymTrainers(gym.id).catch(() => []),
      fetchTestimonials(gym.id).catch(() => []),
    ]).then(([c, p, t, r]) => {
      setContent(c)
      setPlans(p || [])
      setTrainers(t || [])
      setTestimonials(r || [])
    }).finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: themeColor, borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  const defaults = getDefaultContent(gym?.name, gym?.city)

  return (
    <>
      <HeroSection gym={gym} content={content} defaults={defaults} />
      <AboutSection content={content} defaults={defaults} />
      <ProgramsSection plans={plans} defaults={defaults} themeColor={theme.primary} />
      <TrainersSection gym={gym} trainers={trainers} defaults={defaults} themeColor={theme.primary} />
      <TestimonialsSection testimonials={testimonials} defaults={defaults} themeColor={theme.primary} />
      <CTABanner gym={gym} defaults={defaults} />
    </>
  )
}
