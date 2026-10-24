# Little Bloom — Free-Service Web App Plan

Updated: October 31, 2026

## Objective

Build a mobile-first prenatal education and bonding web app using only free service tiers, targeting **$0 monthly service cost** for the initial pilot.

This replaces the earlier $75–$250 monthly service allowance. Free-tier limits below were checked on October 31, 2026 and should be rechecked before deployment.

The initial product includes a flexible 14-activity bonding program, short educational cards, stories, private voice memories, and optional partner participation. Users can skip, repeat, or complete activities at their own pace. The app must not claim that completing activities improves fetal intelligence.

## 1. Technology and services

| Component | Free option | Purpose |
|---|---|---|
| Frontend | React + Vite + TypeScript | Mobile-friendly application |
| UI | Tailwind CSS and open-source components | Consistent design and accessible controls |
| Hosting | Cloudflare Pages Free | Publish the application |
| Website address | Included `pages.dev` subdomain | Avoid buying a domain |
| Database | Supabase Free | Profiles, activities, progress, and memories |
| Authentication | Google sign-in through Supabase | Avoid a transactional email service |
| Recording storage | Supabase Storage Free | Private voice memories with strict quotas |
| Voice recording | Browser recording APIs | No paid recording or transcription API |
| Content management | Admin screens inside the app | No separate CMS subscription |
| Product reporting | Small aggregate reports in Supabase | No paid analytics platform |
| Testing | Vitest and Playwright | Local automated tests |
| Backups | Manual database and media exports | No paid backup service |

Use React + Vite instead of the earlier Next.js proposal. Host the frontend as static files and use Supabase for authentication, database access, and storage. This avoids requiring a paid server runtime.

Cloudflare Pages Free currently includes 500 builds per month and permits individual static assets up to 25 MiB. Private recordings belong in protected storage, not the public website deployment.

