import type { Stage } from '@/types/db'

const DAY = 86_400_000

/** Parses YYYY-MM-DD as a calendar date (no timezone shifts). */
export function parseDateOnly(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = Date.UTC(y, mo - 1, d)
  const check = new Date(t)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null
  return t
}

/** Today's local calendar date as a UTC midnight timestamp. */
export function todayUtc(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

export function toDateOnly(t: number): string {
  return new Date(t).toISOString().slice(0, 10)
}

export interface StageEstimate {
  stage: Stage
  /** Approximate completed weeks, for content selection only. */
  approxWeeks: number
  pastDueDate: boolean
}

/**
 * Derives an APPROXIMATE stage from an estimated due date (section 9).
 * Used only to choose content. Never used to infer anything about fetal health.
 */
export function estimateStage(dueDate: string, now: Date = new Date()): StageEstimate | null {
  const due = parseDateOnly(dueDate)
  if (due === null) return null
  const daysUntilDue = Math.round((due - todayUtc(now)) / DAY)
  const weeks = Math.floor(40 - daysUntilDue / 7)
  const approxWeeks = Math.max(0, Math.min(42, weeks))
  const stage: Stage = approxWeeks < 14 ? 'first' : approxWeeks < 28 ? 'second' : 'third'
  return { stage, approxWeeks, pastDueDate: daysUntilDue < 0 }
}

/**
 * The stage used for content selection: an estimate from the due date when one is
 * supplied, otherwise the self-selected stage as-is (never silently advanced).
 */
export function effectiveStage(
  pregnancy: { stage: Stage | null; due_date: string | null } | null,
  now: Date = new Date(),
): Stage | null {
  if (!pregnancy) return null
  if (pregnancy.due_date) {
    const est = estimateStage(pregnancy.due_date, now)
    if (est) return est.stage
  }
  return pregnancy.stage
}

export const stageLabels: Record<Stage, string> = {
  first: 'First trimester',
  second: 'Second trimester',
  third: 'Third trimester',
}

/** Accepts due dates from 60 days ago up to ~300 days ahead, matching the backend. */
export function isPlausibleDueDate(value: string, now: Date = new Date()): boolean {
  const due = parseDateOnly(value)
  if (due === null) return false
  const today = todayUtc(now)
  return due >= today - 60 * DAY && due <= today + 300 * DAY
}

/**
 * Estimated due date from the first day of the last menstrual period (Naegele's rule,
 * LMP + 280 days). A rough estimate: a clinician's dating, for example from a scan, replaces it.
 */
export function dueDateFromLmp(lmp: string, now: Date = new Date()): string | null {
  const start = parseDateOnly(lmp)
  if (start === null) return null
  const today = todayUtc(now)
  // A last period in the future, or more than ~44 weeks ago, is a typo rather than a pregnancy.
  if (start > today || start < today - 308 * DAY) return null
  return toDateOnly(start + 280 * DAY)
}
