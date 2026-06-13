import { motion } from 'framer-motion'

// Light-theme phone-frame mockup showing a mock member-app screen.
export default function MobileMockup({ className = '' }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
      className={`relative w-full max-w-[260px] ${className}`}
    >
      <div className="absolute -inset-6 bg-violet-100/60 blur-3xl rounded-full" />

      <div className="relative bg-white border border-gray-100 rounded-[2rem] shadow-2xl shadow-gray-200/80 p-2.5">
        {/* Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-5 w-24 bg-gray-900 rounded-full z-10" />

        <div className="rounded-[1.5rem] overflow-hidden bg-gray-50 aspect-[9/19] flex flex-col">
          {/* Status bar spacer */}
          <div className="h-8" />

          <div className="px-4 pb-4 flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-semibold text-sm">Hi, Rahul 👋</span>
              <div className="w-7 h-7 rounded-full bg-indigo-500" />
            </div>

            {/* Membership card */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-3 text-white shadow-lg shadow-indigo-200">
              <span className="text-[10px] uppercase tracking-wider text-indigo-100">Membership</span>
              <div className="text-sm font-semibold mt-1">Pro Plan · Active</div>
              <div className="text-[10px] text-indigo-100 mt-2">Valid until 28 Dec 2026</div>
            </div>

            {/* Check-in button */}
            <div className="rounded-xl bg-white border border-gray-100 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-gray-900 text-xs font-semibold">Check in</div>
                <div className="text-gray-400 text-[10px]">QR scan at gate</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <div className="w-4 h-4 rounded-sm border-2 border-emerald-500" />
              </div>
            </div>

            {/* Schedule list */}
            <div className="rounded-xl bg-white border border-gray-100 p-3 shadow-sm flex-1">
              <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider">Today's Schedule</span>
              <div className="mt-2 space-y-2">
                {[
                  { time: '6:00 AM', label: 'Strength Training' },
                  { time: '5:30 PM', label: 'HIIT with Coach Dev' },
                ].map((item) => (
                  <div key={item.time} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-gray-700 text-[11px]">{item.label}</span>
                    <span className="text-gray-400 text-[10px] ml-auto">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
