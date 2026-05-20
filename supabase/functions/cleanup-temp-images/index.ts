// Scheduled cron — pg_cron job "cleanup-temp-images-daily" (daily 03:00 UTC).
// Sweeps the gym-images bucket for /temp/{gymId}/* files older than 24h and
// deletes them. Auth: optional Bearer CRON_SECRET (matches the pg_cron call).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const BUCKET = 'gym-images'
const TEMP_PREFIX = 'temp/'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

Deno.serve(async (req: Request) => {
  // Simple secret check to prevent unauthorized invocations
  const authHeader = req.headers.get('Authorization') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString()
  let totalDeleted = 0
  let errors = 0

  // List gym ID folders under temp/
  const { data: gymFolders, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(TEMP_PREFIX, { limit: 1000 })

  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), { status: 500 })
  }

  for (const folder of gymFolders ?? []) {
    if (!folder.name) continue
    const prefix = `${TEMP_PREFIX}${folder.name}/`

    const { data: files, error: filesErr } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 })

    if (filesErr || !files) { errors++; continue }

    const staleFiles = files.filter(f => {
      const created = f.created_at ?? f.updated_at
      return created && created < cutoff
    })

    if (staleFiles.length === 0) continue

    const paths = staleFiles.map(f => `${prefix}${f.name}`)
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
    if (removeErr) { errors++; continue }
    totalDeleted += paths.length
  }

  return new Response(
    JSON.stringify({ deleted: totalDeleted, errors, cutoff }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
