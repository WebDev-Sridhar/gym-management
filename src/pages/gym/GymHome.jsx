import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { fetchGymContent, fetchGymTrainers, fetchTestimonials } from '../../services/gymPublicService'
import TrainerCard from '../../components/gym/TrainerCard'
import TestimonialCard from '../../components/gym/TestimonialCard'

export default function GymHome() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'
  const slug = gym?.slug

  useEffect(() => {
    if (!gym?.id) return

    Promise.all([
      fetchGymContent(gym.id).catch(() => null),
      fetchGymTrainers(gym.id).catch(() => []),
      fetchTestimonials(gym.id).catch(() => []),
    ]).then(([c, t, r]) => {
      setContent(c)
      setTrainers(t)
      setTestimonials(r)
    }).finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: themeColor }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32 text-center">
          {gym.logo_url && (
            <img
              src={gym.logo_url}
              alt={gym.name}
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-8 shadow-lg"
            />
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            {content?.hero_title || `Welcome to ${gym.name}`}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            {content?.hero_subtitle || gym.description || 'Your fitness journey starts here.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={`/${slug}/pricing`}
              className="inline-flex items-center justify-center px-8 py-4 bg-white font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              style={{ color: themeColor }}
            >
              View Plans
            </Link>
            <Link
              to={`/${slug}/about`}
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Trainers ── */}
      {trainers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Our Trainers</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Expert coaches dedicated to helping you reach your goals
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.slice(0, 3).map((t) => (
              <TrainerCard key={t.id} trainer={t} themeColor={themeColor} />
            ))}
          </div>
          {trainers.length > 3 && (
            <div className="text-center mt-10">
              <Link
                to={`/${slug}/trainers`}
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: themeColor }}
              >
                View all trainers &rarr;
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">What Our Members Say</h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Real feedback from people who train with us
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} themeColor={themeColor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div
          className="rounded-3xl px-8 py-16 text-center relative overflow-hidden"
          style={{ backgroundColor: themeColor }}
        >
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Join {gym.name} today and transform your fitness.
            </p>
            <Link
              to={`/${slug}/pricing`}
              className="inline-flex items-center justify-center px-8 py-4 bg-white font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              style={{ color: themeColor }}
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
