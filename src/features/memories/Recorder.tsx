import { useEffect, useMemo } from 'react'
import { MAX_RECORDING_SECONDS } from '@/lib/audio'
import { formatBytes } from '@/lib/format'
import type { RecorderState } from '@/lib/recorderMachine'
import { Icon } from '@/components/Icon'
import { Button, Chip, Notice } from '@/components/ui'

const problemText = {
  denied:
    'Microphone access was refused. Allow the microphone for this site in your browser settings, then try again. You can also write a text memory instead.',
  no_device: 'No microphone was found. Connect one, or write a text memory instead.',
  unsupported:
    'This browser cannot record audio here. Try an up-to-date Chrome, Safari or Firefox, or write a text memory.',
  busy: 'The microphone is being used by another app. Close it and try again.',
}

const phaseText = { reserving: 'Preparing…', uploading: 'Uploading…', finalizing: 'Checking…' }
const heights = [22, 34, 48, 62, 78, 58, 42, 70, 88, 64, 46, 72, 54, 38, 60, 44, 30, 20]

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function Wave({ live, level }: { live: boolean; level: number }) {
  return (
    <span className={`recorder-wave ${live ? 'live' : ''}`} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          style={{ '--h': `${Math.max(8, h * level)}%`, '--d': `${(i % 6) * 0.12}s` } as React.CSSProperties}
        />
      ))}
    </span>
  )
}

export function Recorder({
  state,
  elapsed,
  onStart,
  onStop,
  onDiscard,
  onSave,
  saveDisabled,
  privacyLabel = 'Only you',
  shared = false,
}: {
  state: RecorderState
  elapsed: number
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  onSave: () => void
  saveDisabled?: boolean
  privacyLabel?: string
  shared?: boolean
}) {
  const take =
    state.status === 'recorded' || state.status === 'failed' || state.status === 'saving' ? state.take : null
  const previewUrl = useMemo(() => (take ? URL.createObjectURL(take.blob) : null), [take?.blob]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const recording = state.status === 'recording'
  const idle = state.status === 'idle' || state.status === 'requesting'
  const minutes = MAX_RECORDING_SECONDS / 60
  const time = recording ? elapsed : take ? take.durationSeconds : 0
  const status =
    state.status === 'requesting'
      ? 'Waiting for the microphone'
      : recording
        ? 'Recording'
        : state.status === 'saving'
          ? phaseText[state.phase]
          : take
            ? 'Recorded'
            : 'Ready when you are'

  return (
    <div className="recorder" aria-live="polite">
      <h2>A voice to remember</h2>
      <p className="recorder-lead">Read a story, share a thought, or sing a little song.</p>

      {state.status === 'mic_problem' ? (
        <div className="mx-auto mt-6 max-w-md space-y-3 text-left">
          <Notice tone="error">{problemText[state.problem]}</Notice>
          <Button variant="secondary" onClick={onStart}>
            Try again
          </Button>
        </div>
      ) : state.status === 'too_large' ? (
        <div className="mx-auto mt-6 max-w-md space-y-3 text-left">
          <Notice tone="error">That recording was too large to save. Please record a shorter message.</Notice>
          <Button variant="secondary" onClick={onDiscard}>
            Record again
          </Button>
        </div>
      ) : (
        <>
          <div className="recorder-stage">
            <Icon name="leaf" size={56} className="leaf-left" />
            <Icon name="leaf" size={56} className="leaf-right" />
            <Icon name="heart" size={26} className="heart" />
            <div className={`recorder-orb ${recording ? 'live' : ''}`}>
              {idle ? <Icon name="mic" size={64} /> : <Wave live={recording} level={take ? 0.8 : 1} />}
            </div>
          </div>
          <p className="recorder-time">{clock(time)}</p>
          <p className={`recorder-status ${recording ? 'live' : ''}`}>
            <span className="dot" aria-hidden />
            {status}
          </p>

          {idle && (
            <button
              type="button"
              className="record-button"
              onClick={onStart}
              disabled={state.status === 'requesting'}
              aria-label="Start recording"
            >
              <Icon name="mic" size={40} />
            </button>
          )}
          {recording && (
            <button type="button" className="record-button" onClick={onStop} aria-label="Stop recording">
              <span className="stop-square" />
            </button>
          )}
          {take && previewUrl && (
            <audio controls src={previewUrl} preload="metadata">
              Your browser cannot preview this recording.
            </audio>
          )}

          <p className="recorder-hint">
            {idle && `Up to ${minutes} minutes. Your browser will ask for microphone access.`}
            {recording && `Up to ${minutes} minutes. Keep this page open; recording stops if you switch apps.`}
            {take && state.status !== 'saving' && `${formatBytes(take.blob.size)} · only on this page until you save it.`}
            {state.status === 'saving' && 'Not saved yet — keep this page open.'}
          </p>
          <Chip tone={shared ? 'peach' : 'sage'} icon={shared ? 'people' : 'lock'}>
            {privacyLabel}
          </Chip>

          {state.status === 'saving' && (
            <progress
              className="mt-4 h-2 w-full accent-peach-700"
              max={1}
              value={
                state.phase === 'uploading' ? state.progress : state.phase === 'finalizing' ? 1 : undefined
              }
              aria-label="Upload progress"
            />
          )}
          {state.status === 'failed' && (
            <div className="mt-4 text-left">
              <Notice tone="error" title="Not saved">
                {state.message}
              </Notice>
            </div>
          )}

          {state.status !== 'saving' && (
            <div className="recorder-actions">
              <Button variant="secondary" onClick={onDiscard} disabled={!take}>
                Discard
              </Button>
              {state.status === 'failed' && !state.retryable ? (
                <Button disabled>Cannot be saved</Button>
              ) : (
                <Button onClick={onSave} disabled={!take || saveDisabled}>
                  {state.status === 'failed'
                    ? 'Try saving again'
                    : take
                      ? 'Save recording'
                      : 'Save after recording'}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
