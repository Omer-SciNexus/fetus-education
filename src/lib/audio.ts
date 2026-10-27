// Recording constraints (sections 5.2, 7.4). The server enforces bytes and counts;
// these client limits keep recordings comfortably under the 2,000,000-byte cap.

export const MAX_RECORDING_SECONDS = 120
export const MAX_RECORDING_BYTES = 2_000_000
/** Stop early when the encoded size approaches the cap (VBR can overshoot the bitrate). */
export const SOFT_STOP_BYTES = 1_900_000
/** ~48 kbps keeps two minutes near 0.7 MB instead of ~1.9 MB at browser defaults. */
export const AUDIO_BITS_PER_SECOND = 48_000

/** Preference order: Opus in WebM (Chrome/Firefox/Edge), then AAC in MP4 (Safari). */
export const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm',
] as const

export const ALLOWED_BASE_MIME = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
])

export function baseMime(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase()
}

export function pickMimeType(isTypeSupported: (t: string) => boolean): string | null {
  for (const t of CANDIDATE_MIME_TYPES) {
    try {
      if (isTypeSupported(t)) return t
    } catch {
      /* some browsers throw for unknown types */
    }
  }
  return null
}

export function isAllowedRecordingMime(mime: string): boolean {
  return ALLOWED_BASE_MIME.has(baseMime(mime))
}

export function recordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

/** Classifies getUserMedia failures for clear user messages. */
export function classifyMicError(error: unknown): 'denied' | 'no_device' | 'unsupported' | 'busy' {
  const name = (error as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no_device'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unsupported'
}