Source: [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## 2. Free-tier limits

Supabase currently lists these Free allowances:

| Resource | Free allowance |
|---|---:|
| Database | 500 MB |
| File storage | 1 GB |
| Monthly active users | 50,000 |
| Egress | 5 GB |
| Cached egress | Separate 5 GB allowance |
| Active projects | 2 |

Free projects can pause after one week of inactivity. These allowances support a small pilot, but do not provide unlimited hosting or production availability guarantees.

Source: [Supabase pricing](https://supabase.com/pricing).

### Initial pilot limits

- Start with **25 families**.
- Allow a maximum of **10 recordings per family**, shared between the parent and partner.
- Limit each recording to **two minutes and 2 MB**.
- Support text memories with reasonable length limits.
- Exclude video uploads and large music downloads.
- Enforce quotas in the backend, not just the interface.
- Monitor storage and delivery traffic separately.

At the maximum recording allowance, 25 families would use approximately **500 MB**, leaving storage headroom. Repeated playback still consumes bandwidth, so storage capacity alone does not determine how many users the app can support.

## 3. Authentication and invitations

- Provide guest access to sample activities.
- Require Google sign-in to save progress and memories.
- Let account owners create expiring partner invitation links.
- Users copy and share invitation links themselves.
- Give each partner their own login.
- Keep memories private unless explicitly shared.
- Allow account owners to revoke partner access.

Do not use Supabase's default email sender for public registration. It is restricted to authorized team addresses and currently limited to two messages per hour.

Google sign-in avoids that email dependency, but its OAuth setup and audience configuration must still be completed. Users without Google accounts can try the guest experience; another account option can be evaluated later.

Sources: [Supabase email restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Google sign-in setup](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 4. First-release features

| Feature | Scope |
|---|---|
| Onboarding | Optional pregnancy stage and activity preferences |
| Today | Continue the program and view a recommended activity |
| Bonding program | 14 activities that users can complete at their own pace |
| Educational cards | Short, sourced, reviewed explanations |
| Stories | Curated parent-read scripts and a small audio collection |
| Memories | Private text notes and short voice recordings |
| Partner participation | One invited partner and explicitly shared memories |
| Progress | Completed activities and favorites |
| Privacy controls | Sharing management, export, deletion, and pregnancy-experience pause |
| Administration | Content editing, review, approval, and publishing |

The primary journey is:

**Open Today → read a short insight → complete an activity → optionally save a memory.**

Recording should support start, stop, preview, discard, upload progress, and a clear saved state. Handle denied microphone permission and interrupted uploads without falsely reporting success. Test recording and playback on target phones.

## 5. Changes required to keep services free

| Earlier feature | Revised approach |
|---|---|
| Email reminders | In-app reminders and optional calendar downloads |
| Email invitations | Copy-and-share invitation links |
| AI-generated stories | Curated, manually prepared stories |
| Paid narration APIs | Original recordings or appropriately licensed free audio |
| Large music library | Small collection of original or licensed free assets |
| Paid analytics | Minimal internal usage reports |
| Custom domain | Free hosting subdomain |
| Payment processing | Deferred because processors charge transaction fees |
| Automated managed backups | Documented manual exports and restoration checks |

Deferring checkout does not decide whether the product can charge users later. It keeps the initial pilot within the free-service requirement.

## 6. Privacy, content, and backups

- Enforce ownership and sharing permissions through database and storage access rules.
- Never expose privileged service credentials in frontend code.
- Keep private recordings out of public storage and search indexing.
- Exclude journal text, recordings, email addresses, and exact due dates from analytics.
- Make pregnancy details optional wherever possible.
- Provide export and deletion controls.
- Define retention and backup-deletion behavior before launch.
- Publish health-related content only after the agreed review process.
- Document the ownership or license of every story, illustration, and audio asset.

Supabase recommends manual exports for free projects. Database backups do not include stored audio files, so export the database and recordings separately, store them securely, and verify restoration.

Source: [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).

## 7. Implementation sequence

1. **Design and sample content**
   - Create the mobile interface and core user journeys.
   - Prepare sample activities and establish the content-review process.

2. **Frontend and hosting**
   - Set up React, Vite, TypeScript, and the reusable interface components.
   - Configure the free hosting environment and included subdomain.

3. **Accounts and data protection**
   - Configure Supabase, Google sign-in, and the database.
   - Implement and test database and storage access rules.

4. **Activities and memories**
   - Implement the 14-activity program, stories, progress, favorites, and text memories.

5. **Recording and sharing**
   - Add voice recording, backend-enforced quotas, partner invitations, and sharing controls.

6. **Verification and recovery**
   - Test privacy, target-device compatibility, exports, deletion, and restoration.
   - Check accessibility and failure states.

7. **Limited pilot**
   - Launch to 25 families.
   - Monitor storage, bandwidth, return use, and support needs.
   - Improve the experience using participant feedback.

## 8. Release checks

- One account cannot retrieve another account's private memories.
- Partners cannot access unshared entries.
- Expired or revoked invitations no longer grant access.
- Recording quotas cannot be bypassed through direct requests.
- Failed uploads never display a successful saved state.
- Only approved content is published.
- Export and deletion behave as described.
- The main journeys work on iPhone Safari, Android Chrome, and desktop browsers.
- Keyboard users can complete the main journeys.
- A database and media restoration has been tested.

## 9. Cost policy

**Do not enable paid plans or automatic upgrades.**

If usage approaches a free-tier limit, restrict new uploads or registrations and review options with the project owner before incurring charges.

The $0 target covers service subscriptions. Development work, clinical review, and commissioned content remain separate costs unless supplied without charge by the owner or collaborators. Free infrastructure does not remove the need for content review or privacy controls.

## 10. First deliverable

Create a clickable prototype covering the homepage, onboarding, Today, an activity, recording, Memories, and partner access. Prepare the first three reviewed activities alongside it.

Use this prototype to validate the experience before completing the full free-tier application.
