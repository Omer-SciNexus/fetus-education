import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Notice, cx } from '@/components/ui'
import { categoryLabels } from '@/lib/format'
import type { PublishedItem } from '@/types/db'

export function PlaceholderBanner() {
  return (
    <Notice tone="warn" title="Placeholder content — not yet clinically reviewed">
      This text is a draft awaiting review by a qualified professional. Do not rely on it for decisions about your
      care. Your care provider is the right person to ask.
    </Notice>
  )
}

export function ItemMeta({ item }: { item: PublishedItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="peach">{categoryLabels[item.category] ?? item.category}</Badge>
      <Badge>{item.version.duration_minutes} min</Badge>
      {item.program_position && <Badge tone="sage">Program · {item.program_position} of 14</Badge>}
    </div>
  )
}

function Steps({ text }: { text: string }) {
  const steps = text.split('\n').map((s) => s.trim()).filter(Boolean)
  return (
    <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-peach-700">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  )
}

/**
 * Renders an activity, story or relaxation script. Shared by the guest sample and
 * the member activity page. Audio never auto-plays (section 6.1).
 */
export function ActivityView({
  item,
  showTogether,
  actions,
}: {
  item: PublishedItem
  showTogether: boolean
  actions?: ReactNode
}) {
  const v = item.version
  const hasTogether = !!v.together_steps.trim()
  const [mode, setMode] = useState<'solo' | 'together'>(showTogether && hasTogether ? 'together' : 'solo')
  const steps = mode === 'together' && hasTogether ? v.together_steps : v.solo_steps

  return (
    <article className="space-y-5">
      <header className="space-y-3">
        <ItemMeta item={item} />
        <h1 className="text-3xl font-bold">{v.title}</h1>
        {v.summary && <p className="text-lg text-ink-soft">{v.summary}</p>}
      </header>

      {v.is_placeholder && <PlaceholderBanner />}

      {v.body && item.kind !== 'story' && (
        <Card>
          <p className="prose-lb">{v.body}</p>
        </Card>
      )}

      {v.solo_steps.trim() && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">How to do it</h2>
            {hasTogether && (
              <div role="group" aria-label="Instructions for" className="inline-flex rounded-full border border-line bg-ivory p-1">
                {(['solo', 'together'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cx(
                      'rounded-full px-4 py-1.5 text-sm font-semibold',
                      mode === m ? 'bg-paper text-peach-700 shadow-sm' : 'text-ink-soft',
                    )}
                  >
                    {m === 'solo' ? 'Solo' : 'Together'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Steps text={steps} />
        </Card>
      )}

      {item.kind === 'story' && v.body && (
        <Card>
          <h2 className="sr-only">Story</h2>
          <p className="prose-lb text-lg leading-relaxed">{v.body}</p>
        </Card>
      )}

      {(item.kind === 'audio' || v.audio_path || v.transcript) && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">Listen or read</h2>
          {v.audio_path ? (
            <audio controls preload="none" src={v.audio_path} className="w-full">
              Your browser cannot play this audio. Use the transcript below.
            </audio>
          ) : (
            <p className="text-sm text-ink-soft">
              An audio version has not been recorded yet. You can read the script aloud, or ask someone to read it to
              you.
            </p>
          )}
          {v.transcript && (
            <details className="mt-4" open={!v.audio_path}>
              <summary className="cursor-pointer font-semibold">Transcript</summary>
              <p className="prose-lb mt-3">{v.transcript}</p>
            </details>
          )}
        </Card>
      )}

      {v.reflection_prompt && (
        <Card className="bg-sage-50">
          <h2 className="font-bold text-sage-700">Optional reflection</h2>
          <p className="mt-1">{v.reflection_prompt}</p>
        </Card>
      )}

      {actions}

      {item.sources.length > 0 && (
        <section>
          <h2 className="font-bold">Sources</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {item.sources.map((s) => (
              <li key={s.id}>
                <a className="text-peach-700 underline" href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title}
                </a>{' '}
                <span className="text-ink-soft">(accessed {s.accessed_on})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

export function ItemCard({ item, to, done, favorite, footer }: { item: PublishedItem; to: string; done?: boolean; favorite?: boolean; footer?: ReactNode }) {
  return (
    <Card as="li" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ItemMeta item={item} />
        {done && <Badge tone="sage">✓ Done</Badge>}
        {favorite && <Badge tone="peach">♥ Favourite</Badge>}
        {item.version.is_placeholder && <Badge tone="warn">Placeholder</Badge>}
      </div>
      <h3 className="text-lg font-bold">
        <Link to={to} className="hover:text-peach-700 hover:underline">
          {item.version.title}
        </Link>
      </h3>
      {item.version.summary && <p className="text-ink-soft">{item.version.summary}</p>}
      {footer}
    </Card>
  )
}
