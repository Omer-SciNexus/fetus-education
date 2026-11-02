import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useFavorites, useProgress, usePublished } from '@/lib/queries'
import { ButtonLink, Card, EmptyState, ErrorState, LoadingState, PageHeader, Pills, TextInput } from '@/components/ui'
import { Artwork, contentArt } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import { ItemCard } from './ActivityView'
import type { PublishedItem } from '@/types/db'
import { DevelopmentJourney } from '@/features/development/DevelopmentJourney'
import { useMember } from '@/lib/auth'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'program', label: 'The program' },
  { key: 'stories', label: 'Stories' },
  { key: 'calm', label: 'Quiet moments' },
  { key: 'together', label: 'Together' },
  { key: 'learn', label: 'Learn' },
  { key: 'favorites', label: 'Saved' },
] as const
type FilterKey = (typeof filters)[number]['key']

function hrefFor(i: PublishedItem) {
  return i.kind === 'education' ? `/learn/${i.slug}` : `/activities/${i.slug}`
}

function ProgramList({
  items,
  completed,
  paused,
}: {
  items: PublishedItem[]
  completed: ReadonlySet<string>
  paused: boolean
}) {
  const next = items.find((i) => !completed.has(i.id))
  return (
    <div className="program-layout">
      <ol className="program-list">
        {items.map((i) => {
          const done = completed.has(i.id)
          return (
            <li key={i.id}>
              <Link to={hrefFor(i)} className={`program-row ${done ? 'done' : ''}`}>
                <span className="program-number" aria-hidden>
                  {i.program_position}
                </span>
                <Artwork name={contentArt(i, paused)} />
                <span>
                  <h3>{i.version.title}</h3>
                  <p>
                    {i.version.duration_minutes} min{done ? ' · Explored' : ''}
                  </p>
                </span>
                <span className="program-state" aria-label={done ? 'Explored' : 'Not yet explored'}>
                  <Icon name={done ? 'check' : 'arrow'} size={18} />
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <Card className="program-side">
        <Artwork name="solo-reading" />
        <div>
          <h2>Continue your journey</h2>
          <Icon name="leaf" size={26} className="leaf" />
          <p>Take time for what feels good today. Every moment matters.</p>
          <ButtonLink to={next ? hrefFor(next) : '/explore'}>
            {next ? 'Choose an activity' : 'Explore everything'} <Icon name="arrow" size={17} />
          </ButtonLink>
        </div>
      </Card>
    </div>
  )
}

export default function ExplorePage() {
  const { ctx } = useMember()
  const [params, setParams] = useSearchParams()
  const filter = (filters.find((f) => f.key === params.get('f'))?.key ?? 'all') as FilterKey
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
        case 'together':
          return !!i.version.together_steps.trim()
        case 'learn':
          return i.kind === 'education'
        case 'favorites':
          return fav.has(i.id)
        default:
          return true
      }
    })
    const sorted =
      filter === 'program'
        ? [...byFilter].sort((a, b) => (a.program_position ?? 0) - (b.program_position ?? 0))
        : byFilter
    const needle = q.trim().toLowerCase()
    return needle
      ? sorted.filter((i) => `${i.version.title} ${i.version.summary}`.toLowerCase().includes(needle))
      : sorted
  }, [published.data, favorites.data, filter, q])

  const programCount = (published.data ?? []).filter((i) => i.program_position !== null).length
  const isProgram = filter === 'program' && !q.trim()
  const completed = progress.data ?? new Map<string, string>()

  return (
    <div>
      <PageHeader
        title={isProgram ? `${programCount || 14} little moments of connection` : 'Find your next little moment'}
        subtitle={
          isProgram
            ? 'Explore at your own pace. Repeat what you enjoy.'
            : 'A story to share, a moment to pause, something new to discover.'
        }
        action={
          <div className="library-search">
            <Icon name="search" size={18} />
            <label htmlFor="search" className="sr-only">
              Search activities
            </label>
            <TextInput
              id="search"
              type="search"
              placeholder="Search activities"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />

      {!ctx.profile.content_paused && (
        <div className="mb-7">
          <DevelopmentJourney />
        </div>
      )}
      <div className="library-toolbar">
        <Pills
          label="Filter"
          options={filters}
          value={filter}
          onChange={(key) => setParams(key === 'all' ? {} : { f: key }, { replace: true })}
        />
      </div>
      {published.isPending ? (
        <LoadingState />
      ) : published.isError ? (
        <ErrorState error={published.error} onRetry={() => void published.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          art="story-garden"
          title={
            q
              ? 'Nothing matches your search.'
              : filter === 'favorites'
                ? 'Nothing saved yet.'
                : 'Nothing here yet.'
          }
        >
          {filter === 'favorites' && 'Tap the bookmark on any activity to keep it here.'}
        </EmptyState>
      ) : isProgram ? (
        <ProgramList items={list} completed={new Set(completed.keys())} paused={ctx.profile.content_paused} />
      ) : (
        <ul className="library-grid">
          {list.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              to={hrefFor(i)}
              done={completed.has(i.id)}
              favorite={favorites.data?.has(i.id)}
              paused={ctx.profile.content_paused}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
