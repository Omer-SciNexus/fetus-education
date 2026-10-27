import type { Category, PublishedItem, Stage } from '@/types/db'

export interface RecommendOptions {
  completed: ReadonlySet<string>
  stage: Stage | null
  paused: boolean
  categories?: Category[]
}

export interface Recommendation {
  next: PublishedItem | null
  alternative: PublishedItem | null
  programComplete: boolean
}

function suitable(item: PublishedItem, stage: Stage | null): boolean {
  const stages = item.version.stages
  return stage === null || stages.length === 0 || stages.includes(stage)
}

/**
 * Deterministic Today suggestion (section 9). No AI, no health profiling.
 * - Next incomplete program activity suitable for the stage.
 * - Alternative: another incomplete activity, preferring a liked category.
 * - Paused profiles get a neutral story/calm suggestion.
 */
export function recommend(items: PublishedItem[], opts: RecommendOptions): Recommendation {
  const program = items
    .filter((i) => i.kind === 'activity' && i.program_position !== null)
    .sort((a, b) => (a.program_position ?? 0) - (b.program_position ?? 0))

  const programComplete = program.length > 0 && program.every((i) => opts.completed.has(i.id))

  if (opts.paused) {
    const neutral = items.filter(
      (i) => (i.category === 'story' || i.category === 'calm') && !i.version.health_related,
    )
    return { next: neutral[0] ?? null, alternative: neutral[1] ?? null, programComplete }
  }

  const candidates = program.filter((i) => !opts.completed.has(i.id) && suitable(i, opts.stage))
  const next = candidates[0] ?? null

  const rest = candidates.slice(1)
  const liked = opts.categories?.length
    ? rest.find((i) => opts.categories!.includes(i.category) && i.category !== next?.category)
    : undefined
  const different = rest.find((i) => i.category !== next?.category)
  let alternative: PublishedItem | null = liked ?? different ?? rest[0] ?? null

  if (!next && !alternative) {
    // Nothing fits: offer a general activity rather than inventing personalised guidance.
    const general = items.find((i) => (i.kind === 'activity' || i.kind === 'story') && !i.version.health_related)
    alternative = general ?? null
  }

  return { next, alternative, programComplete }
}

/** Picks a stable daily insight card from published education items. */
export function dailyInsight(items: PublishedItem[], now: Date = new Date()): PublishedItem | null {
  const cards = items.filter((i) => i.kind === 'education').sort((a, b) => a.slug.localeCompare(b.slug))
  if (!cards.length) return null
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return cards[day % cards.length]
}
