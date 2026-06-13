import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import SectionContainer, { Eyebrow } from '../ui/SectionContainer'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../ui/ScrollReveal'
import Button from '../ui/Button'
import { PRICING_PLANS } from '../../lib/constants'
import { ROUTES } from '../../lib/constants/routes'

// Yearly = ~2 months free (≈17% off), shown alongside the monthly price.
function yearlyPrice(monthlyPrice) {
  const numeric = Number(monthlyPrice.replace(/[^0-9]/g, ''))
  const yearly = Math.round((numeric * 10) / 12)
  return `₹${yearly.toLocaleString('en-IN')}`
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <SectionContainer background="gray" id="pricing">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>Simple pricing</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Plans that grow with your gym
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
            One subscription covers your dashboard, member app, trainer accounts, automated reminders, and unlimited check-ins.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal variant={fadeUp} className="flex items-center justify-center gap-4 mb-12">
        <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
        <button
          onClick={() => setYearly((y) => !y)}
          className="relative w-14 h-8 rounded-full transition-colors duration-300"
          style={{ backgroundColor: yearly ? '#6366f1' : '#e5e7eb' }}
          aria-label="Toggle yearly pricing"
        >
          <motion.span
            className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
            animate={{ x: yearly ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </button>
        <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
          Yearly <span className="text-emerald-500 font-semibold">save ~17%</span>
        </span>
      </ScrollReveal>

      <StaggerGroup className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {PRICING_PLANS.map((plan) => (
          <StaggerItem
            key={plan.name}
            variant={scaleIn}
            className={`relative rounded-3xl p-8 border ${
              plan.highlighted
                ? 'bg-gray-900 border-gray-900 text-white shadow-2xl shadow-gray-400/30 lg:scale-105'
                : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold px-4 py-1 shadow-lg">
                Most Popular
              </span>
            )}

            <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
            <p className={`mt-2 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{plan.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <motion.span
                key={yearly ? 'yearly' : 'monthly'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}
              >
                {yearly ? yearlyPrice(plan.price) : plan.price}
              </motion.span>
              <span className={`text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-400'}`}>
                {yearly ? '/month, billed yearly' : plan.period}
              </span>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className={`flex items-start gap-3 text-sm ${plan.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    plan.highlighted ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-500'
                  }`}>
                    <Check size={12} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link to={plan.cta === 'Talk to sales' ? ROUTES.CONTACT : ROUTES.AUTH.SIGNUP} className="block mt-8">
              <Button
                size="lg"
                variant={plan.highlighted ? 'primary' : 'secondary'}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </SectionContainer>
  )
}
