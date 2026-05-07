import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchGymWorkoutTemplates, fetchGymDietTemplates, fetchAssignedMembers, assignPlanToMember } from '../../services/trainerService'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function AssignModal({ template, planType, members, gymId, onClose, onAssigned }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const days      = template.exercises ?? template.meals ?? []
  const itemKey   = planType === 'workout' ? 'exercises' : 'meals'
  const filtered  = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  async function handleAssign() {
    if (!selected) { setError('Select a member'); return }
    setSaving(true); setError('')
    try {
      await assignPlanToMember({ gymId, memberId: selected.id, planType, title: template.title, data: days })
      onAssigned(selected.name)
    } catch (err) {
      setError(err.message || 'Failed to assign')
      setSaving(false)
    }
  }

  return (
    <FormModal title={`Assign — ${template.title}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Weekly preview */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Weekly Plan Preview</p>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const count = (d[itemKey] || []).length
              return (
                <div key={i} className={`rounded-lg p-2 text-center ${d.rest ? 'bg-white' : count > 0 ? 'bg-violet-50 border border-violet-100' : 'bg-white border border-dashed border-gray-200'}`}>
                  <p className="text-[10px] font-bold text-gray-500">{DAY_ABBR[i] || `D${d.day}`}</p>
                  {d.rest ? (
                    <p className="text-[9px] text-gray-300 mt-1">Rest</p>
                  ) : (
                    <p className="text-[10px] font-semibold text-violet-600 mt-1">{count}</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="space-y-1 pt-1">
            {days.filter(d => !d.rest).slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-14 font-semibold text-gray-500 shrink-0">{d.name?.slice(0, 10) || `Day ${d.day}`}</span>
                <span className="text-gray-400">{(d[itemKey] || []).slice(0, 2).map(x => planType === 'workout' ? x.name : x.meal_name).join(', ')}{(d[itemKey] || []).length > 2 ? '…' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Member picker */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign to Member</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member…" autoFocus
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500 mb-2" />
          <div className="max-h-44 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No members</p>
            ) : filtered.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer border transition-all ${selected?.id === m.id ? 'bg-violet-50 border-violet-200' : 'hover:bg-gray-50 border-transparent'}`}>
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate flex-1">{m.name}</p>
                {selected?.id === m.id && <svg className="w-4 h-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={handleAssign} disabled={saving || !selected}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer">
            {saving ? 'Assigning…' : selected ? `Assign to ${selected.name}` : 'Select a member'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer">Cancel</button>
        </div>
      </div>
    </FormModal>
  )
}

export default function TrainerWorkoutsPage() {
  const { gymId, user } = useAuth()
  const dialog = useDialog()
  const [tab, setTab]             = useState('workout')
  const [wTemplates, setWT]       = useState([])
  const [dTemplates, setDT]       = useState([])
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [assigning, setAssigning] = useState(null)

  useEffect(() => {
    if (!gymId || !user) { setLoading(false); return }
    let dead = false
    Promise.all([fetchGymWorkoutTemplates(gymId), fetchGymDietTemplates(gymId), fetchAssignedMembers(gymId, user.id)])
      .then(([w, d, m]) => { if (!dead) { setWT(w); setDT(d); setMembers(m) } })
      .catch(err => console.error(err))
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [gymId, user])

  const templates = tab === 'workout' ? wTemplates : dTemplates
  const itemKey   = tab === 'workout' ? 'exercises' : 'meals'

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Assign Plans</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign weekly workout and diet templates to your members.</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[['workout', 'Workouts'], ['diet', 'Diet Plans']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${tab === v ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l} <span className="text-xs font-normal text-gray-400 ml-1">{v === 'workout' ? wTemplates.length : dTemplates.length}</span>
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
          <p className="text-sm text-gray-500">No {tab} templates in this gym.</p>
          <p className="text-xs text-gray-400 mt-1">Ask your gym owner to create weekly templates in the Programs section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => {
            const days = (t.exercises ?? t.meals) || []
            const activeDays = days.filter(d => !d.rest)
            const total = days.reduce((sum, d) => sum + (d[itemKey] || []).length, 0)
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 truncate">{t.title}</p>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${tab === 'workout' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {tab === 'workout' ? 'Workout' : 'Diet'}
                  </span>
                </div>
                {t.description && <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{activeDays.length} training days</span>
                  <span>·</span>
                  <span>{total} {tab === 'workout' ? 'exercises' : 'meals'}</span>
                </div>
                {/* Day pills */}
                <div className="flex gap-1 flex-wrap">
                  {days.map((d, i) => (
                    <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.rest ? 'bg-gray-100 text-gray-400' : 'bg-violet-50 text-violet-600'}`}>
                      {d.name?.slice(0, 3) || DAY_ABBR[i]}
                    </span>
                  ))}
                </div>
                <button onClick={() => setAssigning(t)}
                  className="mt-auto w-full py-2 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 cursor-pointer transition-colors">
                  Assign to Member
                </button>
              </div>
            )
          })}
        </div>
      )}

      {assigning && (
        <AssignModal template={assigning} planType={tab} members={members} gymId={gymId}
          onClose={() => setAssigning(null)}
          onAssigned={async name => { setAssigning(null); await dialog.alert(`Weekly plan assigned to ${name}.`) }} />
      )}
    </div>
  )
}
