import { useState } from 'react'
import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { useMemories } from '@/lib/queries'
import { formatDate } from '@/lib/format'
import { Button, ButtonLink, EmptyState, ErrorState, LoadingState, PageHeader, Segmented } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { capitalise, littleOne } from '@/features/toolkit/shared'
import '@/features/toolkit/toolkit.css'

/**
 * A printable keepsake (like 280days' baby book), built entirely in the browser from
 * memories the reader can already see. "Save as PDF" in the print dialog keeps a copy.
 */
export default function KeepsakeBookPage() {
  const { ctx, userId } = useMember()
  const memories = useMemories()
  const [scope, setScope] = useState<'mine' | 'shared'>('mine')

  if (memories.isPending) return <LoadingState />
  if (memories.isError) return <ErrorState error={memories.error} onRetry={() => void memories.refetch()} />

  const hasPartnerEntries = memories.data.some((m) => m.author_id !== userId)
  const entries = memories.data
    .filter((m) => m.state === 'active')
    .filter((m) => scope === 'shared' || m.author_id === userId)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const who = capitalise(littleOne(ctx))
  const from = entries[0]?.created_at
  const to = entries[entries.length - 1]?.created_at

  return (
    <div className="space-y-6">
      <div className="no-print space-y-5">
        <Link to="/memories" className="text-link">
          <Icon name="back" size={16} /> Memories
        </Link>
        <PageHeader
          title="Keepsake book"
          subtitle="Your memories, gathered into one page. Print it, or choose “Save as PDF” in the print window."
          action={
            entries.length > 0 && (
              <Button onClick={() => window.print()}>
                <Icon name="printer" size={18} /> Print or save as PDF
              </Button>
            )
          }
        />
        {hasPartnerEntries && (
          <div className="max-w-md">
            <Segmented
              label="Include"
              value={scope}
              onChange={setScope}
              options={[
                { key: 'mine', label: 'My memories', icon: 'user' },
                { key: 'shared', label: 'With partner’s shared', icon: 'people' },
              ]}
            />
          </div>
        )}
        <p className="toolkit-note">
          <Icon name="lock" size={16} /> The book is made on this device. Nothing is uploaded or shared.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Your book is waiting" action={<ButtonLink to="/memories/new">Save a first memory</ButtonLink>}>
          Notes and voice memories you save will appear here.
        </EmptyState>
      ) : (
        <article className="keepsake-book">
          <header className="keepsake-cover">
            <p className="eyebrow">Little Bloom</p>
            <h2>{who === 'Your little one' ? 'For our little one' : `For ${who}`}</h2>
            <p>
              {entries.length} {entries.length === 1 ? 'memory' : 'memories'}
              {from && to && ` · ${formatDate(from)} – ${formatDate(to)}`}
            </p>
          </header>
          <ol className="keepsake-entries">
            {entries.map((m) => (
              <li key={m.id}>
                <p className="keepsake-date">
                  {formatDate(m.created_at)}
                  {m.author_id !== userId && ' · from your partner'}
                </p>
                <h3>{m.title || (m.kind === 'voice' ? 'A voice memory' : 'A little note')}</h3>
                {m.body && <p className="keepsake-body">{m.body}</p>}
                {m.kind === 'voice' && (
                  <p className="keepsake-voice">
                    <Icon name="mic" size={14} /> Voice memory. Listen to it in Little Bloom, or download it from the
                    memory page.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  )
}
