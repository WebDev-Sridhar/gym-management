// Scheduled cron — pg_cron job "cleanup-temp-images-daily" (daily 03:00 UTC).
// Sweeps the gym-images bucket for /temp/{gymId}/* files older than 24h and
// deletes them. Auth: optional Bearer CRON_SECRET (matches the pg_cron call).
//
// Audit row: every invocation writes one cron_runs row at the end (status =
// 'success' | 'failed') so the daily activity is queryable alongside the
// other crons (ghost-detection, weekly-summary, expire-stale-records,
// daily-expiry-reminders). Added 2026-06-07 alongside the
// fix_cleanup_temp_images_cron_auth migration — before that the function
// was silently returning JSON only, so the 01 May–07 Jun 401 storm went
// unnoticed until storage usage grew.

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

  const startedAt = new Date().toISOString()
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString()
  let totalDeleted = 0
  let errors = 0
  const folderErrors: Array<{ folder: string; error: string }> = []

  try {
    // List gym ID folders under temp/
    const { data: gymFolders, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(TEMP_PREFIX, { limit: 1000 })

    if (listErr) throw new Error(`list temp/ failed: ${listErr.message}`)

    for (const folder of gymFolders ?? []) {
      if (!folder.name) continue
      const prefix = `${TEMP_PREFIX}${folder.name}/`

      const { data: files, error: filesErr } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 1000 })

      if (filesErr || !files) {
        errors++
        folderErrors.push({ folder: folder.name, error: filesErr?.message ?? 'no list response' })
        continue
      }

      const staleFiles = files.filter(f => {
        const created = f.created_at ?? f.updated_at
        return created && created < cutoff
      })

      if (staleFiles.length === 0) continue

      const paths = staleFiles.map(f => `${prefix}${f.name}`)
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (removeErr) {
        errors++
        folderErrors.push({ folder: folder.name, error: removeErr.message })
        continue
      }
      totalDeleted += paths.length
    }

    const summary = {
      job_name:    'cleanup-temp-images',
      deleted:     totalDeleted,
      errors,
      cutoff,
      folder_errors: folderErrors.slice(0, 5),   // cap to keep the audit row small
      started_at:  startedAt,
      finished_at: new Date().toISOString(),
    }

    // Don't fail the cron over an audit-write error — the work already
    // succeeded; the audit row is just observability. .catch() swallows so
    // we still return 200 to pg_cron.
    await supabase.from('cron_runs').insert({
      job_name: 'cleanup-temp-images',
      status:   errors === 0 ? 'success' : 'partial',
      details:  summary,
    }).then(() => {}, () => {})

    return new Response(
      JSON.stringify({ ok: true, ...summary }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cleanup-temp-images failed:', message)
    await supabase.from('cron_runs').insert({
      job_name: 'cleanup-temp-images',
      status:   'failed',
      details:  { error: message, deleted: totalDeleted, errors, cutoff, started_at: startedAt },
    }).then(() => {}, () => {})
    return new Response(
      JSON.stringify({ ok: false, error: message, deleted: totalDeleted }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
