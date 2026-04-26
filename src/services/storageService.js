import imageCompression from 'browser-image-compression'
import { supabaseData } from './supabaseClient'

const BUCKET = 'gym-images'
const OPTS = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, fileType: 'image/webp', useWebWorker: true }

export async function uploadToTemp(file, gymId) {
  const compressed = await imageCompression(file, OPTS)
  const rand = Math.random().toString(36).slice(2, 7)
  const path = `temp/${gymId}/${Date.now()}_${rand}.webp`
  const { error } = await supabaseData.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/webp' })
  if (error) throw error
  const { data } = supabaseData.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function moveToPermanent(tempPath, gymId, section) {
  if (!tempPath || !tempPath.startsWith('temp/')) {
    const { data } = supabaseData.storage.from(BUCKET).getPublicUrl(tempPath)
    return { url: data.publicUrl, path: tempPath }
  }
  const { data: blob, error: dlErr } = await supabaseData.storage.from(BUCKET).download(tempPath)
  if (dlErr) throw dlErr
  const permPath = `gyms/${gymId}/${section}/${Date.now()}.webp`
  const { error: upErr } = await supabaseData.storage
    .from(BUCKET)
    .upload(permPath, blob, { upsert: false, contentType: 'image/webp' })
  if (upErr) throw upErr
  await supabaseData.storage.from(BUCKET).remove([tempPath]).catch(() => {})
  const { data } = supabaseData.storage.from(BUCKET).getPublicUrl(permPath)
  return { url: data.publicUrl, path: permPath }
}

export async function deleteFile(publicUrl) {
  if (!publicUrl?.includes('/gym-images/')) return
  const path = publicUrl.split('/gym-images/')[1]
  await supabaseData.storage.from(BUCKET).remove([path]).catch(() => {})
}

export function isTempUrl(publicUrl) {
  if (!publicUrl?.includes('/gym-images/')) return false
  return publicUrl.split('/gym-images/')[1]?.startsWith('temp/')
}

export function extractStoragePath(publicUrl) {
  if (!publicUrl?.includes('/gym-images/')) return null
  return publicUrl.split('/gym-images/')[1]
}
