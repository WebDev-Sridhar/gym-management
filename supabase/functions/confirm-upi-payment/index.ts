// POST /functions/v1/confirm-upi-payment
// Body: { token }
// Public (no JWT). Members tap "I Paid" on the public /pay/{token} page.
// Flips status='pending' → 'verification_pending' so the owner can verify.
// Idempotent.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  try {
    const body = await req.json() as { token?: string }
    const token = body.token?.trim()
    if (!token || token.length < 16) {
      return jsonResponse({ error: 'invalid token' }, 400)
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, status, source')
      .eq('pay_token', token)
      .single()

    if (error || !payment) {
      return jsonResponse({ error: 'payment not found' }, 404)
    }

    // Idempotent: already in a terminal-ish state? just return ok.
    if (payment.status === 'verification_pending' || payment.status === 'paid') {
      return jsonResponse({ ok: true, status: payment.status })
    }

    if (payment.status !== 'pending') {
      return jsonResponse({ error: `cannot confirm payment in status ${payment.status}` }, 400)
    }

    const { error: updErr } = await supabase
      .from('payments')
      .update({ status: 'verification_pending' })
      .eq('id', payment.id)
      .eq('status', 'pending')

    if (updErr) throw new Error(updErr.message)

    return jsonResponse({ ok: true, status: 'verification_pending' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    console.error('confirm-upi-payment failed:', err)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
