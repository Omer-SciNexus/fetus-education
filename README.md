# Little Bloom

A mobile-first prenatal bonding and memory web app, built to the
[detailed implementation plan](./LITTLE_BLOOM_DETAILED_WEB_APP_PLAN.md) on free service
tiers: React + Vite on Cloudflare Pages, and Supabase for the database, sign-in and private storage.

> Little Bloom is not medical software. It makes no claims about fetal development, and
> the seeded health cards are **placeholders** until a qualified reviewer approves them.

## What's here

| Area | Location |
|---|---|
| Frontend (all routes in plan §6) | `src/` |
| Toolkit (week by week, little conversations, breathe, family plan, keepsake book) | `src/features/toolkit/`, `src/lib/weeks.ts`, `src/lib/prompts.ts` |
| Review of other prenatal platforms, and which of their features were adopted or rejected | `docs/research/prenatal-platforms.md` |
| Schema, RLS, storage policies, backend operations | `supabase/migrations/` |
| Seed content (14 activities, 6 stories, 4 scripts, 12 cards) | `supabase/seed.sql` |
| Account deletion Edge Function | `supabase/functions/delete-account/` |
| Database authorization tests (pgTAP) | `supabase/tests/database/` |
| Unit tests (Vitest) / end-to-end tests (Playwright) | `tests/unit/`, `tests/e2e/` |
| Operator scripts: backup, decrypt, upload cleanup, bundle secret scan | `scripts/` |
| Setup, runbook, decisions | `docs/` |

## Local development

Requires Node 22+ and Docker Desktop (running).

```bash
npm install
npm run db:start            # starts local Supabase, applies migrations + seed
npx supabase status         # prints the local API URL and anon/service keys
cp .env.example .env.local  # paste the local URL and anon key into it
npm run dev                 # http://localhost:5173
```

Local sign-in uses the **development email form** (`VITE_ENABLE_DEV_LOGIN=true`). Entering a
new email and password creates the account. The seed admits `parent@example.com` and `parent2@example.com`
as pilot owners. To get admin access locally, sign in once as `operator@example.com`, then run this in
Studio (http://127.0.0.1:54323, SQL editor):

```sql
insert into public.admin_roles (user_id, role)
select id, r from auth.users, unnest(array['editor','reviewer','publisher','operator']) r
where email = 'operator@example.com';
```

Partners need no admission: sign in as the owner, go to **Family → Create invitation link**,
and open the link in a private window.

## Checks

```bash
npm run typecheck
npm test                    # unit tests
npm run db:test             # RLS / storage / quota tests against local Supabase
E2E_SERVICE_ROLE_KEY=<local service key> npm run test:e2e   # browser journeys
npm run build && npm run check:bundle                       # release build + secret scan
```

Microphone capture and playback **must** be checked by hand on a real iPhone (Safari) and
Android phone (Chrome). Automated tests can't cover this (plan §20).

## Deploying the pilot

See [docs/operations/setup.md](docs/operations/setup.md) for hosted setup (Supabase project,
Google OAuth, Cloudflare Pages), and [docs/operations/runbook.md](docs/operations/runbook.md)
for the operating routine, backups and the restoration drill.

**Never enable paid plans or add-ons** (plan §9). If usage approaches a limit, pause uploads or
registrations and review the options with the owner.

## Where the build differs from the plan

See [docs/decisions/](docs/decisions/). In short:

- Recordings upload **directly to a server-reserved key**. Storage policies, the bucket's size and
  type limits, and server-side finalisation replace the plan's proxying Edge Function
  ([ADR 0001](docs/decisions/0001-recording-upload-path.md)).
- `media_assets` and `upload_reservations` are merged into one `recordings` table.
- The single 14-activity program uses `content_items.program_position` instead of separate
  `programs`/`program_activities` tables.
