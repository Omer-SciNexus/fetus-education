import { Link, useSearchParams } from 'react-router'
import { useMember } from '@/lib/auth'
import { daysToGoLabel, weekInfo, weeks, FIRST_WEEK, LAST_WEEK } from '@/lib/weeks'
import { ButtonLink, Card, Notice, PageHeader } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { PlaceholderBanner } from '@/features/activities/ActivityView'
import { BackToSpace, currentWeek, littleOne } from './shared'
import './toolkit.css'

export default function WeeksPage() {
  const { ctx } = useMember()
  const [params, setParams] = useSearchParams()
  const isOwner = ctx.membership?.role === 'owner'

  if (ctx.profile.content_paused) {
    return (
      <div className="form-page mx-auto space-y-5">
        <BackToSpace />
        <PageHeader title="Week by week" />
        <Notice tone="info" title="Pregnancy content is paused">
          The weekly guide is hidden while pregnancy content is paused. Your memories and quiet moments are still here.{' '}
          <Link className="underline" to="/settings">
            Change in Your space
          </Link>
        </Notice>
      </div>
    )
  }

  const current = currentWeek(ctx)
  const fallback = current && current.week >= FIRST_WEEK ? Math.min(current.week, LAST_WEEK) : 12
  const requested = Number(params.get('w'))
  const shown = Number.isInteger(requested) && requested >= FIRST_WEEK && requested <= LAST_WEEK ? requested : fallback
  const info = weekInfo(shown)
  const isNow = current?.week === shown
  const go = (w: number) => setParams({ w: String(w) }, { replace: true })

  return (
    <div className="form-page mx-auto space-y-5">
      <BackToSpace />
      <PageHeader
        title="Week by week"
        subtitle="What typically happens around each week. Every pregnancy is different, and none of this is about your baby in particular."
      />

      {current ? (
        <p className="week-countdown">
          <Icon name="sun" size={18} /> Around week {current.week} · {daysToGoLabel(current.daysToGo)}. Dates are estimates.
        </p>
      ) : (
        <Notice tone="info">
          {isOwner ? (
            <>
              Add an estimated due date and this page opens at your week.{' '}
              <Link className="underline" to="/settings/preferences">
                Add a due date
              </Link>
            </>
          ) : (
            'Browse any week below. If the account owner shares pregnancy details, this page opens at your week.'
          )}
        </Notice>
      )}

      <PlaceholderBanner />

      <Card className="week-card">
        <div className="week-card-head">
          <span className="week-num" aria-hidden>
            {shown}
          </span>
          <div>
            <p className="eyebrow">{isNow ? 'This week' : `Week ${shown}`}</p>
            <h2>Typically about the size of {info.size}</h2>
            <p className="text-ink-soft">Typical length: {info.length}. Sizes vary a lot, and that’s normal.</p>
          </div>
        </div>
        <p className="week-highlight">{info.highlight}</p>
        <div className="week-idea">
          <Icon name="heart" size={18} />
          <div>
            <h3>A small idea for this week</h3>
            <p>{info.idea}</p>
          </div>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-button" disabled={shown <= FIRST_WEEK} onClick={() => go(shown - 1)} aria-label="Previous week">
            <Icon name="back" size={20} />
          </button>
          <label className="week-select">
            <span className="sr-only">Choose a week</span>
            <select value={shown} onChange={(e) => go(Number(e.target.value))} className="lb-input border px-3 py-2">
              {weeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Week {w.week}
                  {current?.week === w.week ? ' (now)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="icon-button" disabled={shown >= LAST_WEEK} onClick={() => go(shown + 1)} aria-label="Next week">
            <Icon name="arrow" size={20} />
          </button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Make it a moment</h2>
        <p className="text-ink-soft">Tell {littleOne(ctx)} about your week, or save a note to look back on.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/talk">
            Today’s little conversation <Icon name="arrow" size={16} />
          </ButtonLink>
          <ButtonLink to={`/memories/new?title=${encodeURIComponent(`Week ${shown}`)}`} variant="secondary">
            Write a note for week {shown}
          </ButtonLink>
        </div>
      </Card>

      <p className="text-sm text-ink-soft">
        If something worries you, about movements, pain, bleeding or anything else, contact your care provider or emergency
        services straight away. Don’t wait for an app.
      </p>
    </div>
  )
}
