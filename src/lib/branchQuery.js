/**
 * Apply a branch_id filter to a Supabase query builder.
 *
 * Pass 'all', null, or undefined to leave the query unfiltered (= all branches).
 * Pass a UUID to scope to that single branch.
 *
 * Lets services be branch-aware without breaking callers that haven't been
 * updated — omitting branchId preserves pre-feature behaviour.
 */
export function applyBranchFilter(query, branchId) {
  if (!branchId || branchId === 'all') return query
  return query.eq('branch_id', branchId)
}
