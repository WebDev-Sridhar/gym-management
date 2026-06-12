import { supabaseData as supabase } from './supabaseClient'

// ─── Per-gym legal pages (gym_legal_pages table) ──────────────────────────────
// One row per (gym, page_key). A page with NO row falls back to the hardcoded
// default and is shown (enabled by default). A row lets the owner customise the
// title/intro/sections and/or turn the page off (enabled=false).

const COLS = 'id, page_key, enabled, title, intro, sections, updated_at'

/** Owner: every legal row for the gym (used by the CMS editor). */
export async function fetchLegalPages(gymId) {
  const { data, error } = await supabase
    .from('gym_legal_pages')
    .select(COLS)
    .eq('gym_id', gymId)
  if (error) throw error
  return data || []
}

/** Public: rows for a gym (enabled + disabled — content is public, and the
 *  footer needs to know which pages are switched off). */
export async function fetchPublicLegalRows(gymId) {
  const { data, error } = await supabase
    .from('gym_legal_pages')
    .select(COLS)
    .eq('gym_id', gymId)
  if (error) throw error
  return data || []
}

/** Create or update one page's row. */
export async function upsertLegalPage(gymId, pageKey, fields) {
  const { data, error } = await supabase
    .from('gym_legal_pages')
    .upsert(
      { gym_id: gymId, page_key: pageKey, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'gym_id,page_key' },
    )
    .select(COLS)
    .single()
  if (error) throw error
  return data
}

/** Toggle a page on/off WITHOUT touching its content. The upsert only writes
 *  the `enabled` flag, so any custom title/intro/sections are preserved; if no
 *  row exists yet, a minimal one is created (content still falls back to the
 *  default while enabled). */
export async function setLegalEnabled(gymId, pageKey, enabled) {
  const { data, error } = await supabase
    .from('gym_legal_pages')
    .upsert(
      { gym_id: gymId, page_key: pageKey, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'gym_id,page_key' },
    )
    .select(COLS)
    .single()
  if (error) throw error
  return data
}

/** Delete the row so the page reverts to the hardcoded default. */
export async function resetLegalPage(gymId, pageKey) {
  const { error } = await supabase
    .from('gym_legal_pages')
    .delete()
    .eq('gym_id', gymId)
    .eq('page_key', pageKey)
  if (error) throw error
}
