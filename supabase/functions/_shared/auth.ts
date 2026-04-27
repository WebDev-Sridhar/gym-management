// Auth helper for owner-only edge functions.
// Verifies the caller is an authenticated owner and returns their gym_id.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface OwnerContext {
  userId: string
  gymId: string
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Read the caller's JWT from the Authorization header, resolve the user,
// and verify they're an owner of some gym. Returns { userId, gymId }.
export async function requireOwner(req: Request): Promise<OwnerContext> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new HttpError(401, 'missing bearer token')

  const supabase = getServiceClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) throw new HttpError(401, 'invalid token')

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, role, gym_id')
    .eq('id', userData.user.id)
    .single()

  if (profileErr || !profile) throw new HttpError(403, 'no profile')
  if (profile.role !== 'owner') throw new HttpError(403, 'owner role required')
  if (!profile.gym_id) throw new HttpError(403, 'no gym associated')

  return { userId: profile.id, gymId: profile.gym_id }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return jsonResponse({ error: err.message }, { status: err.status })
  }
  const message = err instanceof Error ? err.message : 'internal error'
  console.error('edge function error:', err)
  return jsonResponse({ error: message }, { status: 500 })
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
