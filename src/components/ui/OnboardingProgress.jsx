const STEPS = [
  { label: 'Sign Up', path: '/signup' },
  { label: 'Create Gym', path: '/create-gym' },
  { label: 'Quick Setup', path: '/onboarding' },
  { label: 'Activate', path: '/billing' },
]

export default function OnboardingProgress({ currentStep }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-10">
      {/* Step indicators */}
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isActive = stepNum === currentStep

          return (
            <div key={step.label} className="flex flex-col items-center relative z-10">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isCompleted
                    ? 'bg-gradient-to-br from-violet-600 to-blue-500 text-white'
                    : isActive
                      ? 'bg-white border-2 border-violet-600 text-violet-600 shadow-md shadow-violet-200'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium transition-colors
                  ${isActive ? 'text-violet-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
