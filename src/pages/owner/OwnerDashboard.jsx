const stats = [
  { label: 'Total Members', value: '847', change: '+12%', up: true },
  { label: 'Monthly Revenue', value: '₹4.2L', change: '+8%', up: true },
  { label: 'Active Today', value: '156', change: '+5%', up: true },
  { label: 'Expiring Soon', value: '23', change: '-3%', up: false },
]

export default function OwnerDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { text: 'Rahul M. checked in', time: '2 min ago', type: 'checkin' },
              { text: 'Payment received from Anita S.', time: '15 min ago', type: 'payment' },
              { text: 'New member: Dev Kumar', time: '1 hour ago', type: 'new' },
              { text: 'Membership expired: Priya R.', time: '3 hours ago', type: 'expiry' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'checkin' ? 'bg-green-400' :
                    activity.type === 'payment' ? 'bg-blue-400' :
                    activity.type === 'new' ? 'bg-violet-400' : 'bg-amber-400'
                  }`} />
                  <span className="text-sm text-gray-700">{activity.text}</span>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {['Add Member', 'Record Payment', 'Send Reminder', 'View Reports'].map((action) => (
              <button
                key={action}
                className="w-full py-2.5 px-4 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
