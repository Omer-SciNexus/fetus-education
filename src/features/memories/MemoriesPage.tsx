import { useState } from 'react'
import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { useMemories } from '@/lib/queries'
import { formatDate } from '@/lib/format'
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import type { Memory } from '@/types/db'

type Filter = 'all' | 'mine' | 'partner'

export function MemoryBadges({ memory, mine }: { memory: Memory; mine: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={memory.kind === 'voice' ? 'peach' : 'neutral'}>{memory.kind === 'voice' ? '🎙 Voice' : '✎ Note'}</Badge>
      <Badge tone={memory.visibility === 'shared' ? 'sage' : 'neutral'}>{memory.visibility === 'shared' ? 'Shared' : 'Private'}</Badge>
      {!mine && <Badge>From your partner</Badge>}
      {memory.state === 'deleting' && <Badge tone="danger">Deleting</Badge>}
    </div>
  )
}

export default function MemoriesPage() {
  const { userId } = useMember()
  const memories = useMemories()
  const [filter, setFilter] = useState<Filter>('all')

  const list = (memories.data ?? []).filter((m) =>
    filter === 'mine' ? m.author_id === userId : filter === 'partner' ? m.author_id !== userId : true,
  )
  const hasPartnerEntries = (memories.data ?? []).some((m) => m.author_id !== userId)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Memories"
        subtitle="Private unless you choose to share."
        action={<ButtonLink to="/memories/new">New memory</ButtonLink>}
      />

      {(hasPartnerEntries || filter !== 'all') && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {(['all', 'mine', 'partner'] as Filter[]).map((f) => (
            <Button key={f} variant={filter === f ? 'primary' : 'secondary'} aria-pressed={filter === f} className="min-h-9 px-4 py-1.5 text-sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : "Partner's shared"}
            </Button>
          ))}
        </div>
      )}

      {memories.isPending ? (
        <LoadingState />
      ) : memories.isError ? (
        <ErrorState error={memories.error} onRetry={() => void memories.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title={filter === 'all' ? 'No memories yet' : 'Nothing to show'} action={filter === 'all' && <ButtonLink to="/memories/new">Save your first memory</ButtonLink>}>
          {filter === 'all' && 'A short note or a two-minute voice message is plenty.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <Card as="li" key={m.id}>
              <MemoryBadges memory={m} mine={m.author_id === userId} />
              <h2 className="mt-2 text-lg font-bold">
                <Link to={`/memories/${m.id}`} className="hover:text-peach-700 hover:underline">
                  {m.title || (m.kind === 'voice' ? 'Voice memory' : m.body.slice(0, 60) + (m.body.length > 60 ? '…' : ''))}
                </Link>
              </h2>
              <p className="text-sm text-ink-soft">{formatDate(m.created_at)}</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
