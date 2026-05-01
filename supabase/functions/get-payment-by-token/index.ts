// POST /functions/v1/get-payment-by-token
// Body: { token }
// Public (no JWT). Returns the minimum payment + gym info needed to render
// the /pay/{token} page. Never returns secrets.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildUpiLink } from '../_shared/upi.ts'

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
      .select(`
        id, amount, status, source, due_date, razorpay_link_url,
        member:members(name),
        plan:plans(name, duration_days),
        gym:gyms(id, name, payment_mode, upi_id, theme_color)
      `)
      .eq('pay_token', token)
      .single()

    if (error || !payment) {
      return jsonResponse({ error: 'payment not found' }, 404)
    }

    // Build the UPI deep link server-side so the public page never needs the gym's UPI ID
    let upiLink: string | null = null
    if (payment.gym?.payment_mode === 'upi' && payment.gym.upi_id) {
      try {
        upiLink = buildUpiLink({
          vpa: payment.gym.upi_id,
          payeeName: payment.gym.name ?? 'Gym',
          amount: Number(payment.amount),
          note: `${payment.plan?.name ?? 'Membership'} fee`,
        })
      } catch { /* missing/invalid VPA — fall through with null */ }
    }

    return jsonResponse({
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        status: payment.status,
        source: payment.source,
        due_date: payment.due_date,
      },
      member: { name: payment.member?.name ?? null },
      plan: {
        name: payment.plan?.name ?? null,
        duration_days: payment.plan?.duration_days ?? null,
      },
      gym: {
        name: payment.gym?.name ?? null,
        payment_mode: payment.gym?.payment_mode ?? 'upi',
        theme_color: payment.gym?.theme_color ?? '#8B5CF6',
      },
      upi_link: upiLink,
      razorpay_link_url: payment.razorpay_link_url ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    console.error('get-payment-by-token failed:', err)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
