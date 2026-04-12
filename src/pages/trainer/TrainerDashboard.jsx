const assignedMembers = [
  { name: 'Rahul Mehta', plan: 'Strength', status: 'Active', lastSeen: 'Today' },
  { name: 'Anita Sharma', plan: 'Cardio', status: 'Active', lastSeen: 'Today' },
  { name: 'Dev Kumar', plan: 'Weight Loss', status: 'Active', lastSeen: 'Yesterday' },
  { name: 'Priya Reddy', plan: 'General', status: 'Inactive', lastSeen: '5 days ago' },
]

export default function TrainerDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Assigned Members</p>
          <span className="text-2xl font-bold text-gray-900">24</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Active Today</p>
          <span className="text-2xl font-bold text-gray-900">8</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Sessions This Week</p>
          <span className="text-2xl font-bold text-gray-900">18</span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Your Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Member</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignedMembers.map((member) => (
                <tr key={member.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{member.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.plan}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      member.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
