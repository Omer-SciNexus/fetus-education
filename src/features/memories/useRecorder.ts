import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  AUDIO_BITS_PER_SECOND,
  MAX_RECORDING_BYTES,
  MAX_RECORDING_SECONDS,
  SOFT_STOP_BYTES,
  classifyMicError,
  pickMimeType,
  recordingSupported,
} from '@/lib/audio'
import { hasUnsavedTake, initialRecorderState, recorderReducer } from '@/lib/recorderMachine'
import { abandonAttempt, saveRecording } from '@/lib/recordings'
import { errorCode, errorMessage } from '@/lib/errors'
import { logEvent } from '@/lib/api'
import type { Visibility } from '@/types/db'

const NOT_RETRYABLE = new Set(['recording_limit', 'storage_limit', 'file_too_large', 'unsupported_audio', 'not_member', 'upload_invalid'])

function newKey() {
  return crypto.randomUUID()
}

export interface SaveMeta {
  title: string
  body: string
  visibility: Visibility
  activityId: string | null
}

export function useRecorder() {
  const [state, dispatch] = useReducer(recorderReducer, initialRecorderState)
  const [elapsed, setElapsed] = useState(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  const start = useCallback(async () => {
    dispatch({ type: 'REQUEST' })
    if (!recordingSupported()) {
      dispatch({ type: 'MIC_PROBLEM', problem: 'unsupported' })
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (e) {
      dispatch({ type: 'MIC_PROBLEM', problem: classifyMicError(e) })
      return
    }
    streamRef.current = stream

    const mime = pickMimeType((t) => MediaRecorder.isTypeSupported(t))
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, audioBitsPerSecond: AUDIO_BITS_PER_SECOND } : { audioBitsPerSecond: AUDIO_BITS_PER_SECOND },
      )
    } catch {
      stopTracks()
      dispatch({ type: 'MIC_PROBLEM', problem: 'unsupported' })
      return
    }
    recRef.current = rec
    const chunks: Blob[] = []
    let size = 0
    const startedAt = Date.now()

    rec.ondataavailable = (e) => {
      if (!e.data.size) return
      chunks.push(e.data)
      size += e.data.size
      // Stop before the server cap, whatever the encoder actually produced.
      if (size >= SOFT_STOP_BYTES && rec.state === 'recording') rec.stop()
    }
    rec.onstop = () => {
      const type = rec.mimeType || mime || 'audio/webm'
      const blob = new Blob(chunks, { type })
      stopTracks()
      recRef.current = null
      dispatch({
        type: 'STOPPED',
        take: { blob, mime: type, durationSeconds: (Date.now() - startedAt) / 1000, attemptKey: newKey() },
        maxBytes: MAX_RECORDING_BYTES,
      })
    }
    rec.onerror = () => {
      if (rec.state !== 'inactive') rec.stop()
    }

    rec.start(1000)
    setElapsed(0)
    dispatch({ type: 'GRANTED', at: startedAt })
    timerRef.current = window.setInterval(() => {
      const secs = (Date.now() - startedAt) / 1000
      setElapsed(secs)
      if (secs >= MAX_RECORDING_SECONDS) stop()
    }, 250)
  }, [stop, stopTracks])

  const discard = useCallback(async () => {
    const s = stateRef.current
    if (s.status === 'failed') {
      // Release any reservation/object left by the failed attempt.
      try {
        await abandonAttempt(s.take.attemptKey)
      } catch {
        /* stale reservations are also released on the next visit */
      }
    }
    dispatch({ type: 'DISCARD' })
  }, [])

  const save = useCallback(async (meta: SaveMeta) => {
    const s = stateRef.current
    if (s.status !== 'recorded' && !(s.status === 'failed' && s.retryable)) return
    const take = s.take
    dispatch({ type: 'SAVE' })
    try {
      const memoryId = await saveRecording(
        { ...take, ...meta },
        (phase) => dispatch({ type: 'PHASE', phase }),
        (progress) => dispatch({ type: 'PROGRESS', progress }),
      )
      dispatch({ type: 'SAVED', memoryId })
    } catch (e) {
      void logEvent('save_failed')
      const code = errorCode(e)
      let newAttemptKey: string | undefined
      if (code === 'reservation_invalid' || code === 'reservation_failed' || code === 'upload_invalid') {
        // That reservation can't be used again: release it and retry with a fresh key.
        try {
          await abandonAttempt(take.attemptKey)
        } catch {
          /* cleaned up later */
        }
        newAttemptKey = newKey()
      }
      dispatch({
        type: 'FAILED',
        message: errorMessage(e, 'The recording was not saved. Your recording is still here — try again.'),
        retryable: !code || !NOT_RETRYABLE.has(code),
        newAttemptKey,
      })
    }
  }, [])

  // Mobile browsers may suspend hidden tabs; stop cleanly so the take is kept.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [stop])

  // Warn before closing the page with an unsaved take.
  useEffect(() => {
    if (!hasUnsavedTake(state)) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state])

  // Always release the microphone when leaving the recorder.
  useEffect(
    () => () => {
      const rec = recRef.current
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null
        rec.stop()
      }
      stopTracks()
    },
    [stopTracks],
  )

  return { state, elapsed, start, stop, discard, save, reset: () => dispatch({ type: 'RESET' }) }
}
