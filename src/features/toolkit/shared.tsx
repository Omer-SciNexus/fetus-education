import { Link } from 'react-router'
import type { MyContext } from '@/types/db'
import { daysToGoLabel, pregnancyWeek, weekInfo, FIRST_WEEK, type PregnancyWeek } from '@/lib/weeks'
import { Icon } from '@/components/Icon'

/**
 * The approximate week, or null when there is no due date, the partner can't see
 * pregnancy details, or pregnancy content is paused (it must disappear on pause).
 */
export function currentWeek(ctx: MyContext): PregnancyWeek | null {
  if (ctx.profile.content_paused || !ctx.pregnancy?.due_date) return null
  return pregnancyWeek(ctx.pregnancy.due_date)
}

/** "your little one", or the bump nickname the owner chose. */
export function littleOne(ctx: MyContext): string {
  return ctx.pregnancy?.nickname?.trim() || 'your little one'
}

export function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Compact strip on Today: week, typical size, countdown. */
export function WeekStrip({ week }: { week: PregnancyWeek }) {
  const info = week.week >= FIRST_WEEK && !week.pastDueDate ? weekInfo(week.week) : null
  return (
    <Link to="/weeks" className="week-strip">
      <span className="week-strip-num" aria-hidden>
        {week.week}
      </span>
      <span className="week-strip-text">
        <strong>
          Around week {week.week}
          {info && <> · typically about the size of {info.size}</>}
        </strong>
        <span>{daysToGoLabel(week.daysToGo)} (an estimate)</span>
      </span>
      <span className="arrow-circle" aria-hidden>
        <Icon name="arrow" size={18} />
      </span>
    </Link>
  )
}

export function BackToSpace() {
  return (
    <Link to="/settings" className="text-link">
      <Icon name="back" size={16} /> Your space
    </Link>
  )
}
