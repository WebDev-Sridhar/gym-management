import { motion } from 'framer-motion'

function StatCard({ label, value, trend, color }) {
  return (
    <div className="bg-surface/80 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-text-muted text-[10px] uppercase tracking-wider">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-text-primary font-bold text-lg">{value}</span>
        <span className={`text-[10px] font-medium ${color}`}>{trend}</span>
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
          animate={{ height: `${height}%` }}
          transition={{ delay: 0.8 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
          className="w-2 rounded-t-sm bg-gradient-to-t from-accent-purple to-accent-blue opacity-80"
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
        <span className="text-text-secondary text-xs">{name}</span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
        status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
      }`}>
        {status}
      </span>
    </div>
  )
}

export default function FloatingMockup() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      className="relative w-full max-w-lg"
    >
      {/* Glow behind mockup */}
      <div className="absolute -inset-8 bg-accent-purple/10 blur-3xl rounded-full" />

      {/* Dashboard container */}
      <div className="relative bg-bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-2xl">
        {/* Title Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-text-muted text-[10px] ml-2 font-medium">Gymmobius Dashboard</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Members" value="847" trend="+12%" color="text-green-400" />
            <StatCard label="Revenue" value="₹4.2L" trend="+8%" color="text-green-400" />
            <StatCard label="Attendance" value="92%" trend="+3%" color="text-accent-cyan" />
          </div>

          {/* Chart Area */}
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-secondary text-xs font-medium">Monthly Revenue</span>
              <span className="text-text-muted text-[10px]">Last 12 months</span>
            </div>
            <MiniBarChart />
          </div>

          {/* Recent Members */}
          <div className="bg-surface/50 rounded-lg p-3">
            <span className="text-text-secondary text-xs font-medium">Recent Check-ins</span>
            <div className="mt-2 divide-y divide-border/30">
              <MemberRow name="Rahul M." initials="RM" status="Active" color="bg-accent-purple" />
              <MemberRow name="Anita S." initials="AS" status="Active" color="bg-accent-blue" />
              <MemberRow name="Dev K." initials="DK" status="Expiring" color="bg-accent-cyan" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
