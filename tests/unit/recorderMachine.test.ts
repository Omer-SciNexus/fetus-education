import { describe, expect, it } from 'vitest'
import { hasUnsavedTake, initialRecorderState, recorderReducer, type RecorderEvent, type RecorderState } from '../../src/lib/recorderMachine'

const take = (size = 1000) => ({ blob: new Blob([new Uint8Array(size)]), mime: 'audio/webm', durationSeconds: 10, attemptKey: 'k1' })

function run(events: RecorderEvent[], start: RecorderState = initialRecorderState) {
  return events.reduce(recorderReducer, start)
}

describe('recorderReducer', () => {
  it('goes idle -> recording -> recorded', () => {
    const s = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    expect(s.status).toBe('recorded')
  })

  it('handles denied microphone permission', () => {
    const s = run([{ type: 'REQUEST' }, { type: 'MIC_PROBLEM', problem: 'denied' }])
    expect(s).toEqual({ status: 'mic_problem', problem: 'denied' })
  })

  it('rejects oversized takes before upload', () => {
    const s = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(2_000_001), maxBytes: 2_000_000 }])
    expect(s.status).toBe('too_large')
  })

  it('never shows saved after a failure', () => {
    const recorded = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    const failed = run([{ type: 'SAVE' }, { type: 'PHASE', phase: 'uploading' }, { type: 'FAILED', message: 'x', retryable: true }], recorded)
    expect(failed.status).toBe('failed')
    // A stray SAVED event outside a save attempt is ignored.
    expect(recorderReducer(failed, { type: 'SAVED', memoryId: 'm' }).status).toBe('failed')
  })

  it('keeps the take and attempt key for retry, or rotates it when told to', () => {
    const recorded = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    const failed = run([{ type: 'SAVE' }, { type: 'FAILED', message: 'x', retryable: true }], recorded)
    expect(failed.status === 'failed' && failed.take.attemptKey).toBe('k1')
    const rotated = run([{ type: 'SAVE' }, { type: 'FAILED', message: 'x', retryable: true, newAttemptKey: 'k2' }], failed)
    expect(rotated.status === 'failed' && rotated.take.attemptKey).toBe('k2')
    const retry = recorderReducer(rotated, { type: 'SAVE' })
    expect(retry.status).toBe('saving')
  })

  it('does not retry non-retryable failures', () => {
    const recorded = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    const failed = run([{ type: 'SAVE' }, { type: 'FAILED', message: 'limit', retryable: false }], recorded)
    expect(recorderReducer(failed, { type: 'SAVE' }).status).toBe('failed')
  })

  it('reaches saved only from a save attempt', () => {
    const recorded = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    expect(recorderReducer(recorded, { type: 'SAVED', memoryId: 'm' }).status).toBe('recorded')
    const saved = run([{ type: 'SAVE' }, { type: 'PROGRESS', progress: 2 }, { type: 'SAVED', memoryId: 'm' }], recorded)
    expect(saved).toEqual({ status: 'saved', memoryId: 'm' })
  })

  it('clamps progress and cannot be reset mid-save', () => {
    const recorded = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(), maxBytes: 2_000_000 }])
    const saving = run([{ type: 'SAVE' }, { type: 'PROGRESS', progress: 5 }], recorded)
    expect(saving.status === 'saving' && saving.progress).toBe(1)
    expect(recorderReducer(saving, { type: 'RESET' }).status).toBe('saving')
  })

  it('treats empty recordings as nothing recorded', () => {
    const s = run([{ type: 'REQUEST' }, { type: 'GRANTED', at: 1 }, { type: 'STOPPED', take: take(0), maxBytes: 2_000_000 }])
    expect(s.status).toBe('idle')
  })

  it('reports unsaved takes for the leave-page warning', () => {
    expect(hasUnsavedTake({ status: 'idle' })).toBe(false)
    expect(hasUnsavedTake({ status: 'recording', startedAt: 0 })).toBe(true)
    expect(hasUnsavedTake({ status: 'saved', memoryId: 'm' })).toBe(false)
  })
})
