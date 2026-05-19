import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import { fetchTrainerInvites, createTrainerInvite, deleteTrainerInvite } from '../../services/membershipService'
import { fetchTrainers, updateTrainer, removeTrainer } from '../../services/trainerService'
import { useDialog } from '../../components/ui/Dialog'
import CustomSelect from '../../components/ui/CustomSelect'
import { Sk } from '../../components/ui/Skeleton'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'

function TrainersSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={130} /><Sk h={14} w={200} /></div>
        <Sk h={38} w={120} r={10} />
      </div>
      <div>
        <Sk h={13} w={120} r={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Sk h={40} w={40} r={99} />
                <div className="flex-1 space-y-1.5"><Sk h={14} w="60%" /><Sk h={11} w="75%" /></div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <Sk h={22} w={64} r={20} />
                <div className="flex gap-3"><Sk h={12} w={28} /><Sk h={12} w={44} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TrainersPage() {
  const dialog = useDialog()
  const { gymId } = useAuth()
  const { selectedBranchId, branches, isAllBranches } = useBranch()

  const [trainers, setTrainers]   = useState([])   // active: from users table
  const [invites, setInvites]     = useState([])   // pending: from trainer_invites WHERE claimed=false
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [branchId, setBranchId] = useState('')

  useEffect(() => {
    if (!showForm) return
    if (branchId) return
    if (!isAllBranches) setBranchId(selectedBranchId)
    else if (branches.length > 0) setBranchId(branches.find(b => b.is_main)?.id || branches[0].id)
  }, [showForm, isAllBranches, selectedBranchId, branches, branchId])

  // Edit active trainer
  const [editingTrainer, setEditingTrainer] = useState(null) // { id, name, phone, email }
  const [editName, setEditName]   = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function openEdit(trainer) {
    setEditingTrainer(trainer)
    setEditName(trainer.name || '')
    setEditPhone(trainer.phone || '')
    setEditError('')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editName.trim()) { setEditError('Name is required'); return }
    setEditSaving(true); setEditError('')
    try {
      const updated = await updateTrainer(editingTrainer.id, { name: editName.trim(), phone: editPhone.trim() })
      const merged = updated ?? { ...editingTrainer, name: editName.trim(), phone: editPhone.trim() || null }
      setTrainers(prev => prev.map(t => t.id === merged.id ? merged : t))
      setEditingTrainer(null)
    } catch (err) {
      setEditError(err.message || 'Failed to save')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleRemove(trainer) {
    if (!await dialog.confirm(`Remove ${trainer.name} as a trainer? They will lose access to the trainer dashboard.`)) return
    try {
      await removeTrainer(trainer.id)
      setTrainers(prev => prev.filter(t => t.id !== trainer.id))
    } catch (err) {
      dialog.alert(err.message || 'Failed to remove trainer')
    }
  }

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchTrainers(gymId, selectedBranchId),
      fetchTrainerInvites(gymId, selectedBranchId),
    ])
      .then(([t, inv]) => {
        if (cancelled) return
        setTrainers(t)
        // Only show unclaimed invites as "pending"
        setInvites(inv.filter(i => !i.claimed))
      })
      .catch(err => console.error('Failed to load trainers:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId, selectedBranchId])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Trainer name is required')
    if (!email.trim()) return setError('Login email is required so the trainer can sign in')

    setSubmitting(true)
    try {
      const invite = await createTrainerInvite({
        gymId,
        branchId: branchId || (isAllBranches ? null : selectedBranchId),
        name: name.trim(), phone: phone.trim(), email: email.trim(),
      })
      setInvites(prev => [invite, ...prev])
      setName(''); setPhone(''); setEmail(''); setBranchId('')
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Failed to add trainer')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteInvite(inviteId) {
    if (!await dialog.confirm('Remove this pending invite?')) return
    try {
      await deleteTrainerInvite(inviteId)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch (err) {
      dialog.alert(err.message || 'Failed to remove invite')
    }
  }

  if (loading) return <TrainersSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <BannerSlot pageKey="trainers" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trainers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {trainers.length} active · {invites.length} pending invite{invites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError('') }}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          {showForm ? 'Cancel' : '+ Add Trainer'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Invite Trainer</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Trainer name" autoFocus
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number" maxLength={10}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Login Email * <span className="text-gray-400 font-normal">(trainer uses this to sign in)</span>
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="trainer@email.com"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">The trainer signs up at your gym's login page with this email — their account is automatically set up.</p>
              </div>
              {branches.length > 1 && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={branchId}
                    onChange={setBranchId}
                    placeholder="Choose branch..."
                    options={branches.map(b => ({
                      value: b.id,
                      label: b.is_main ? `${b.name} · Main` : (b.city ? `${b.name} · ${b.city}` : b.name),
                    }))}
                  />
                </div>
              )}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50">
              {submitting ? 'Adding...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Active trainers */}
      {trainers.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Active Trainers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map(trainer => (
              <div key={trainer.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">

                {editingTrainer?.id === trainer.id ? (
                  /* ── Inline edit form ── */
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Edit Trainer</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={10} placeholder="Phone number"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-sm text-gray-400 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 truncate">{trainer.email}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Email is the login — cannot be changed here</p>
                    </div>
                    {editError && <p className="text-red-500 text-xs">{editError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={editSaving}
                        className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50">
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditingTrainer(null)}
                        className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── View mode ── */
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                        {trainer.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{trainer.name}</h3>
                        <p className="text-xs text-gray-400 truncate">{trainer.email || trainer.phone || 'No contact'}</p>
                        {trainer.phone && trainer.email && (
                          <p className="text-xs text-gray-400 truncate">{trainer.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(trainer)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer transition-colors">
                          Edit
                        </button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => handleRemove(trainer)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Pending Invites</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map(invite => (
              <div key={invite.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-semibold text-sm shrink-0">
                    {invite.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{invite.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{invite.email || invite.phone || 'No contact'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Awaiting signup
                  </span>
                  <button onClick={() => handleDeleteInvite(invite.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {trainers.length === 0 && invites.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No trainers yet</h3>
          <p className="text-sm text-gray-500 mb-4">Add a trainer's email — they sign up at your gym's login page and are automatically activated.</p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer">
            + Add First Trainer
          </button>
        </div>
      )}
    </div>
  )
}
