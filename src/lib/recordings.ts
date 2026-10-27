// Recording upload sequence (section 12.1):
// reserve quota (DB lock) -> upload to the server-generated key (Storage RLS allows
// only that key, bucket caps size/type, no overwrite) -> finalize (DB verifies the
// stored object's real size/type and activates the memory exactly once).
import { supabase, RECORDINGS_BUCKET } from './supabase'
import { AppError, errorCode } from './errors'
import { baseMime } from './audio'
import type { SavePhase } from './recorderMachine'
import type { Visibility } from '@/types/db'

export interface SaveRecordingInput {
  blob: Blob
  mime: string
  durationSeconds: number
  attemptKey: string
  title: string
  body: string
  visibility: Visibility
  activityId: string | null
}

interface Reservation {
  recording_id: string
  object_key: string
  expires_at: string
  state: 'reserved' | 'active' | 'deleting' | 'failed'
}

function storageUrl(key: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `${base}/storage/v1/object/${RECORDINGS_BUCKET}/${path}`
}

/** XHR upload so we can report real progress; supabase-js upload has no progress events. */
function uploadWithProgress(key: string, blob: Blob, contentType: string, token: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', storageUrl(key))
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY as string)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Cache-Control', 'no-store')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onerror = () => reject(new TypeError('fetch failed'))
    xhr.ontimeout = () => reject(new TypeError('fetch timed out'))
    xhr.timeout = 120_000
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      const text = xhr.responseText || ''
      // Already uploaded on a previous attempt: finalize will verify it.
      if (xhr.status === 409 || /duplicate|already exists/i.test(text)) return resolve()
      if (xhr.status === 413 || /size|too large/i.test(text)) return reject(new AppError('file_too_large'))
      if (/mime|content type/i.test(text)) return reject(new AppError('unsupported_audio'))
      if (xhr.status === 401 || xhr.status === 403 || /row-level security|unauthorized/i.test(text)) {
        return reject(new AppError('reservation_invalid'))
      }
      reject(new TypeError('fetch failed'))
    }
    xhr.send(blob)
  })
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      // Only retry transport failures; backend decisions are final.
      if (!(e instanceof TypeError)) throw e
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw last
}

export async function saveRecording(
  input: SaveRecordingInput,
  onPhase: (p: SavePhase) => void,
  onProgress: (p: number) => void,
): Promise<string> {
  const mime = baseMime(input.mime)

  onPhase('reserving')
  const { data, error } = await supabase.rpc('reserve_recording_upload', {
    p_idempotency_key: input.attemptKey,
    p_mime: mime,
    p_bytes: input.blob.size,
    p_duration_seconds: Math.round(input.durationSeconds),
    p_title: input.title,
    p_body: input.body,
    p_visibility: input.visibility,
    p_activity: input.activityId,
  })
  if (error) throw error
  const reservation = (Array.isArray(data) ? data[0] : data) as Reservation

  if (reservation.state === 'reserved') {
    onPhase('uploading')
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) throw new AppError('not_authenticated')
    await withRetry(() => uploadWithProgress(reservation.object_key, input.blob, mime, token, onProgress))
  }

  onPhase('finalizing')
  const memoryId = await withRetry(async () => {
    const { data: id, error: finErr } = await supabase.rpc('finalize_recording', {
      p_recording: reservation.recording_id,
    })
    if (finErr) {
      if (/fetch/i.test(finErr.message)) throw new TypeError(finErr.message)
      throw finErr
    }
    return id as string
  })
  return memoryId
}

/** Removes any uploaded object for an abandoned attempt, then releases its quota. */
export async function abandonAttempt(attemptKey: string): Promise<void> {
  const { data: rows } = await supabase
    .from('recordings')
    .select('id, object_key, state')
    .eq('idempotency_key', attemptKey)
    .in('state', ['reserved', 'failed'])
  for (const r of rows ?? []) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove([r.object_key])
    await supabase.rpc('abandon_recording', { p_recording: r.id })
  }
}

/**
 * Releases the caller's expired reservations (e.g. the page closed mid-upload).
 * Unsaved buffers from a closed page cannot be recovered — this only frees quota.
 */
export async function cleanupStaleUploads(userId: string): Promise<number> {
  const { data: rows } = await supabase
    .from('recordings')
    .select('id, object_key, expires_at')
    .eq('author_id', userId)
    .eq('state', 'reserved')
    .lt('expires_at', new Date().toISOString())
  let released = 0
  for (const r of rows ?? []) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove([r.object_key])
    const { error } = await supabase.rpc('abandon_recording', { p_recording: r.id })
    if (!error) released++
  }
  return released
}

/** Deletes a memory: deny access first, then remove the object, then the metadata. */
export async function deleteMemory(memoryId: string): Promise<void> {
  const { data: key, error } = await supabase.rpc('delete_memory', { p_memory: memoryId })
  if (error) throw error
  if (key) {
    const { error: rmErr } = await supabase.storage.from(RECORDINGS_BUCKET).remove([key as string])
    if (rmErr) throw rmErr
    const { error: doneErr } = await supabase.rpc('complete_memory_deletion', { p_memory: memoryId })
    if (doneErr && errorCode(doneErr) !== 'not_found') throw doneErr
  }
}

/** Authenticated download of a recording (no bearer URL is created). */
export async function downloadRecording(objectKey: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(RECORDINGS_BUCKET).download(objectKey)
  if (error || !data) throw error ?? new AppError('not_found')
  return data
}

export function extensionForKey(key: string): string {
  const m = /\.([a-z0-9]+)$/.exec(key)
  return m ? m[1] : 'audio'
}
