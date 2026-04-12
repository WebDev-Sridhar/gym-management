export default function MemberApp() {
  return (
    <div className="space-y-6">
      {/* Membership Card */}
      <div className="bg-gradient-to-br from-violet-600 to-blue-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-violet-100 text-sm">Member since Jan 2025</p>
            <h2 className="text-xl font-bold mt-1">Rahul Mehta</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">RM</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <p className="text-violet-100 text-xs">Plan</p>
            <p className="font-semibold">Pro - 3 Months</p>
          </div>
          <div className="text-right">
            <p className="text-violet-100 text-xs">Expires</p>
            <p className="font-semibold">Apr 30, 2026</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">18</p>
          <p className="text-xs text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">142</p>
          <p className="text-xs text-gray-500 mt-1">Total Visits</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-violet-600">🔥 5</p>
          <p className="text-xs text-gray-500 mt-1">Day Streak</p>
        </div>
      </div>

      {/* Today's Workout */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Today's Workout</h3>
        <div className="space-y-3">
          {[
            { name: 'Bench Press', sets: '4x12', done: true },
            { name: 'Incline Dumbbell', sets: '3x10', done: true },
            { name: 'Cable Flyes', sets: '3x15', done: false },
            { name: 'Tricep Pushdown', sets: '3x12', done: false },
          ].map((exercise) => (
            <div key={exercise.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  exercise.done ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
                }`}>
                  {exercise.done && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${exercise.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {exercise.name}
                </span>
              </div>
              <span className="text-xs text-gray-400">{exercise.sets}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
