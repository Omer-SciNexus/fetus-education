import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contentArt } from '../../src/components/Artwork'

const file = (name: string) => `public/editorial-assets/${name}.webp`

describe('contentArt', () => {
  it('gives content its own illustration', () => {
    expect(contentArt({ slug: 'family-story', category: 'family' })).toBe('family-story')
    expect(contentArt({ slug: 'special-place', category: 'family' })).toBe('special-place')
  })

  it('keeps the explicit reuse of earlier illustrations', () => {
    expect(contentArt({ slug: 'the-garden-that-waited', category: 'story' })).toBe('story-garden')
    expect(contentArt({ slug: 'invite-partner', category: 'voice' })).toBe('voice-memory')
  })

  it('falls back to the category illustration for new content', () => {
    expect(contentArt({ slug: 'brand-new-story', category: 'story' })).toBe('story-garden')
  })

  it('avoids pregnancy imagery while content is paused', () => {
    expect(contentArt({ slug: 'say-hello', category: 'voice' }, true)).toBe('journal')
    expect(contentArt({ slug: 'another-quiet-moment', category: 'calm' }, true)).toBe('a-calm-place')
    expect(contentArt({ slug: 'the-little-lantern', category: 'story' }, true)).toBe('the-little-lantern')
  })

  it('only names files that exist', () => {
    const slugs = [
      'say-hello', 'first-story', 'quiet-pause', 'family-story', 'sing-a-song', 'special-place',
      'repeat-a-favourite', 'second-story', 'hopes', 'invite-partner', 'explore-a-card',
      'another-quiet-moment', 'revisit-a-memory', 'a-routine-to-keep', 'a-calm-place', 'end-of-day',
      'settle-in', 'three-good-things', 'about-little-bloom', 'calm-breathing', 'comfortable-positions',
      'feelings', 'memories-without-pressure', 'partners-welcome', 'questions-for-appointments',
      'reading-aloud', 'rest-and-sleep', 'sound-and-music', 'staying-active', 'when-to-get-help',
      'pip-counts-the-stars', 'the-boat-called-maybe', 'the-garden-that-waited',
      'the-house-that-made-room', 'the-little-lantern', 'the-moon-and-the-kettle',
    ]
    for (const slug of slugs) {
      for (const paused of [false, true]) {
        const name = contentArt({ slug, category: 'learn' }, paused)
        expect(existsSync(file(name)), `${slug} → ${name}`).toBe(true)
      }
    }
  })
})
