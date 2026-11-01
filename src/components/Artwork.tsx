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
