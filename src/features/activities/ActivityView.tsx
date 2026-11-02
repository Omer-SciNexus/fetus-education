import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Chip, Notice, Segmented } from '@/components/ui'
import { Artwork, contentArt } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import { categoryLabels } from '@/lib/format'
import type { PublishedItem } from '@/types/db'

export function PlaceholderBanner() {
  return (
    <Notice tone="warn" title="Placeholder content — not yet clinically reviewed">
      This text is a draft awaiting review by a qualified professional. Do not rely on it for decisions about
      your care. Your care provider is the right person to ask.
    </Notice>
  )
}

function kindLabel(item: PublishedItem) {
  if (item.kind === 'story') return 'Storytime'
  if (item.kind === 'audio') return 'Listen'
  if (item.category === 'calm') return 'Quiet moment'
  return 'Activity'
}

function kindVerb(item: PublishedItem) {
  if (item.kind === 'story') return 'Read aloud'
  if (item.kind === 'audio') return 'Listen or read'
  return 'Solo or together'
}

export function ItemMeta({ item }: { item: PublishedItem }) {
  return (
    <div className="activity-meta">
      <span>{kindVerb(item)}</span>
      <span aria-hidden>·</span>
      <span>About {item.version.duration_minutes} minutes</span>
      {item.program_position && (
        <Chip tone="sage" icon="leaf">
          Moment {item.program_position} of 14
        </Chip>
      )}
      <Chip tone="ivory">{categoryLabels[item.category] ?? item.category}</Chip>
    </div>
  )
}

function Steps({ text }: { text: string }) {
  const steps = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return (
    <ol className="list-decimal space-y-2.5 pl-5 text-[16px] marker:font-bold marker:text-peach-700">
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
  backTo = '/explore',
  topAction,
  paused = false,
}: {
  item: PublishedItem
  showTogether: boolean
  actions?: ReactNode
  backTo?: string
  topAction?: ReactNode
  paused?: boolean
}) {
  const v = item.version
  const hasTogether = !!v.together_steps.trim()
  const [mode, setMode] = useState<'solo' | 'together'>(showTogether && hasTogether ? 'together' : 'solo')
  const steps = mode === 'together' && hasTogether ? v.together_steps : v.solo_steps

  return (
    <article className="activity-detail space-y-5">
      <div className="activity-topbar">
        <Link to={backTo} className="icon-button" aria-label="Back">
          <Icon name="back" size={22} />
        </Link>
        <h2>{kindLabel(item)}</h2>
        {topAction ?? <span />}
      </div>
      <Artwork name={contentArt(item, paused)} className="activity-cover" eager />
      <header className="space-y-3">
        <h1>{v.title}</h1>
        <ItemMeta item={item} />
        {v.summary && <p className="summary text-ink-soft">{v.summary}</p>}
      </header>

      {v.is_placeholder && <PlaceholderBanner />}

      {v.body && item.kind !== 'story' && (
        <Card>
          <p className="prose-lb">{v.body}</p>
        </Card>
      )}

      {item.kind === 'story' && v.body && (
        <Card>
          <h2 className="sr-only">Story</h2>
          <p className="prose-lb story-copy">{v.body}</p>
        </Card>
      )}

      {v.solo_steps.trim() && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">How to do it</h2>
          {hasTogether && (
            <Segmented
              label="Instructions for"
              value={mode}
              onChange={setMode}
              options={[
                { key: 'solo', label: 'Solo', icon: 'book' },
                { key: 'together', label: 'Together', icon: 'people' },
              ]}
            />
          )}
          <Steps text={steps} />
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
              An audio version has not been recorded yet. You can read the script aloud, or ask someone to
              read it to you.
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
                <a
                  className="text-peach-700 underline"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
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

export function ItemCard({
  item,
  to,
  done,
  favorite,
  footer,
  paused = false,
}: {
  item: PublishedItem
  to: string
  done?: boolean
  favorite?: boolean
  footer?: ReactNode
  paused?: boolean
}) {
  return (
    <Card as="li" className="activity-card">
      <Link to={to} className="activity-card-cover" aria-hidden="true" tabIndex={-1}>
        <Artwork name={contentArt(item, paused)} />
        {done && (
          <Chip tone="white" icon="check">
            Done
          </Chip>
        )}
      </Link>
      <div className="activity-card-body">
        <div className="activity-card-title">
          <h3>
            <Link to={to}>{item.version.title}</Link>
          </h3>
          <span className={`fav ${favorite ? 'on' : ''}`} aria-label={favorite ? 'Saved' : undefined} title={favorite ? 'Saved' : undefined}>
            <Icon name="bookmark" size={22} />
          </span>
        </div>
        {item.version.summary && <p>{item.version.summary}</p>}
        {item.version.is_placeholder && (
          <div>
            <Badge tone="warn">Placeholder</Badge>
          </div>
        )}
        <div className="activity-card-meta">
          <span>
            <Icon name="clock" size={16} />
            {item.version.duration_minutes} min
          </span>
          {item.program_position ? (
            <Chip tone="ivory">Moment {item.program_position} of 14</Chip>
          ) : (
            <span className="text-ink-soft">{categoryLabels[item.category] ?? item.category}</span>
          )}
        </div>
        {footer}
      </div>
    </Card>
  )
}
