import { motion } from 'framer-motion'

function StatTile({ label, value, trend }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex flex-col gap-1">
      <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-gray-900 font-bold text-lg">{value}</span>
        <span className="text-[10px] font-semibold text-emerald-500">{trend}</span>
      </div>
    </div>
  )
}

function MiniBarChart() {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88]
  return (
    <div className="flex items-end gap-[3px] h-16">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${height}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
          className="w-2 rounded-t-sm bg-gradient-to-t from-indigo-500 to-violet-400"
        />
      ))}
    </div>
  )
}

function MemberRow({ name, initials, status, color }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center`}>
          <span className="text-white text-[9px] font-bold">{initials}</span>
        </div>
        <span className="text-gray-600 text-xs">{name}</span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
        status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
      }`}>
        {status}
      </span>
    </div>
  )
}

// Light-theme "fake dashboard" used as the hero/showcase product visual.
export default function DashboardMockup({ className = '' }) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      className={`relative w-full max-w-lg ${className}`}
    >
      <div className="absolute -inset-8 bg-indigo-100/60 blur-3xl rounded-full" />

      <div className="relative bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl overflow-hidden shadow-2xl shadow-gray-200/80">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-gray-400 text-[10px] ml-2 font-medium">Gymmobius Dashboard</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Members" value="847" trend="+12%" />
            <StatTile label="Revenue" value="₹4.2L" trend="+8%" />
            <StatTile label="Attendance" value="92%" trend="+3%" />
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-xs font-medium">Monthly Revenue</span>
              <span className="text-gray-400 text-[10px]">Last 12 months</span>
            </div>
            <MiniBarChart />
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <span className="text-gray-600 text-xs font-medium">Recent Check-ins</span>
            <div className="mt-2 divide-y divide-gray-100">
              <MemberRow name="Rahul M." initials="RM" status="Active" color="bg-indigo-500" />
              <MemberRow name="Anita S." initials="AS" status="Active" color="bg-violet-500" />
              <MemberRow name="Dev K." initials="DK" status="Expiring" color="bg-sky-500" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
