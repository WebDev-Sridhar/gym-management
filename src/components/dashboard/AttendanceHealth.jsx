import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtHour(h) {
  if (h == null) return null
  const period = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr} ${period}`
}

/**
 * Attendance Health — today / avg / 7-day shape / utilisation rate. The
 * "chart" is a pure-div 7-bar sparkline (no recharts import — keeps the
 * dashboard light, per §13/§14). Attendance rate is the headline: a low rate
 * predicts churn before payments do (OWNER_DASHBOARD_REDESIGN.md §7).
 */
export default function AttendanceHealth({ attendance }) {
  const navigate = useNavigate()
  if (!attendance) return null

  const { today, avg7d, spark = [], rate, busiestDow, busiestHour } = attendance
  const max = Math.max(...spark, 1)
  const hasData = spark.some(v => v > 0) || today > 0
  const busiest = busiestDow != null && hasData
    ? `${DOW[busiestDow]} · ${fmtHour(busiestHour)}`
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Attendance</h2>
        {busiest && <span className="text-xs text-gray-400">Busiest {busiest}</span>}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{today}</p>
            <p className="text-xs text-gray-400 mt-0.5">today</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{avg7d}</p>
            <p className="text-xs text-gray-400 mt-0.5">avg / day</p>
          </div>
        </div>

        {/* 7-bar sparkline (pure divs) */}
        <button
          onClick={() => navigate('/owner-dashboard/checkin')}
          className="flex items-end gap-1 h-12 cursor-pointer group"
          title="View attendance"
        >
          {spark.map((v, i) => (
            <div
              key={i}
              className={`w-2.5 rounded-sm transition-colors ${i === spark.length - 1 ? 'bg-blue-500' : 'bg-blue-200 group-hover:bg-blue-300'}`}
              style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
            />
          ))}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
        <Activity size={14} className="text-blue-500" strokeWidth={2} />
        {hasData ? (
          <p className="text-xs text-gray-600">
            <span className="font-bold text-gray-900">{rate}%</span> of active members trained in the last 7 days
          </p>
        ) : (
          <p className="text-xs text-gray-400">No check-ins recorded yet — print your QR to get started.</p>
        )}
      </div>
    </div>
  )
}
