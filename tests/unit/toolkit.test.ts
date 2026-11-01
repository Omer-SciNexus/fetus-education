import { describe, expect, it } from 'vitest'
import { daysToGoLabel, pregnancyWeek, weekInfo, weeks, FIRST_WEEK, LAST_WEEK } from '../../src/lib/weeks'
import { dueDateFromLmp, estimateStage } from '../../src/lib/stage'
import { dailyPrompt, lullabies, talkPrompts } from '../../src/lib/prompts'
import { breathPhase } from '../../src/lib/breathe'

const now = new Date(2026, 10, 1, 12) // 1 Nov 2026, local noon

describe('week guide data', () => {
  it('covers every week from 4 to 40 once, in order', () => {
    expect(weeks.map((w) => w.week)).toEqual(
      Array.from({ length: LAST_WEEK - FIRST_WEEK + 1 }, (_, i) => FIRST_WEEK + i),
    )
    for (const w of weeks) {
      expect(w.size).toBeTruthy()
      expect(w.highlight).toBeTruthy()
      expect(w.idea).toBeTruthy()
    }
  })

  it('makes no development or intelligence claims', () => {
    const text = weeks.map((w) => `${w.highlight} ${w.idea}`).join(' ').toLowerCase()
    for (const banned of ['iq', 'intelligen', 'smarter', 'brain boost', 'cognitive']) {
      expect(text).not.toContain(banned)
    }
  })

  it('clamps out-of-range weeks', () => {
    expect(weekInfo(1).week).toBe(FIRST_WEEK)
    expect(weekInfo(45).week).toBe(LAST_WEEK)
    expect(weekInfo(24).size).toBe('an ear of corn')
  })
})

describe('pregnancyWeek', () => {
  it('counts completed weeks back from the due date', () => {
    // Due in exactly 16 weeks -> 24 completed weeks.
    expect(pregnancyWeek('2027-02-21', now)).toEqual({ week: 24, daysToGo: 112, pastDueDate: false })
    // Due today -> 40 weeks.
    expect(pregnancyWeek('2026-11-01', now)?.week).toBe(40)
  })

  it('agrees with the trimester estimate used for content', () => {
    for (const due of ['2027-02-21', '2027-05-01', '2027-07-30', '2026-12-01']) {
      expect(pregnancyWeek(due, now)?.week).toBe(estimateStage(due, now)?.approxWeeks)
    }
  })

  it('flags a passed due date without advancing past 42', () => {
    const w = pregnancyWeek('2026-09-01', now)!
    expect(w.pastDueDate).toBe(true)
    expect(w.week).toBe(42)
    expect(daysToGoLabel(w.daysToGo)).toBe('Your estimated due date has passed')
  })

  it('rejects malformed dates', () => {
    expect(pregnancyWeek('2026-13-01', now)).toBeNull()
  })

  it('labels the countdown', () => {
    expect(daysToGoLabel(0)).toBe('Your estimated due date is today')
    expect(daysToGoLabel(1)).toBe('1 day to your estimated due date')
    expect(daysToGoLabel(12)).toBe('12 days to your estimated due date')
  })
})

describe('dueDateFromLmp', () => {
  it('adds 280 days', () => {
    expect(dueDateFromLmp('2026-09-01', now)).toBe('2027-06-08')
    expect(dueDateFromLmp('2026-11-01', now)).toBe('2027-08-08')
  })

  it('rejects future and implausibly old dates', () => {
    expect(dueDateFromLmp('2026-11-02', now)).toBeNull()
    expect(dueDateFromLmp('2025-12-01', now)).toBeNull()
    expect(dueDateFromLmp('not-a-date', now)).toBeNull()
  })
})

describe('little conversations', () => {
  it('keeps the same prompt all day and changes the next day', () => {
    const morning = dailyPrompt(new Date(2026, 10, 1, 7))
    expect(dailyPrompt(new Date(2026, 10, 1, 23))).toBe(morning)
    expect(dailyPrompt(new Date(2026, 10, 2, 7))).not.toBe(morning)
    expect(talkPrompts).toContain(morning)
  })

  it('credits every lullaby as public domain', () => {
    for (const l of lullabies) expect(l.origin).toMatch(/public domain/i)
  })
})

describe('breathPhase', () => {
  it('breathes in for 4 seconds and out for 6', () => {
    expect(breathPhase(0)).toEqual({ phase: 'in', secondsLeft: 4 })
    expect(breathPhase(3)).toEqual({ phase: 'in', secondsLeft: 1 })
    expect(breathPhase(4)).toEqual({ phase: 'out', secondsLeft: 6 })
    expect(breathPhase(9)).toEqual({ phase: 'out', secondsLeft: 1 })
    expect(breathPhase(10)).toEqual({ phase: 'in', secondsLeft: 4 })
  })
})
