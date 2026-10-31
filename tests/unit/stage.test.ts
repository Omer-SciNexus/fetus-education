import { describe, expect, it } from 'vitest'
import { effectiveStage, estimateStage, isPlausibleDueDate, parseDateOnly } from '../../src/lib/stage'

const now = new Date(2026, 9, 31, 12) // 31 Oct 2026, local noon

describe('parseDateOnly', () => {
  it('rejects malformed and impossible dates', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull()
    expect(parseDateOnly('31/10/2026')).toBeNull()
    expect(parseDateOnly('2026-10-31')).not.toBeNull()
  })
})

describe('estimateStage', () => {
  it('maps weeks to trimesters at the boundaries', () => {
    // Due in 40 weeks -> 0 weeks -> first
    expect(estimateStage('2027-08-07', now)?.stage).toBe('first')
    // Due in 27 weeks -> 13 weeks -> still first
    expect(estimateStage('2027-05-08', now)?.stage).toBe('first')
    // Due in 26 weeks -> 14 weeks -> second
    expect(estimateStage('2027-05-01', now)?.stage).toBe('second')
    // Due in 12 weeks -> 28 weeks -> third
    expect(estimateStage('2027-01-23', now)?.stage).toBe('third')
  })

  it('flags a passed due date without inventing anything', () => {
    const est = estimateStage('2026-10-20', now)
    expect(est?.pastDueDate).toBe(true)
    expect(est?.stage).toBe('third')
    expect(est?.approxWeeks).toBeLessThanOrEqual(42)
  })

  it('is stable across the time of day', () => {
    const morning = new Date(2026, 9, 31, 0, 5)
    const night = new Date(2026, 9, 31, 23, 55)
    expect(estimateStage('2027-01-23', morning)).toEqual(estimateStage('2027-01-23', night))
  })
})

describe('effectiveStage', () => {
  it('prefers the due date estimate', () => {
    expect(effectiveStage({ stage: 'first', due_date: '2027-01-23' }, now)).toBe('third')
  })
  it('uses the self-selected stage as-is when no date is given', () => {
    expect(effectiveStage({ stage: 'second', due_date: null }, now)).toBe('second')
  })
  it('returns null when nothing is shared', () => {
    expect(effectiveStage(null, now)).toBeNull()
    expect(effectiveStage({ stage: null, due_date: null }, now)).toBeNull()
  })
})

describe('isPlausibleDueDate', () => {
  it('accepts the backend range only', () => {
    expect(isPlausibleDueDate('2027-06-01', now)).toBe(true)
    expect(isPlausibleDueDate('2028-06-01', now)).toBe(false)
    expect(isPlausibleDueDate('2026-01-01', now)).toBe(false)
  })
})
