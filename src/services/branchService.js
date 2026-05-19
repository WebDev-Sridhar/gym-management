import { supabaseData as supabase } from './supabaseClient'

/**
 * Branch CRUD for the Enterprise multi-branch feature.
 *
 * Branches are scoped to a gym (the organisation). Starter / Pro gyms have
 * exactly one branch (the auto-created "Main") and never see this surface;
 * Enterprise gyms can create/rename/move/delete branches freely.
 */

export async function fetchBranches(gymId) {
  if (!gymId) return []
  const { data, error } = await supabase
    .from('gym_branches')
    .select('id, gym_id, name, slug, city, address, phone, email, is_main, created_at, updated_at')
    .eq('gym_id', gymId)
    .order('is_main', { ascending: false })
    .order('name',    { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchBranch(branchId) {
  const { data, error } = await supabase
    .from('gym_branches')
    .select('*')
    .eq('id', branchId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createBranch({ gymId, name, slug, city, address, phone, email }) {
  if (!gymId) throw new Error('gymId is required')
  if (!name?.trim()) throw new Error('Branch name is required')
  const cleanSlug = (slug || name).toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!cleanSlug) throw new Error('Could not derive a slug from the branch name')

  const { data, error } = await supabase
    .from('gym_branches')
    .insert({
      gym_id:  gymId,
      name:    name.trim(),
      slug:    cleanSlug,
      city:    city?.trim()    || null,
      address: address?.trim() || null,
      phone:   phone?.trim()   || null,
      email:   email?.trim()   || null,
      is_main: false,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
      throw new Error(`A branch with slug "${cleanSlug}" already exists in this gym.`)
    }
    throw error
  }
  return data
}

export async function updateBranch(branchId, fields) {
  const updates = {}
  if (fields.name    !== undefined) updates.name    = fields.name?.trim()    || null
  if (fields.city    !== undefined) updates.city    = fields.city?.trim()    || null
  if (fields.address !== undefined) updates.address = fields.address?.trim() || null
  if (fields.phone   !== undefined) updates.phone   = fields.phone?.trim()   || null
  if (fields.email   !== undefined) updates.email   = fields.email?.trim()   || null
  if (fields.slug    !== undefined) {
    const s = fields.slug.toString().toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (!s) throw new Error('Invalid slug')
    updates.slug = s
  }

  const { data, error } = await supabase
    .from('gym_branches')
    .update(updates)
    .eq('id', branchId)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
      throw new Error('Another branch already uses that slug.')
    }
    throw error
  }
  return data
}

/**
 * Delete a branch. Refuses if any active (non-deleted) members are still
 * pinned to it — owner must move them first.
 */
export async function deleteBranch(branchId) {
  const { data: branch, error: brErr } = await supabase
    .from('gym_branches').select('id, is_main').eq('id', branchId).single()
  if (brErr) throw brErr
  if (branch?.is_main) {
    throw new Error('You can\'t delete the Main branch. Promote another branch to Main first.')
  }

  const { count: memberCount, error: memErr } = await supabase
    .from('members').select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId).is('deleted_at', null)
  if (memErr) throw memErr
  if ((memberCount || 0) > 0) {
    throw new Error(
      `This branch still has ${memberCount} active member${memberCount !== 1 ? 's' : ''}. ` +
      `Move them to another branch before deleting.`
    )
  }

  const { error } = await supabase.from('gym_branches').delete().eq('id', branchId)
  if (error) throw error
}

/**
 * Atomically promote a branch to be the Main branch for its gym. There can
 * only be one Main per gym (enforced by partial unique index).
 *
 * Implemented as two updates in a transaction-like sequence: clear the
 * current Main, then set the new one. If the second update fails, we restore
 * the old Main so the gym never ends up without one.
 */
export async function setMainBranch({ gymId, branchId }) {
  if (!gymId || !branchId) throw new Error('gymId + branchId required')

  const { data: currentMain } = await supabase
    .from('gym_branches').select('id').eq('gym_id', gymId).eq('is_main', true).maybeSingle()

  if (currentMain?.id === branchId) return  // already main

  if (currentMain?.id) {
    const { error: clearErr } = await supabase
      .from('gym_branches').update({ is_main: false }).eq('id', currentMain.id)
    if (clearErr) throw clearErr
  }

  const { error: setErr } = await supabase
    .from('gym_branches').update({ is_main: true }).eq('id', branchId)

  if (setErr) {
    // Restore previous Main so gym isn't left with none
    if (currentMain?.id) {
      await supabase.from('gym_branches').update({ is_main: true }).eq('id', currentMain.id)
    }
    throw setErr
  }
}

/**
 * One-off "what will deleting this branch affect" report, fetched on demand
 * when the owner opens the delete confirmation modal. Stats are best-effort
 * — any failed sub-query returns 0 rather than failing the whole report.
 *
 * All affected rows survive the delete (FKs are ON DELETE SET NULL) — these
 * counts just describe what gets disassociated from the branch.
 */
export async function fetchBranchDeleteImpact(branchId) {
  if (!branchId) return null
  const head = { count: 'exact', head: true }

  async function n(query) {
    try { const { count } = await query; return count || 0 } catch { return 0 }
  }

  const [trainers, members, payments, attendance, contactMsgs, assignedPlans, supportTickets, notifications, reminders, trainerInvites] = await Promise.all([
    n(supabase.from('users').select('id', head).eq('branch_id', branchId).eq('role', 'trainer')),
    n(supabase.from('members').select('id', head).eq('branch_id', branchId).is('deleted_at', null)),
    n(supabase.from('payments').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('attendance').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('contact_messages').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('assigned_plans').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('support_tickets').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('notifications').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('payment_reminders').select('id', head).eq('branch_id', branchId)),
    n(supabase.from('trainer_invites').select('id', head).eq('branch_id', branchId)),
  ])

  return { trainers, members, payments, attendance, contactMsgs, assignedPlans, supportTickets, notifications, reminders, trainerInvites }
}

/**
 * Per-branch summary stats: active member count + total paid revenue.
 * Used to render context on the BranchesPage cards.
 */
export async function fetchBranchStats(gymId) {
  if (!gymId) return {}
  const [{ data: members }, { data: payments }] = await Promise.all([
    supabase.from('members')
      .select('branch_id')
      .eq('gym_id', gymId)
      .is('deleted_at', null),
    supabase.from('payments')
      .select('branch_id, amount')
      .eq('gym_id', gymId)
      .eq('status', 'paid'),
  ])

  const stats = {}
  for (const m of members || []) {
    const k = m.branch_id ?? '__unbranched__'
    stats[k] = stats[k] || { members: 0, revenue: 0 }
    stats[k].members += 1
  }
  for (const p of payments || []) {
    const k = p.branch_id ?? '__unbranched__'
    stats[k] = stats[k] || { members: 0, revenue: 0 }
    stats[k].revenue += Number(p.amount || 0)
  }
  return stats
}
