import { describe, expect, it } from 'vitest'
import { dailyInsight, recommend } from '../../src/lib/recommend'
import type { Category, ContentKind, PublishedItem, Stage } from '../../src/types/db'

function item(id: string, opts: Partial<{ pos: number | null; kind: ContentKind; category: Category; stages: Stage[]; health: boolean }> = {}): PublishedItem {
  return {
    id,
    slug: id,
    kind: opts.kind ?? 'activity',
    category: opts.category ?? 'story',
    is_sample: false,
    program_position: opts.pos === undefined ? null : opts.pos,
    published_version_id: `v-${id}`,
    withdrawn_at: null,
    created_at: '',
    sources: [],
    version: {
      id: `v-${id}`, item_id: id, version: 1, status: 'published', title: id, summary: '', body: '', solo_steps: '',
      together_steps: '', reflection_prompt: '', duration_minutes: 5, stages: opts.stages ?? [],
      health_related: opts.health ?? false, is_placeholder: false, audio_path: null, transcript: null, revision_note: '',
      author_id: null, created_at: '', updated_at: '', published_at: '',
    },
  }
}

const program = [
  item('a1', { pos: 1, category: 'voice' }),
  item('a2', { pos: 2, category: 'story' }),
  item('a3', { pos: 3, category: 'calm' }),
  item('a4', { pos: 4, category: 'music', stages: ['third'] }),
]

describe('recommend', () => {
  it('suggests the next incomplete activity in program order', () => {
    const r = recommend(program, { completed: new Set(['a1']), stage: null, paused: false })
    expect(r.next?.id).toBe('a2')
    expect(r.alternative?.id).toBe('a3')
    expect(r.programComplete).toBe(false)
  })

  it('skips activities unsuitable for the stage', () => {
    const r = recommend(program, { completed: new Set(['a1', 'a2', 'a3']), stage: 'first', paused: false })
    expect(r.next).toBeNull()
  })

  it('prefers a liked category for the alternative', () => {
    const r = recommend(program, { completed: new Set(), stage: 'third', paused: false, categories: ['music'] })
    expect(r.next?.id).toBe('a1')
    expect(r.alternative?.id).toBe('a4')
  })

  it('reports completion without locking anything', () => {
    const r = recommend(program, { completed: new Set(['a1', 'a2', 'a3', 'a4']), stage: null, paused: false })
    expect(r.programComplete).toBe(true)
    expect(r.next).toBeNull()
  })

  it('gives a neutral non-health suggestion when paused', () => {
    const items = [...program, item('s1', { kind: 'story', category: 'story' }), item('e1', { kind: 'education', category: 'learn', health: true })]
    const r = recommend(items, { completed: new Set(), stage: 'third', paused: true })
    expect(['story', 'calm']).toContain(r.next?.category)
    expect(r.next?.version.health_related).toBe(false)
  })
})

describe('dailyInsight', () => {
  it('is deterministic for a given day', () => {
    const cards = [item('e1', { kind: 'education' }), item('e2', { kind: 'education' }), item('e3', { kind: 'education' })]
    const d = new Date(2026, 9, 31)
    expect(dailyInsight(cards, d)?.id).toBe(dailyInsight([...cards].reverse(), d)?.id)
    expect(dailyInsight([], d)).toBeNull()
  })
})
