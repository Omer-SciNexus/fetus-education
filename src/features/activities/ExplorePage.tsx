import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useFavorites, useProgress, usePublished } from '@/lib/queries'
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, TextInput, cx } from '@/components/ui'
import { ItemCard } from './ActivityView'
import type { PublishedItem } from '@/types/db'

const filters = [
  { key: 'program', label: 'Program' },
  { key: 'stories', label: 'Stories' },
  { key: 'calm', label: 'Calm' },
  { key: 'learn', label: 'Learn' },
  { key: 'favorites', label: 'Favourites' },
  { key: 'all', label: 'All' },
] as const
type FilterKey = (typeof filters)[number]['key']

function hrefFor(i: PublishedItem) {
  return i.kind === 'education' ? `/learn/${i.slug}` : `/activities/${i.slug}`
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const filter = (filters.find((f) => f.key === params.get('f'))?.key ?? 'program') as FilterKey
  const [q, setQ] = useState('')
  const published = usePublished()
  const progress = useProgress()
  const favorites = useFavorites()

  const list = useMemo(() => {
    const items = published.data ?? []
    const fav = favorites.data ?? new Set<string>()
    const byFilter = items.filter((i) => {
      switch (filter) {
        case 'program':
          return i.program_position !== null
        case 'stories':
          return i.kind === 'story'
        case 'calm':
          return i.kind === 'audio' || (i.kind === 'activity' && i.category === 'calm')
        case 'learn':
          return i.kind === 'education'
        case 'favorites':
          return fav.has(i.id)
        default:
          return true
      }
    })
    const needle = q.trim().toLowerCase()
    return needle
      ? byFilter.filter((i) => `${i.version.title} ${i.version.summary}`.toLowerCase().includes(needle))
      : byFilter
  }, [published.data, favorites.data, filter, q])

  return (
    <div className="space-y-5">
      <PageHeader title="Explore" subtitle="Activities, stories, calm scripts and short learning cards." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'primary' : 'secondary'}
            aria-pressed={filter === f.key}
            className="min-h-9 px-4 py-1.5 text-sm"
            onClick={() => setParams(f.key === 'program' ? {} : { f: f.key }, { replace: true })}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div>
        <label htmlFor="search" className="sr-only">Search</label>
        <TextInput id="search" type="search" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {published.isPending ? (
        <LoadingState />
      ) : published.isError ? (
        <ErrorState error={published.error} onRetry={() => void published.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title={q ? 'Nothing matches your search.' : filter === 'favorites' ? 'No favourites yet.' : 'Nothing here yet.'}>
          {filter === 'favorites' && 'Tap the heart on any activity to keep it here.'}
        </EmptyState>
      ) : (
        <ul className={cx('grid gap-4 sm:grid-cols-2')}>
          {list.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              to={hrefFor(i)}
              done={progress.data?.has(i.id)}
              favorite={favorites.data?.has(i.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
