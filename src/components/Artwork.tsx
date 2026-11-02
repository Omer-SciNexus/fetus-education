import type { Category } from '@/types/db'

export const art = (name: string) => `/editorial-assets/${name}.webp`

export function categoryArt(category: Category | string) {
  return (
    (
      {
        story: 'story-garden',
        voice: 'voice-memory',
        calm: 'quiet-pause',
        music: 'evening',
        family: 'together',
        reflect: 'journal',
        learn: 'solo-reading',
      } as Record<string, string>
    )[category] ?? 'family-reading'
  )
}

// Content with its own illustration, named after its slug.
const ownArt = new Set([
  'say-hello', 'first-story', 'quiet-pause', 'family-story', 'sing-a-song', 'special-place',
  'repeat-a-favourite', 'second-story', 'hopes', 'explore-a-card', 'another-quiet-moment',
  'revisit-a-memory', 'a-routine-to-keep',
  'a-calm-place', 'settle-in', 'three-good-things',
  'about-little-bloom', 'calm-breathing', 'comfortable-positions', 'feelings',
  'memories-without-pressure', 'questions-for-appointments', 'reading-aloud', 'rest-and-sleep',
  'sound-and-music', 'staying-active', 'when-to-get-help',
  'pip-counts-the-stars', 'the-boat-called-maybe', 'the-house-that-made-room', 'the-little-lantern',
  'the-moon-and-the-kettle',
])

// Content whose best fit is an earlier illustration.
const reusedArt: Record<string, string> = {
  'invite-partner': 'voice-memory',
  'end-of-day': 'evening',
  'partners-welcome': 'together',
  'the-garden-that-waited': 'story-garden',
}

// Illustrations with no pregnancy bump, baby or baby items. Only these are shown while
// pregnancy content is paused.
const gentleArt = new Set([
  'special-place', 'repeat-a-favourite', 'explore-a-card', 'a-routine-to-keep', 'a-calm-place',
  'three-good-things', 'about-little-bloom', 'feelings', 'memories-without-pressure',
  'pip-counts-the-stars', 'the-boat-called-maybe', 'the-house-that-made-room', 'the-little-lantern',
  'the-moon-and-the-kettle', 'story-garden', 'voice-memory', 'evening', 'journal', 'botanical',
])

export function contentArt(item: { slug: string; category: Category | string }, paused = false) {
  const name = reusedArt[item.slug] ?? (ownArt.has(item.slug) ? item.slug : categoryArt(item.category))
  if (!paused || gentleArt.has(name)) return name
  return item.category === 'calm' ? 'a-calm-place' : 'journal'
}

export function Artwork({
  name,
  className = '',
  alt = '',
  eager = false,
}: {
  name: string
  className?: string
  alt?: string
  eager?: boolean
}) {
  return (
    <img
      src={art(name)}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : undefined}
    />
  )
}
