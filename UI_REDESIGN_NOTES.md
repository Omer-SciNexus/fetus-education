# Little Bloom UI review and redesign

Date: 2026-10-31

## Assessment

The existing React, TypeScript, React Router, TanStack Query, and Supabase app
already has a substantial functional foundation: guest samples, account setup,
activity progress, private memories, partner invitations, and content management.
The main weakness was presentation. Most screens used the same text-heavy card,
with little distinction between the next action, supporting information, and
navigation. The public homepage did little to communicate the product's character.

This work focuses on the interface. It is not a full security, clinical-content,
production-readiness, or infrastructure audit.

## What changed

- Ivory and sage surfaces, botanical branding, serif display headings, clearer
  typography, consistent buttons, and stronger muted-text contrast.
- An illustrated homepage with a clearer starting point, activity previews,
  onboarding explanation, privacy section, and accurate limited-pilot messaging.
- A desktop sidebar and mobile bottom navigation, with visible current-page state.
- A dashboard that prioritizes the next activity, with progress and learning cards
  alongside it and a clear route into memories.
- Illustrated activity cards, category filters, and a compact search field.
- A calmer activity reader that retains instructions, transcripts, completion,
  reflection prompts, and clinical-review placeholder notices.
- An illustrated sign-in page, improved form spacing, and hints below inputs.
- Memory cards, illustrated empty states, a clearer recording area, and a family
  banner that respects the existing paused-content preference.
- Nine optimized WebP illustrations derived from the existing generated visual
  pack. Encoding reduced image bytes by approximately 90%; original PNGs remain
  in the visual pack.

## Architecture and cost

No paid service, additional runtime dependency, database migration, or external
font was introduced. Existing authentication, storage, sharing, and content APIs
remain in place. All changes are local; this work does not deploy the application.

## Validation

- TypeScript checking and production build passed.
- All 43 existing unit tests passed.
- All 14 desktop/mobile browser checks passed, including the two optional visual reviews.
- Existing Chromium browser journeys on desktop and Pixel 7 emulation: guest
  activity completion, sign-in redirects, onboarding, activity completion/undo,
  private text memories, pilot admission, partner sharing, and partner revocation.
- The optional screenshot review now checks that all images decode successfully,
  captures additional screens, and checks six member routes for horizontal
  overflow at 320, 390, 768, 1024, and 1440 pixels.
- Production-bundle credential scan passed.

The browser checks use local Supabase and development sign-in. Hosted Google
OAuth, real-phone microphone recording, Safari, and deployed behavior were not
verified by this UI pass.

## Review locally

The development server is available at http://127.0.0.1:5173 while running.
Start it with `npm run dev` if needed. Public samples require no account. Saving
memories requires an admitted pilot account.

Review screenshots are written under `test-results/screens/` (gitignored): home,
sign-in, today, explore, activity, memories, new-memory, and family, with desktop
and mobile prefixes. `tests/e2e/screenshots.spec.ts` documents the optional capture
flow; it requires the local test services and local test credentials.

## Main implementation files

- `src/styles/index.css`: design tokens, page layouts, responsive rules.
- `src/app/layouts.tsx`: public layout and member navigation.
- `src/components/ui.tsx`: shared controls, cards, forms, and empty states.
- `src/components/Artwork.tsx`: image mapping and loading behavior.
- `src/components/Icon.tsx`: shared SVG icons.
- `src/features/`: individual updated screens.
- `public/editorial-assets/README.md`: image provenance.

## Homepage garden (Three.js)

The hero illustration on the public homepage is now a small 3D garden built from
code in `src/features/public/garden/`: a flower that unfurls on load, a storybook
plant, a moon flower and a lantern (one per "moment" card), drifting seeds, and
fireflies after dark. Lighting and the caption follow the visitor's local time of
day (`?hour=22` previews another hour in development). Hovering a plant changes the
caption; tapping it opens the matching page.

- Three.js and React Three Fiber (about 250 KB gzipped) load only on the homepage,
  after the first paint, in their own chunk. The main bundle does not reference them.
- The still WebP is used instead when the visitor prefers reduced motion, has no
  WebGL, has data saver on, or has under 2 GB of device memory, and if WebGL fails.
- Frames stop while the garden is scrolled out of view or the tab is hidden; pixel
  ratio is capped at 1.5.
- Tests: `tests/unit/garden.test.ts`, the "home garden" case in
  `tests/e2e/guest.spec.ts`, and a reduced-motion screenshot in
  `tests/e2e/screenshots.spec.ts`.

## Visual-pack alignment

Date: 2026-11-01

The twelve interface concepts in `visual-pack/` (01 to 12) are now the reference
for each screen. What changed in this pass:

- Global: bold sans-serif headings, coral pill buttons, soft sage filter pills,
  chips, a segmented Solo/Together control, and settings-style menu rows.
- Member shell: dark sage sidebar with the four mockup destinations (Today,
  Explore, Memories, You) plus Content studio for editors; a four-item mobile
  bar with home, compass, image and user icons. The top bar was removed; the
  mobile header shows the logo and an avatar link to Your space.
- Landing (01): illustrated hero, Understand / Connect / Remember cards, a
  "Try a few activities" row fed by the free samples, then the short film.
- Today (02, 03): "A little moment for you", a featured activity with
  "Start activity", a "Your journey" dots card, three illustrated tiles and a
  "This week" insight card.
- Explore (05, 12): "Find your next little moment" with search, All / The
  program / Stories / Quiet moments / Together / Learn / Saved pills, bookmark
  cards, and a numbered 14-moment program view with a "Continue your journey"
  card at `/explore?f=program`.
- Story reader (06): back / kind / bookmark top bar, cover, "Read aloud · About
  N minutes", Solo/Together segmented control and stacked full-width actions.
- Recorder (07): "A voice to remember", waveform orb, large timer, round
  record/stop button, privacy chip and Discard / Save buttons.
- Memories (08): "Your little collection", Notes / Recordings / Shared pills,
  illustrated covers with "Only you" or "Shared with partner" chips.
- Your circle (09): hero illustration, privacy card, dark sage invite card with
  "Copy invite link", and a Manage access section.
- Your space (10): grouped menu rows; the former settings forms moved to
  `/settings/preferences`, and export / delete live under "Your data".
- Content studio (11): stat tiles, pill tabs and a "Before publishing" checklist.
- Onboarding (04): three steps with a step counter, illustrated header, choice
  tiles, interest chips and "Skip for now".

Three more pack illustrations were encoded to WebP (conversation, shared-moment,
botanical). Tests were updated for the new headings and the three-step
onboarding; the end-to-end suite and the screenshot review were re-run.
