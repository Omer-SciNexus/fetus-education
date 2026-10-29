import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { useProgress, usePublished } from '@/lib/queries'
import { dailyInsight, recommend } from '@/lib/recommend'
import { effectiveStage } from '@/lib/stage'
import { Badge, ButtonLink, Card, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { ItemMeta } from '@/features/activities/ActivityView'
import type { PublishedItem } from '@/types/db'

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function linkFor(item: PublishedItem) {
  return item.kind === 'education' ? `/learn/${item.slug}` : `/activities/${item.slug}`
}

export default function TodayPage() {
  const { ctx } = useMember()
  const published = usePublished()
  const progress = useProgress()

  if (published.isPending || progress.isPending) return <LoadingState />
  if (published.isError) return <ErrorState error={published.error} onRetry={() => void published.refetch()} />
  if (progress.isError) return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />

  const items = published.data
  const completed = new Set(progress.data.keys())
  const paused = ctx.profile.content_paused
  const rec = recommend(items, {
    completed,
    stage: effectiveStage(ctx.pregnancy),
    paused,
    categories: ctx.profile.preferences.categories,
  })
  const insight = paused ? null : dailyInsight(items)
  const program = items.filter((i) => i.program_position !== null)
  const doneCount = program.filter((i) => completed.has(i.id)).length
  const name = ctx.profile.display_name

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}${name ? `, ${name}` : ''}`} subtitle={paused ? 'Here when you want it.' : 'One small moment is plenty.'} />

      {rec.next ? (
        <Card className="bg-peach-50">
          <p className="text-sm font-semibold uppercase tracking-wide text-peach-700">{paused ? 'A gentle suggestion' : 'Continue the program'}</p>
          <div className="mt-2">
            <ItemMeta item={rec.next} />
          </div>
          <h2 className="mt-2 text-2xl font-bold">{rec.next.version.title}</h2>
          <p className="mt-1 text-ink-soft">{rec.next.version.summary}</p>
          <ButtonLink to={linkFor(rec.next)} className="mt-4">
            Start
          </ButtonLink>
        </Card>
      ) : rec.programComplete ? (
        <Card className="bg-sage-50">
          <h2 className="text-xl font-bold">You've explored the whole program</h2>
          <p className="mt-1 text-ink-soft">Repeat any activity you enjoyed — there's no end date.</p>
          <ButtonLink to="/explore" className="mt-4">Choose an activity</ButtonLink>
        </Card>
      ) : null}

      {rec.alternative && (
        <Card>
          <p className="text-sm font-semibold text-ink-soft">Or try something different</p>
          <h2 className="mt-1 text-lg font-bold">
            <Link to={linkFor(rec.alternative)} className="hover:text-peach-700 hover:underline">
              {rec.alternative.version.title}
            </Link>
          </h2>
          <p className="text-ink-soft">{rec.alternative.version.summary}</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {!paused && program.length > 0 && (
          <Card>
            <h2 className="font-bold">Your program</h2>
            <p className="mt-1 text-ink-soft">
              {doneCount} of {program.length} activities done. Any order, any pace — skipping is fine.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ivory" aria-hidden>
              <div className="h-full rounded-full bg-sage-500" style={{ width: `${(doneCount / program.length) * 100}%` }} />
            </div>
          </Card>
        )}
        <Card>
          <h2 className="font-bold">Memories</h2>
          <p className="mt-1 text-ink-soft">Write a note or record your voice — private unless you share it.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/memories/new" variant="secondary">New memory</ButtonLink>
            <ButtonLink to="/memories" variant="ghost">View all</ButtonLink>
          </div>
        </Card>
      </div>

      {insight && (
        <Card>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">Today's card</p>
            {insight.version.is_placeholder && <Badge tone="warn">Placeholder</Badge>}
          </div>
          <h2 className="mt-1 text-lg font-bold">
            <Link to={`/learn/${insight.slug}`} className="hover:text-peach-700 hover:underline">
              {insight.version.title}
            </Link>
          </h2>
          <p className="text-ink-soft">{insight.version.summary}</p>
        </Card>
      )}
    </div>
  )
}
