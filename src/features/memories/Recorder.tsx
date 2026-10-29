import { useEffect, useMemo } from 'react'
import { MAX_RECORDING_SECONDS } from '@/lib/audio'
import { formatBytes, formatDuration } from '@/lib/format'
import type { RecorderState } from '@/lib/recorderMachine'
import { Button, Notice } from '@/components/ui'

const problemText = {
  denied: 'Microphone access was refused. Allow the microphone for this site in your browser settings, then try again. You can also write a text memory instead.',
  no_device: 'No microphone was found. Connect one, or write a text memory instead.',
  unsupported: 'This browser cannot record audio here. Try an up-to-date Chrome, Safari or Firefox, or write a text memory.',
  busy: 'The microphone is being used by another app. Close it and try again.',
}

const phaseText = { reserving: 'Preparing…', uploading: 'Uploading…', finalizing: 'Checking…' }

export function Recorder({
  state,
  elapsed,
  onStart,
  onStop,
  onDiscard,
  onSave,
  saveDisabled,
}: {
  state: RecorderState
  elapsed: number
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  onSave: () => void
  saveDisabled?: boolean
}) {
  const take = state.status === 'recorded' || state.status === 'failed' || state.status === 'saving' ? state.take : null
  const previewUrl = useMemo(() => (take ? URL.createObjectURL(take.blob) : null), [take?.blob]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <div className="space-y-4" aria-live="polite">
      {(state.status === 'idle' || state.status === 'requesting') && (
        <div className="space-y-3">
          <p className="text-ink-soft">Up to {MAX_RECORDING_SECONDS / 60} minutes. Your browser will ask for microphone access.</p>
          <Button onClick={onStart} loading={state.status === 'requesting'}>
            ● Record
          </Button>
        </div>
      )}

      {state.status === 'mic_problem' && (
        <div className="space-y-3">
          <Notice tone="error">{problemText[state.problem]}</Notice>
          <Button variant="secondary" onClick={onStart}>Try again</Button>
        </div>
      )}

      {state.status === 'recording' && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-lg font-bold text-danger">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-danger" aria-hidden />
            Recording {formatDuration(elapsed)} / {formatDuration(MAX_RECORDING_SECONDS)}
          </p>
          <Button variant="danger" onClick={onStop}>■ Stop</Button>
          <p className="text-sm text-ink-soft">Keep this page open. Recording stops if you switch apps or lock the screen.</p>
        </div>
      )}

      {state.status === 'too_large' && (
        <div className="space-y-3">
          <Notice tone="error">That recording was too large to save. Please record a shorter message.</Notice>
          <Button variant="secondary" onClick={onDiscard}>Record again</Button>
        </div>
      )}

      {take && previewUrl && (
        <div className="space-y-3">
          <audio controls src={previewUrl} className="w-full" preload="metadata">
            Your browser cannot preview this recording.
          </audio>
          <p className="text-sm text-ink-soft">
            {formatDuration(take.durationSeconds)} · {formatBytes(take.blob.size)}
          </p>

          {state.status === 'saving' && (
            <div>
              <p className="font-semibold">{phaseText[state.phase]}</p>
              <progress
                className="mt-2 h-2 w-full accent-peach-700"
                max={1}
                value={state.phase === 'uploading' ? state.progress : state.phase === 'finalizing' ? 1 : undefined}
                aria-label="Upload progress"
              />
              <p className="mt-1 text-sm text-ink-soft">Not saved yet — keep this page open.</p>
            </div>
          )}

          {state.status === 'failed' && <Notice tone="error" title="Not saved">{state.message}</Notice>}

          {state.status !== 'saving' && (
            <div className="flex flex-wrap gap-3">
              {(state.status === 'recorded' || (state.status === 'failed' && state.retryable)) && (
                <Button onClick={onSave} disabled={saveDisabled}>
                  {state.status === 'failed' ? 'Try saving again' : 'Save recording'}
                </Button>
              )}
              <Button variant="secondary" onClick={onDiscard}>Discard</Button>
            </div>
          )}
          {state.status === 'recorded' && (
            <p className="text-sm text-ink-soft">This recording is only on this page until you save it. It will be lost if the page closes.</p>
          )}
        </div>
      )}
    </div>
  )
}
