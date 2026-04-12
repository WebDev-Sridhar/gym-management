import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGym } from '../../store/GymContext'
import { fetchGymContent } from '../../services/gymPublicService'

export default function GymAbout() {
  const { gym } = useGym()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'

  useEffect(() => {
    if (!gym?.id) return
    fetchGymContent(gym.id)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const aboutText = content?.about_text || gym?.description

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          About {gym.name}
        </h1>
        {gym.city && (
          <p className="text-gray-500 flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {gym.city}
          </p>
        )}
      </div>

      {/* About content */}
      {aboutText ? (
        <div className="prose prose-gray max-w-none">
          {aboutText.split('\n').map((paragraph, i) => (
            paragraph.trim() && (
              <p key={i} className="text-gray-600 leading-relaxed text-lg mb-4">
                {paragraph}
              </p>
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No about info yet</h3>
          <p className="text-sm text-gray-500">The gym owner hasn't added their story yet.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 text-center">
        <Link
          to={`/${gym.slug}/pricing`}
          className="inline-flex items-center justify-center px-8 py-4 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: themeColor }}
        >
          View Membership Plans
        </Link>
      </div>
    </div>
  )
}
