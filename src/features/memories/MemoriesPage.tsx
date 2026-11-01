import { useState } from 'react'
import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { useMemories } from '@/lib/queries'
import { formatDate } from '@/lib/format'
import { Badge, ButtonLink, Card, Chip, EmptyState, ErrorState, LoadingState, PageHeader, Pills } from '@/components/ui'
import { Artwork } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import type { Memory } from '@/types/db'

type Filter = 'all' | 'notes' | 'recordings' | 'shared' | 'partner'

export function MemoryBadges({ memory, mine }: { memory: Memory; mine: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={memory.kind === 'voice' ? 'peach' : 'neutral'}>
        {memory.kind === 'voice' ? '🎙 Voice' : '✎ Note'}
      </Badge>
      <Badge tone={memory.visibility === 'shared' ? 'sage' : 'neutral'}>
        {memory.visibility === 'shared' ? 'Shared' : 'Private'}
      </Badge>
      {!mine && <Badge>From your partner</Badge>}
      {memory.state === 'deleting' && <Badge tone="danger">Deleting</Badge>}
    </div>
  )
}

const noteArt = ['journal', 'keepsakes', 'shared-moment']
const voiceArt = ['voice-memory', 'evening']
const bars = [8, 14, 22, 30, 18, 26, 32, 20, 12, 24, 30, 16, 10, 22, 28, 14, 20, 26, 12, 18, 8, 16, 24, 10]

export default function MemoriesPage() {
  const { userId } = useMember()
  const memories = useMemories()
  const [filter, setFilter] = useState<Filter>('all')

  const all = memories.data ?? []
  const hasPartnerEntries = all.some((m) => m.author_id !== userId)
  const list = all.filter((m) => {
    switch (filter) {
      case 'notes':
        return m.kind === 'text'
      case 'recordings':
        return m.kind === 'voice'
      case 'shared':
        return m.visibility === 'shared'
      case 'partner':
        return m.author_id !== userId
      default:
        return true
    }
  })
  const options = [
    { key: 'all', label: 'All' },
    { key: 'notes', label: 'Notes' },
    { key: 'recordings', label: 'Recordings' },
    { key: 'shared', label: 'Shared' },
    ...(hasPartnerEntries ? [{ key: 'partner', label: 'From your partner' } as const] : []),
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your little collection"
        subtitle="Moments, thoughts and sounds for this special chapter."
        action={
          <div className="flex flex-wrap gap-3">
            {all.length > 0 && (
              <ButtonLink to="/memories/book" variant="secondary">
                <Icon name="printer" size={18} />
                Keepsake book
              </ButtonLink>
            )}
            <ButtonLink to="/memories/new">
              <Icon name="plus" size={18} />
              New memory
            </ButtonLink>
          </div>
        }
      />

      {all.length > 0 && <Pills label="Show" options={options} value={filter} onChange={setFilter} />}

      {memories.isPending ? (
        <LoadingState />
      ) : memories.isError ? (
        <ErrorState error={memories.error} onRetry={() => void memories.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No memories yet' : 'Nothing to show here'}
          action={filter === 'all' && <ButtonLink to="/memories/new">Save your first memory</ButtonLink>}
        >
          {filter === 'all' && 'A short note or a two-minute voice message is plenty.'}
        </EmptyState>
      ) : (
        <ul className="memory-grid">
          {list.map((m, i) => {
            const mine = m.author_id === userId
            const art = m.kind === 'voice' ? voiceArt[i % voiceArt.length] : noteArt[i % noteArt.length]
            const title =
              m.title ||
              (m.kind === 'voice' ? 'Voice memory' : m.body.slice(0, 60) + (m.body.length > 60 ? '…' : ''))
            return (
              <Card as="li" key={m.id} className="memory-card">
                <Link to={`/memories/${m.id}`} className="memory-cover" aria-hidden="true" tabIndex={-1}>
                  <Artwork name={art} />
                  {!mine ? (
                    <Chip tone="peach" icon="people">
                      From your partner
                    </Chip>
                  ) : m.visibility === 'shared' ? (
                    <Chip tone="peach" icon="people">
                      Shared with partner
                    </Chip>
                  ) : (
                    <Chip tone="white" icon="lock">
                      Only you
                    </Chip>
                  )}
                </Link>
                <div className="memory-body">
                  <h2>
                    <Link to={`/memories/${m.id}`}>{title}</Link>
                  </h2>
                  {m.kind === 'text' && m.title && <p className="memory-excerpt">{m.body}</p>}
                  {m.kind === 'voice' && (
                    <div className="memory-voice">
                      <span className="play-circle" aria-hidden>
                        <Icon name="play" size={20} />
                      </span>
                      <span className="waveform" aria-hidden>
                        {bars.map((h, j) => (
                          <span key={j} style={{ height: `${h}px` }} />
                        ))}
                      </span>
                      <span>Voice memory</span>
                    </div>
                  )}
                  <p className="memory-card-date">
                    {formatDate(m.created_at)}
                    {m.state === 'deleting' && (
                      <>
                        {' '}
                        · <Badge tone="danger">Deleting</Badge>
                      </>
                    )}
                  </p>
                </div>
                <Icon name="leaf" size={26} className="memory-leaf" />
              </Card>
            )
          })}
        </ul>
      )}
    </div>
  )
}
