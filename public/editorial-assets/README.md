# Editorial assets

Public, licensed files only (relaxation audio, illustrations). Everything here is
deployed to the public website.

- Never put private family recordings here.
- Every file needs a row in the rights register (Admin → Rights) before any content
  version that uses it can be published.
- Keep individual files well under Cloudflare Pages' 25 MiB per-asset limit.

## UI illustrations

The twelve WebP illustrations added for the UI redesign are optimized copies of
images generated for this project's `visual-pack/`. They are decorative brand
illustrations, not photographs of users or clinical evidence. The original PNG
files remain in that pack. These assets are bundled into the UI; no content
publication or rights-register records were changed.

| Web asset | Original visual-pack image |
| --- | --- |
| family-reading.webp | 13-family-reading-hero |
| solo-reading.webp | 14-solo-reading |
| voice-memory.webp | 15-partner-voice-memory |
| quiet-pause.webp | 17-quiet-pause |
| journal.webp | 18-family-journal |
| story-garden.webp | 19-story-garden |
| evening.webp | 20-lullaby-night |
| together.webp | 21-long-distance-connection |
| keepsakes.webp | 24-memory-keepsakes |
| conversation.webp | 16-couple-conversation |
| shared-moment.webp | 22-shared-favorite-moment |
| botanical.webp | 23-welcome-botanical |

WebP encoding preserves the original dimensions. Below-the-fold illustrations
load lazily; the main hero illustrations load eagerly. No paid image service or
remote font dependency is required at runtime.

## Per-item illustrations (November 2026)

52 more illustrations were generated with OpenAI image generation from
`docs/design/image-prompts.md`, using `quiet-pause.webp` and `story-garden.webp` as style
references. They are decorative brand illustrations, like the set above.

- **Content:** every activity, audio script, learning card and story has its own image named
  after its slug (e.g. `say-hello.webp`). `contentArt()` in `src/components/Artwork.tsx` picks it,
  reuses four earlier images (`invite-partner`, `end-of-day`, `partners-welcome`,
  `the-garden-that-waited`), and falls back to the category image for content added later.
- **Pages:** `page-*`, `home-*`, `onboard-*`, `choice-*`, `today-*`, `memory-*` and `family-*`
  replace images that used to repeat across pages.
- **Paused mode:** while pregnancy content is paused, `contentArt()` only returns images with
  no bump, baby or baby items (the `gentleArt` list). `family-paused` and `empty-plan` were made
  for this. Check any new image before adding it to that list.

Web copies are 1200 px wide (the two `choice-*` portraits 320 px), WebP quality 80. The PNG
originals and contact sheets are kept outside the repository in `art-inbox/`.
