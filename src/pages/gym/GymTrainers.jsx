import { useState, useEffect } from 'react'
import { useGym } from '../../store/GymContext'
import { fetchGymTrainers } from '../../services/gymPublicService'
import TrainerCard from '../../components/gym/TrainerCard'

export default function GymTrainers() {
  const { gym } = useGym()
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'

  useEffect(() => {
    if (!gym?.id) return
    fetchGymTrainers(gym.id)
      .then(setTrainers)
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          Our Trainers
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Meet the experts who will guide your fitness journey
        </p>
      </div>

      {trainers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No trainers listed yet</h3>
          <p className="text-sm text-gray-500">Check back soon to meet our team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((t) => (
            <TrainerCard key={t.id} trainer={t} themeColor={themeColor} />
          ))}
        </div>
      )}
    </div>
  )
}
