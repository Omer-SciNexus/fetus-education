// Optional calendar reminders (section 5): an .ics file the user imports themselves.
// Titles are deliberately neutral and contain no pregnancy details (section 13.3).

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export interface ReminderOptions {
  /** Local time, HH:MM. */
  time: string
  days: Weekday[]
  /** First date to consider, YYYY-MM-DD. */
  startDate: string
  uid: string
  now?: Date
}

const JS_DAY: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function utcStamp(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function buildReminderIcs(opts: ReminderOptions): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opts.time)) throw new Error('invalid_time')
  if (!opts.days.length) throw new Error('no_days')
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.startDate)
  if (!m) throw new Error('invalid_date')

  // First occurrence on or after startDate that falls on a selected weekday.
  const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const wanted = new Set(opts.days.map((d) => JS_DAY[d]))
  for (let i = 0; i < 7 && !wanted.has(start.getDay()); i++) start.setDate(start.getDate() + 1)

  const [hh, mm] = opts.time.split(':')
  // Floating local time: the calendar app keeps it at the same wall-clock time.
  const dtstart = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${hh}${mm}00`
  const order: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const byday = order.filter((d) => opts.days.includes(d)).join(',')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Little Bloom//Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@little-bloom`,
    `DTSTAMP:${utcStamp(opts.now ?? new Date())}`,
    `DTSTART:${dtstart}`,
    'DURATION:PT10M',
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    `SUMMARY:${escapeIcsText('Quiet moment')}`,
    `DESCRIPTION:${escapeIcsText('A reminder you created. Delete this event in your calendar app to stop it.')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n') + '\r\n'
}
