import { useState, useEffect } from 'react'
import { MapPin, Building2, Crown, Edit3, Trash2, TriangleAlert, UserCheck, Users, CreditCard, ScanLine, MessageSquare, Dumbbell, Bell, LifeBuoy } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import { useDialog } from '../../components/ui/Dialog'
import FormModal from '../../components/ui/FormModal'
import { Sk } from '../../components/ui/Skeleton'
import {
  createBranch, updateBranch, deleteBranch, setMainBranch, fetchBranchStats,
  fetchBranchDeleteImpact,
} from '../../services/branchService'
import { canAccess } from '../../lib/featureGates'

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

function BranchForm({ initial, onSave, onCancel, submitLabel }) {
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [slug,    setSlug]    = useState(initial?.slug    ?? '')
  const [city,    setCity]    = useState(initial?.city    ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [phone,   setPhone]   = useState(initial?.phone   ?? '')
  const [email,   setEmail]   = useState(initial?.email   ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Branch name is required')
    setSubmitting(true)
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim() || undefined,
        city: city.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Failed to save branch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Anna Nagar" className={inputCls} autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Slug <span className="text-gray-400 font-normal">(optional — auto from name)</span>
          </label>
          <input
            value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="anna-nagar" className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
          <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit" disabled={submitting}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? 'Saving...' : (submitLabel || 'Save')}
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function BranchesSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={140} /><Sk h={14} w={200} /></div>
        <Sk h={38} w={140} r={10} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <Sk h={20} w="60%" />
            <Sk h={13} w="40%" />
            <Sk h={50} w="100%" r={8} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BranchesPage() {
  const { subscription } = useAuth()
  const dialog = useDialog()
  const { branches, loading, reload, selectedBranchId, selectBranch } = useBranch()
  const { gymId } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deleting, setDeleting]     = useState(null)   // branch row being confirmed for delete
  const [stats, setStats]           = useState({})

  const planName = subscription?.plan_name
  const allowed  = canAccess('multi_branch', planName)

  useEffect(() => {
    if (!gymId || !allowed) return
    fetchBranchStats(gymId).then(setStats).catch(() => setStats({}))
  }, [gymId, allowed, branches.length])

  if (!allowed) {
    return (
      <div className="max-w-[700px] mx-auto bg-white rounded-xl border border-gray-200 p-10 text-center">
        <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Building2 size={24} className="text-indigo-600" strokeWidth={1.8} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Multi-branch is an Enterprise feature</h2>
        <p className="text-sm text-gray-500">
          Run multiple locations under one account — manage members, payments, and analytics per branch.
          Upgrade to Enterprise to unlock branch management.
        </p>
      </div>
    )
  }

  if (loading) return <BranchesSkeleton />

  async function handleCreate(fields) {
    await createBranch({ gymId, ...fields })
    await reload()
    setShowCreate(false)
  }

  async function handleUpdate(fields) {
    await updateBranch(editing.id, fields)
    await reload()
    setEditing(null)
  }

  function handleDelete(branch) {
    // Hard-block when the branch still has active members — they must be
    // moved first. Otherwise open the detailed confirmation modal.
    const count = stats[branch.id]?.members || 0
    if (count > 0) {
      dialog.alert(
        `"${branch.name}" still has ${count} active member${count !== 1 ? 's' : ''}. ` +
        `Move them to another branch before deleting.`
      )
      return
    }
    setDeleting(branch)
  }

  async function confirmDelete(branch) {
    await deleteBranch(branch.id)
    if (selectedBranchId === branch.id) selectBranch('all')
    await reload()
    setDeleting(null)
  }

  async function handleMakeMain(branch) {
    if (!await dialog.confirm(`Make "${branch.name}" the Main branch?`)) return
    try {
      await setMainBranch({ gymId, branchId: branch.id })
      await reload()
    } catch (err) {
      dialog.alert(err.message || 'Failed to change Main branch')
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {branches.length} branch{branches.length !== 1 ? 'es' : ''} · scoped to your organisation
          </p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          {showCreate ? 'Cancel' : '+ New Branch'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Branch</h2>
          <BranchForm onSave={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="Create Branch" />
        </div>
      )}

      {editing && (
        <FormModal title={`Edit "${editing.name}"`} onClose={() => setEditing(null)}>
          <BranchForm
            initial={editing}
            onSave={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        </FormModal>
      )}

      {branches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 size={28} className="text-gray-400 mx-auto mb-3" strokeWidth={1.6} />
          <p className="text-sm text-gray-500">No branches yet — add your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => {
            const s = stats[b.id] || { members: 0, revenue: 0 }
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-indigo-500 shrink-0" strokeWidth={2} />
                      <h3 className="font-semibold text-gray-900 leading-tight truncate">{b.name}</h3>
                    </div>
                    {b.city && <p className="text-xs text-gray-500 mt-1 truncate">{b.city}</p>}
                  </div>
                  {b.is_main && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      <Crown size={10} strokeWidth={2.5} /> Main
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-gray-500">Members</p>
                    <p className="text-gray-900 font-bold text-base mt-0.5">{s.members}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-gray-500">Revenue</p>
                    <p className="text-gray-900 font-bold text-base mt-0.5">
                      ₹{Number(s.revenue).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                  <button
                    onClick={() => setEditing(b)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    <Edit3 size={12} strokeWidth={2} /> Edit
                  </button>
                  {!b.is_main && (
                    <>

                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleDelete(b)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        <Trash2 size={12} strokeWidth={2} /> Delete
                      </button>
                           <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleMakeMain(b)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium cursor-pointer"
                      >
                        <Crown size={12} strokeWidth={2} /> Make Main
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleting && (
        <DeleteBranchModal
          branch={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => confirmDelete(deleting)}
        />
      )}
    </div>
  )
}

// ── Detailed delete confirmation ────────────────────────────────────────────
// Sensitive action — surfaces what gets removed, what survives (with FK
// SET NULL), which trainers become unassigned, and forces the owner to
// retype the branch name before the destructive button enables. Loads the
// impact stats on open via fetchBranchDeleteImpact (best-effort, never blocks).
function DeleteBranchModal({ branch, onCancel, onConfirm }) {
  const [impact, setImpact]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchBranchDeleteImpact(branch.id)
      .then(d => { if (!cancelled) setImpact(d) })
      .catch(() => { if (!cancelled) setImpact(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [branch.id])

  // Case-insensitive, trimmed comparison so accidental whitespace doesn't
  // lock the owner out of a legitimate delete.
  const matchesName = confirmText.trim().toLowerCase() === branch.name.trim().toLowerCase()
  const trainerCount = impact?.trainers ?? 0

  // Items shown in the "what will happen" list — each pulled from the impact
  // counts, all FK-SET-NULL on delete so they survive but go to "Unassigned".
  const historicalRows = [
    { Icon: CreditCard,    label: 'Payments',         count: impact?.payments      ?? 0 },
    { Icon: ScanLine,      label: 'Check-ins',        count: impact?.attendance    ?? 0 },
    { Icon: MessageSquare, label: 'Contact messages', count: impact?.contactMsgs   ?? 0 },
    { Icon: Dumbbell,      label: 'Assigned plans',   count: impact?.assignedPlans ?? 0 },
    { Icon: Bell,          label: 'Notifications',    count: impact?.notifications ?? 0 },
    { Icon: LifeBuoy,      label: 'Support tickets',  count: impact?.supportTickets ?? 0 },
  ].filter(r => r.count > 0)

  async function handleClick() {
    if (!matchesName) return
    setDeleting(true); setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message || 'Failed to delete branch')
      setDeleting(false)
    }
  }

  return (
    <FormModal title="Delete branch" onClose={onCancel} wide>
      <div className="space-y-4">
        {/* Heading banner */}
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <TriangleAlert size={18} className="text-red-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-800 m-0">
              You are about to permanently delete "{branch.name}".
            </p>
            <p className="text-xs text-red-700 mt-1 m-0">
              This action cannot be undone. The branch row is removed and all linked
              historical records get disassociated.
            </p>
          </div>
        </div>

        {/* What WILL happen */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">What will happen</p>
          <ul className="space-y-2 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>The branch row is permanently removed from your organisation.</span>
            </li>
            {trainerCount > 0 && (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  <strong>{trainerCount} trainer{trainerCount !== 1 ? 's' : ''}</strong> pinned here
                  will be unassigned. You'll need to re-pin them to another branch from <em>Trainers</em>.
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                All historical records below stay intact but lose their branch link — they'll appear
                under <em>All branches</em>, not under any specific location.
              </span>
            </li>
          </ul>
        </div>

        {/* Affected historical records grid */}
        {loading ? (
          <div className="bg-gray-50 rounded-xl p-3">
            <Sk h={14} w="40%" />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {Array(6).fill(0).map((_, i) => <Sk key={i} h={42} r={8} />)}
            </div>
          </div>
        ) : historicalRows.length > 0 ? (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Records that will be unlinked
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {historicalRows.map(({ Icon, label, count }) => (
                <div key={label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-2">
                  <Icon size={14} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate m-0">{label}</p>
                    <p className="text-xs font-bold text-gray-900 m-0">{count.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No historical records are linked to this branch.</p>
        )}

        {/* What WON'T happen */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Not affected</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Members are protected — this delete is blocked while any member is still pinned to the branch.
            Org-level settings (plans, programs, website, payment setup) are untouched.
          </p>
        </div>

        {/* Type-to-confirm */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Type <span className="font-mono font-semibold text-gray-900">{branch.name}</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={branch.name}
            autoFocus
            className={inputCls + ' font-mono'}
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClick}
            disabled={!matchesName || deleting}
            className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {deleting ? 'Deleting…' : `Delete "${branch.name}" permanently`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </FormModal>
  )
}
