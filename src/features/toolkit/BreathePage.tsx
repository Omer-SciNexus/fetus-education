import { useEffect, useRef, useState } from 'react'
import { Button, Card, PageHeader, Segmented } from '@/components/ui'
import { BackToSpace } from './shared'
import { formatDuration } from '@/lib/format'
import { breathPhase, BREATHE_IN, BREATHE_OUT } from '@/lib/breathe'
import './toolkit.css'

// A calm moment for the parent (Expectful-style). No audio, no claims about the baby.
// Reduced motion keeps the counter only.
const lengths = { '1': 60, '3': 180, '5': 300 } as const
type Length = keyof typeof lengths

export default function BreathePage() {
  const [length, setLength] = useState<Length>('3')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const timer = useRef<number | null>(null)
  const total = lengths[length]

  useEffect(() => {
    if (!running) return
    timer.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [running])

  useEffect(() => {
    if (running && elapsed >= total) {
      setRunning(false)
      setFinished(true)
    }
  }, [elapsed, total, running])

  const start = () => {
    setElapsed(0)
    setFinished(false)
    setRunning(true)
  }

  const { phase, secondsLeft } = breathPhase(elapsed)
  const label = !running ? (finished ? 'Well done' : 'Ready when you are') : phase === 'in' ? 'Breathe in' : 'Breathe out'

  return (
    <div className="form-page mx-auto space-y-5">
      <BackToSpace />
      <PageHeader title="Breathe" subtitle="A few slow breaths, just for you. In for four, out for six." />
      <Card className="breathe-card">
        <div
          className={`breathe-orb ${running ? `is-${phase}` : ''}`}
          style={{ ['--in' as string]: `${BREATHE_IN}s`, ['--out' as string]: `${BREATHE_OUT}s` }}
          aria-hidden
        />
        <p className="breathe-label" aria-live="polite">
          {label}
        </p>
        {running && (
          <p className="breathe-count" aria-hidden>
            {secondsLeft}
          </p>
        )}
        <p className="text-sm text-ink-soft">
          {running ? `${formatDuration(total - elapsed)} left` : finished ? 'Take a moment before you carry on.' : ' '}
        </p>
        <div className="breathe-controls">
          {!running && (
            <Segmented
              label="Length"
              value={length}
              onChange={setLength}
              options={[
                { key: '1', label: '1 min' },
                { key: '3', label: '3 min' },
                { key: '5', label: '5 min' },
              ]}
            />
          )}
          {running ? (
            <Button variant="secondary" onClick={() => setRunning(false)}>
              Stop
            </Button>
          ) : (
            <Button onClick={start}>{finished ? 'Again' : 'Start'}</Button>
          )}
        </div>
      </Card>
      <p className="text-sm text-ink-soft">
        Sit or lie in a position that feels comfortable. If you feel dizzy or short of breath, stop and breathe normally. This
        is a relaxation exercise, not a medical treatment.
      </p>
    </div>
  )
}
