import { Link } from 'react-router'
import { useMember } from '@/lib/auth'
import { useProgress, usePublished } from '@/lib/queries'
import { dailyInsight, recommend } from '@/lib/recommend'
import { effectiveStage } from '@/lib/stage'
import { Badge, ButtonLink, Card, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { Artwork, contentArt } from '@/components/Artwork'
import { Icon } from '@/components/Icon'
import type { PublishedItem } from '@/types/db'
import { dailyPrompt } from '@/lib/prompts'
import { currentWeek, littleOne, WeekStrip } from '@/features/toolkit/shared'
import { recordPromptLink } from '@/features/toolkit/TalkPage'
import '@/features/toolkit/toolkit.css'

function linkFor(item: PublishedItem) {
  return item.kind === 'education' ? `/learn/${item.slug}` : `/activities/${item.slug}`
}

function Tile({
  to,
  tone,
  image,
  title,
  text,
}: {
  to: string
  tone?: 'blush' | 'sage'
  image: string
  title: string
  text: string
}) {
  return (
    <Link to={to} className={`tile ${tone ? `tile-${tone}` : ''}`}>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <Artwork name={image} />
      <span className="arrow-circle" aria-hidden>
        <Icon name="arrow" size={18} />
      </span>
    </Link>
  )
}

export default function TodayPage() {
  const { ctx } = useMember()
  const published = usePublished()
  const progress = useProgress()

  if (published.isPending || progress.isPending) return <LoadingState />
  if (published.isError)
    return <ErrorState error={published.error} onRetry={() => void published.refetch()} />
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
  const week = currentWeek(ctx)
  const prompt = dailyPrompt()

  return (
    <div>
      <PageHeader
        title={`A little moment for you${name ? `, ${name}` : ''}`}
        subtitle={paused ? 'Here when you want it.' : 'Connection today, a brighter tomorrow.'}
      />
      {week && (
        <div className="mb-6">
          <WeekStrip week={week} />
        </div>
      )}
      <div className="today-grid">
        <div className="today-top">
          {rec.next ? (
            <section className="featured-activity">
              <Artwork name={contentArt(rec.next, paused)} eager />
              <div className="feature-copy">
                <span className="feature-meta">
                  <Icon name="clock" size={16} />
                  About {rec.next.version.duration_minutes} minutes
                </span>
                <h2>{rec.next.version.title}</h2>
                <p>{rec.next.version.summary}</p>
                {rec.next.version.is_placeholder && (
                  <div className="badge-row">
                    <Badge tone="warn">Placeholder</Badge>
                  </div>
                )}
                <ButtonLink to={linkFor(rec.next)}>
                  Start activity <Icon name="arrow" size={18} />
                </ButtonLink>
              </div>
            </section>
          ) : rec.programComplete ? (
            <Card className="featured-activity">
              <div className="feature-copy">
                <span className="feature-meta">
                  <Icon name="leaf" size={16} />
                  All fourteen explored
                </span>
                <h2>You've explored the whole program</h2>
                <p>Repeat any activity you enjoyed. There's no end date.</p>
                <ButtonLink to="/explore">
                  Choose an activity <Icon name="arrow" size={18} />
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <Card className="featured-activity">
              <div className="feature-copy">
                <h2>A moment to make your own</h2>
                <p>Your memories are here whenever you need them.</p>
                <ButtonLink to="/memories">
                  Visit your memories <Icon name="arrow" size={18} />
                </ButtonLink>
              </div>
            </Card>
          )}
          {!paused && program.length > 0 && (
            <section className="journey-card">
              <h2>Your journey</h2>
              <p className="journey-count">
                {doneCount} of {program.length} activities explored
              </p>
              <div className="progress-dots" aria-hidden>
                {program.map((item) => (
                  <span key={item.id} className={`progress-dot ${completed.has(item.id) ? 'done' : ''}`} />
                ))}
              </div>
              <Artwork name="onboard-journey" />
              <p className="journey-note">Small moments can make a big difference.</p>
              <Link to="/explore?f=program" className="text-link">
                See the program <Icon name="arrow" size={15} />
              </Link>
            </section>
          )}
        </div>

        <aside className="dashboard-side">
          {insight ? (
            <Card className="insight-card">
              <div>
                <p className="eyebrow">This week</p>
                <h2>
                  <Link to={`/learn/${insight.slug}`}>{insight.version.title}</Link>
                </h2>
                <p>{insight.version.summary}</p>
                {insight.version.is_placeholder && (
                  <div className="mt-3">
                    <Badge tone="warn">Placeholder</Badge>
                  </div>
                )}
                <ButtonLink to={`/learn/${insight.slug}`} variant="secondary">
                  Read more <Icon name="arrow" size={16} />
                </ButtonLink>
              </div>
              <Artwork name={contentArt(insight)} />
            </Card>
          ) : (
            <Card className="insight-card">
              <div>
                <p className="eyebrow">A little insight</p>
                <h2>Your space, your pace</h2>
                <p>Pregnancy content is paused. Stories, quiet pauses and your memories are still here.</p>
                <ButtonLink to="/settings" variant="secondary">
                  Your space <Icon name="arrow" size={16} />
                </ButtonLink>
              </div>
              <Artwork name="today-your-space" />
            </Card>
          )}
          <Card className="today-talk">
            <p className="eyebrow">Today’s little conversation</p>
            <h2>{prompt}</h2>
            <p className="text-sm text-ink-soft">
              Say it to {littleOne(ctx)} in your everyday voice. A minute is plenty, and skipping is fine.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink to={recordPromptLink(prompt)} variant="secondary">
                <Icon name="mic" size={16} /> Record it
              </ButtonLink>
              <Link to="/talk" className="text-link self-center">
                More ideas <Icon name="arrow" size={14} />
              </Link>
            </div>
          </Card>
          <Card className="privacy-note">
            <span className="icon-tile">
              <Icon name="lock" size={20} />
            </span>
            <div>
              <p>A space just for you. Memories stay private unless you choose to share them.</p>
              <Link to="/settings/privacy" className="text-link">
                Your privacy <Icon name="arrow" size={14} />
              </Link>
            </div>
          </Card>
        </aside>

        <section className="tiles" aria-label="More for today">
          {rec.alternative ? (
            <Tile
              to={linkFor(rec.alternative)}
              image={contentArt(rec.alternative, paused)}
              title={rec.alternative.version.title}
              text={rec.alternative.version.summary || 'Something a little different.'}
            />
          ) : (
            <Tile
              to="/explore"
              image={paused ? 'a-calm-place' : 'quiet-pause'}
              title="A quiet pause"
              text="Take a few breaths together."
            />
          )}
          <Tile
            to="/memories/new"
            tone="blush"
            image={paused ? 'journal' : 'today-family-story'}
            title="A family story"
            text="Capture a memory for the road ahead."
          />
          <Tile
            to="/memories"
            tone="sage"
            image="today-saved"
            title="Your saved moments"
            text="A collection of what matters most."
          />
        </section>
      </div>
    </div>
  )
}
