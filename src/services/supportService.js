import { supabaseData as supabase } from './supabaseClient'
import imageCompression from 'browser-image-compression'

const BUCKET = 'gym-images'

// ─── FAQ reads ─────────────────────────────────────────────────────────────────

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('support_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchPopularFaqs(limit = 8) {
  const { data, error } = await supabase
    .from('support_faqs')
    .select('*, category:support_categories(slug, name, icon)')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('view_count', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function fetchAllFaqs() {
  const { data, error } = await supabase
    .from('support_faqs')
    .select('*, category:support_categories(slug, name, icon)')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchFaqsByCategory(categoryId) {
  const { data, error } = await supabase
    .from('support_faqs')
    .select('*, category:support_categories(slug, name, icon)')
    .eq('category_id', categoryId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchFaqCategoryCounts() {
  const { data, error } = await supabase
    .from('support_faqs')
    .select('category_id')
    .eq('is_published', true)
  if (error) throw error
  const counts = {}
  for (const row of data || []) {
    counts[row.category_id] = (counts[row.category_id] || 0) + 1
  }
  return counts
}

export function incrementFaqView(faqId) {
  // Fire-and-forget — don't block the UI
  supabase.rpc('increment_faq_view', { p_faq_id: faqId }).then(({ error }) => {
    if (error) console.warn('incrementFaqView failed:', error.message)
  })
}

// ─── Tickets ───────────────────────────────────────────────────────────────────

export async function createTicket({ gymId, userId, email, subject, category, priority, message, screenshotUrl }) {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      gym_id: gymId,
      user_id: userId,
      email,
      subject,
      category,
      priority,
      message,
      screenshot_url: screenshotUrl || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function fetchMyTickets(userId) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

export async function reopenTicket(ticketId) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ─── Screenshot upload ─────────────────────────────────────────────────────────

export async function uploadTicketScreenshot(file, gymId) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    fileType: 'image/webp',
    useWebWorker: true,
  })
  const rand = Math.random().toString(36).slice(2, 7)
  const path = `support/${gymId}/${Date.now()}_${rand}.webp`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/webp' })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
