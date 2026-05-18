import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchMembers, createMember, assignPlan, fetchPlans } from '../../services/membershipService'
import { fetchTrainers } from '../../services/trainerService'
import CustomSelect from '../../components/ui/CustomSelect'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'
import MemberDrawer from '../../components/ui/MemberDrawer'
import Pagination from '../../components/ui/Pagination'
import { Sk } from '../../components/ui/Skeleton'

function MembersSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={140} /><Sk h={14} w={180} /></div>
        <Sk h={38} w={120} r={10} />
      </div>
      <div className="flex gap-2">
        {Array(5).fill(0).map((_, i) => <Sk key={i} h={32} w={72} r={20} />)}
      </div>
      <Sk h={38} w={260} r={10} />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex gap-4">
          {['Member','Phone','Plan','Status','Actions'].map(c => <Sk key={c} h={12} w={80} />)}
        </div>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <Sk h={36} w={36} r={99} />
            <div className="flex-1 space-y-1.5"><Sk h={14} w="45%" /><Sk h={11} w="30%" /></div>
            <Sk h={12} w={90} />
            <Sk h={22} w={64} r={20} />
            <Sk h={12} w={60} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MembersPage() {
  const { gymId } = useAuth()
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [filter, setFilter]             = useState('all')
  const [search, setSearch]             = useState('')
  const [drawerMember, setDrawerMember] = useState(null)
  const [page, setPage]                 = useState(1)
  const PAGE_SIZE = 10

  const [newName, setNewName]     = useState('')
  const [newPhone, setNewPhone]   = useState('')
  const [newEmail, setNewEmail]   = useState('')
  const [newPlanId, setNewPlanId] = useState('')
  const [trainers, setTrainers]   = useState([])

  useEffect(() => {
    if (!gymId) { setLoading(false); return }

    setLoading(true)
    let cancelled = false

    Promise.all([fetchMembers(gymId), fetchPlans(gymId), fetchTrainers(gymId)])
      .then(([m, p, t]) => {
        if (cancelled) return
        setMembers(m)
        setPlans(p)
        setTrainers(t)
      })
      .catch((err) => console.error('Failed to load:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId])

  async function handleAddMember(e) {
    e.preventDefault()
    setError('')
    if (!newName.trim()) return setError('Name is required')

    setSubmitting(true)
    try {
      let member = await createMember({
        gymId,
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
      })

      if (newPlanId) {
        const plan = plans.find((p) => p.id === newPlanId)
        if (plan) {
          member = await assignPlan({ memberId: member.id, planId: plan.id, durationDays: plan.duration_days })
        }
      }

      setMembers((prev) => [member, ...prev])
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewPlanId('')
      setShowAddForm(false)
    } catch (err) {
      setError(err.message || 'Failed to add member')
    } finally {
      setSubmitting(false)
    }
  }

  function getMemberStatus(member) {
    if (!member.plan_id) return 'inactive'
    if (!member.expiry_date) return member.status || 'inactive'
    const today = new Date().toISOString().split('T')[0]
    if (member.expiry_date < today) return 'expired'
    return member.status || 'active'
  }

  function daysLeft(expiryDate) {
    if (!expiryDate) return null
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const filteredMembers = members.filter((m) => {
    if (filter !== 'all' && getMemberStatus(m) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (m.name || '').toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.email || '').toLowerCase().includes(q)
    }
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const counts = {
    all: members.length,
    active: members.filter((m) => getMemberStatus(m) === 'active').length,
    expired: members.filter((m) => getMemberStatus(m) === 'expired').length,
    inactive: members.filter((m) => getMemberStatus(m) === 'inactive').length,
  }

  if (loading) return <MembersSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <BannerSlot pageKey="members" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} total member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setNewPlanId('') }}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          {showAddForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" maxLength={10} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email address" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plan <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <CustomSelect
                  value={newPlanId}
                  onChange={setNewPlanId}
                  placeholder="Assign a plan..."
                  options={plans.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ₹${Number(p.price).toLocaleString('en-IN')} / ${p.duration_days}d`,
                  }))}
                />
              </div>
            </div>
            {error && !editingId && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2">
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['all', 'active', 'expired', 'inactive']).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search members..." className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64" />
      </div>

      {/* Members table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {filter === 'all' && !search ? 'No members yet' : 'No matching members'}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'all' && !search ? 'Add your first member to get started.' : 'Try a different filter or search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedMembers.map((member) => {
                  const status    = getMemberStatus(member)
                  const remaining = daysLeft(member.expiry_date)
                  return (
                    <tr key={member.id}
                      onClick={() => setDrawerMember(member)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-400">{member.phone || member.email || 'No contact'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {member.plan
                          ? <span className="text-sm text-gray-700">{member.plan.name}</span>
                          : <span className="text-xs text-gray-400">No plan</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === 'active'  ? 'bg-green-50 text-green-700' :
                          status === 'expired' ? 'bg-red-50 text-red-700'    :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {member.expiry_date ? (
                          <div>
                            <p className="text-sm text-gray-700">{new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            {remaining !== null && remaining > 0 && remaining <= 7 && (
                              <p className="text-xs text-amber-600 font-medium">{remaining} day{remaining !== 1 ? 's' : ''} left</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">\u2014</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} totalPages={totalPages} total={filteredMembers.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      {drawerMember && (
        <MemberDrawer
          member={drawerMember}
          gymId={gymId}
          plans={plans}
          trainers={trainers}
          defaultTab="Info"
          onClose={() => setDrawerMember(null)}
          onUpdated={updated => setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))}
          onDeleted={id => setMembers(prev => prev.filter(m => m.id !== id))}
        />
      )}
    </div>
  )
}
