// Week-by-week guide (docs/research/prenatal-platforms.md §4).
// PLACEHOLDER CONTENT awaiting clinical review. Figures are typical, rounded values
// for general interest only. They are never used to say anything about a particular
// baby (plan §9), and the guide is hidden while pregnancy content is paused.
import { parseDateOnly, todayUtc } from './stage'

export const FIRST_WEEK = 4
export const LAST_WEEK = 40

export interface WeekInfo {
  week: number
  /** Everyday comparison, e.g. "a lime". */
  size: string
  /** Typical length, rounded. Head-to-bottom until about week 20, head-to-heel after. */
  length: string
  /** General, non-diagnostic note about what often happens around this time. */
  highlight: string
  /** A small bonding idea for the parent. */
  idea: string
}

const ideas = [
  'Say good morning out loud, using the nickname you like best.',
  'Read one page of any book you enjoy, slowly and in your normal voice.',
  'Tell your little one about the weather today and how it feels outside.',
  'Hum a tune you remember from your own childhood.',
  'Take three slow breaths with a hand resting wherever feels comfortable.',
  'Describe the room you are sitting in, as if giving a gentle tour.',
  'Ask your partner or a friend to share one hope for the year ahead.',
  'Write down one thing you would like to remember about this week.',
  'Tell a short story about someone in your family.',
  'Listen to a piece of music you love and notice how it makes you feel.',
  'Talk about a place you would like to visit together one day.',
  'Record a two-minute voice memory, just saying hello.',
] as const

const table: [number, string, string, string][] = [
  [4, 'a poppy seed', 'about 1 mm', 'Many people are only just finding out they are pregnant around now.'],
  [5, 'a sesame seed', 'about 2 mm', 'The earliest structures are beginning to form.'],
  [6, 'a lentil', 'about 5 mm', 'A tiny heart-like tube has usually begun to pulse.'],
  [7, 'a blueberry', 'about 1 cm', 'Small buds that will become arms and legs are appearing.'],
  [8, 'a raspberry', 'about 1.6 cm', 'Fingers and toes are beginning to take shape.'],
  [9, 'a cherry', 'about 2.3 cm', 'The face is slowly forming, with the beginnings of eyelids.'],
  [10, 'a strawberry', 'about 3 cm', 'Most major organs have started to form and will keep developing.'],
  [11, 'a fig', 'about 4 cm', 'Tiny movements often begin, far too small to feel yet.'],
  [12, 'a lime', 'about 5.5 cm', 'Many people have a dating scan around this time.'],
  [13, 'a lemon', 'about 7 cm', 'The first trimester is coming to a close.'],
  [14, 'a nectarine', 'about 8.5 cm', 'Facial muscles are developing and small expressions may appear on scans.'],
  [15, 'an apple', 'about 10 cm', 'Light can often be sensed through closed eyelids.'],
  [16, 'an avocado', 'about 11.5 cm', 'Some people begin to notice a gentle fluttering from now on, others later.'],
  [17, 'a pear', 'about 13 cm', 'A protective layer of fat is beginning to build up.'],
  [18, 'a bell pepper', 'about 14 cm', 'The structures of the inner ear are developing.'],
  [19, 'a mango', 'about 15 cm', 'Many people have a mid-pregnancy scan around this time.'],
  [20, 'a banana', 'about 25 cm, head to heel', 'Halfway. From here, lengths are measured from head to heel.'],
  [21, 'a carrot', 'about 27 cm', 'Movements may feel more like nudges than flutters.'],
  [22, 'a spaghetti squash', 'about 28 cm', 'Eyebrows and eyelashes are forming.'],
  [23, 'a grapefruit', 'about 29 cm', 'Sounds from outside may increasingly reach your little one.'],
  [24, 'an ear of corn', 'about 30 cm', 'Hearing is developing, and familiar voices are a lovely thing to share.'],
  [25, 'a cauliflower', 'about 34 cm', 'Some babies may respond to sound with movement from around now.'],
  [26, 'a head of lettuce', 'about 36 cm', 'The eyes may begin to open over the coming weeks.'],
  [27, 'a head of cabbage', 'about 37 cm', 'The second trimester is drawing to a close.'],
  [28, 'an aubergine', 'about 38 cm', 'Welcome to the third trimester. Patterns of rest and activity often become noticeable.'],
  [29, 'a butternut squash', 'about 39 cm', 'Muscles and lungs keep maturing.'],
  [30, 'a large cucumber', 'about 40 cm', 'Your little one has a little less room to stretch from here.'],
  [31, 'a coconut', 'about 41 cm', 'Growth continues steadily, mostly through gaining weight.'],
  [32, 'a jicama', 'about 42 cm', 'Many people start thinking about what to pack for the birth.'],
  [33, 'a pineapple', 'about 44 cm', 'Bones are hardening, apart from the skull, which stays flexible.'],
  [34, 'a cantaloupe', 'about 45 cm', 'A good week to talk with your care provider about your birth preferences.'],
  [35, 'a honeydew melon', 'about 46 cm', 'Most growth now is in weight rather than length.'],
  [36, 'a romaine lettuce', 'about 47 cm', 'Many babies settle into a head-down position around now.'],
  [37, 'a bunch of chard', 'about 48 cm', 'Getting closer. Keep your care provider’s contact details close by.'],
  [38, 'a leek', 'about 49 cm', 'Your little one is practising skills like sucking and grasping.'],
  [39, 'a small watermelon', 'about 50 cm', 'Any day now, or a little later. Both are common.'],
  [40, 'a pumpkin', 'about 51 cm', 'Your estimated due date. Only a small share of babies arrive on that exact day.'],
]

export const weeks: WeekInfo[] = table.map(([week, size, length, highlight]) => ({
  week,
  size,
  length,
  highlight,
  idea: ideas[week % ideas.length],
}))

export function weekInfo(week: number): WeekInfo {
  const w = Math.max(FIRST_WEEK, Math.min(LAST_WEEK, Math.round(week)))
  return weeks[w - FIRST_WEEK]
}

export interface PregnancyWeek {
  /** Approximate completed weeks, the way most trackers say "24 weeks pregnant". */
  week: number
  /** Days until the estimated due date; negative once it has passed. */
  daysToGo: number
  pastDueDate: boolean
}

/**
 * Approximate pregnancy week from an estimated due date (due date = start of week 41,
 * i.e. 280 days after the first day of the last period). An estimate only.
 */
export function pregnancyWeek(dueDate: string, now: Date = new Date()): PregnancyWeek | null {
  const due = parseDateOnly(dueDate)
  if (due === null) return null
  const daysToGo = Math.round((due - todayUtc(now)) / 86_400_000)
  const daysPregnant = 280 - daysToGo
  const week = Math.max(0, Math.min(42, Math.floor(daysPregnant / 7)))
  return { week, daysToGo, pastDueDate: daysToGo < 0 }
}

export function daysToGoLabel(days: number): string {
  if (days < 0) return 'Your estimated due date has passed'
  if (days === 0) return 'Your estimated due date is today'
  if (days === 1) return '1 day to your estimated due date'
  return `${days} days to your estimated due date`
}
