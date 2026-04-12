import { useState, useEffect } from 'react'
import { useGym } from '../../store/GymContext'
import { fetchGymPlans } from '../../services/gymPublicService'
import PricingCard from '../../components/gym/PricingCard'

export default function GymPricing() {
  const { gym } = useGym()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  const themeColor = gym?.theme_color || '#8B5CF6'

  useEffect(() => {
    if (!gym?.id) return
    fetchGymPlans(gym.id)
      .then(setPlans)
      .catch(() => setPlans([]))
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
          Membership Plans
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Choose the plan that fits your fitness goals
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No plans available yet</h3>
          <p className="text-sm text-gray-500">Check back soon for membership options.</p>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            plans.length === 1
              ? 'max-w-sm mx-auto'
              : plans.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} themeColor={themeColor} />
          ))}
        </div>
      )}
    </div>
  )
}
