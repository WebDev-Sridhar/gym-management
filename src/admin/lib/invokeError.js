/**
 * supabase-js surfaces a non-2xx edge-function response as FunctionsHttpError
 * with the body on `error.context`. Our admin functions return { error: msg },
 * so unwrap that into a plain Error with the real message for the UI.
 */
export async function normalizeInvokeError(error) {
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return new Error(body.error)
  } catch { /* ignore */ }
  return error instanceof Error ? error : new Error('Request failed')
}
