# Editorial workflow

`Draft → In review → (Changes requested) → Approved → Published → Superseded / Withdrawn`

| Role | Can do |
|---|---|
| Editor | Create items and drafts, edit drafts, add sources, submit for review, start new versions |
| Reviewer | Record editorial or clinical approval, or request changes, for a specific version |
| Publisher | Publish approved versions, withdraw items |
| Operator | Pilot admissions, roles, reports, retention. **No** access to family memories |

Rules the database enforces:

- Approval applies to one immutable version. After a version leaves draft, its text can't
  change; create a new version instead.
- **Health-related** content needs editorial **and** clinical approval, plus at least one source,
  before it can be published.
- A **placeholder** version can be approved with editorial review only. Users see a
  "not yet clinically reviewed" banner. Never treat a placeholder as a reviewed public release.
- Audio needs a rights-register record for its `audio_path` before publishing.
- Withdrawing removes the item from recommendations and reading. Users' completion history stays.

## Seeded content

`supabase/seed.sql` publishes an editorial **starting point** so development works. None of it
has a recorded review. The admin Content tab lists every such item under "Release blockers".
Each item must go through the workflow (new version → review → publish) before the pilot.

Content guidance (plan §8.2):

- Don't claim effects on intelligence or development.
- Don't use movement-triggering challenges or fetal-response scores.
- Don't encourage redistributing copyrighted music.
- Always provide solo instructions; add together instructions where they fit.
- Give every prerecorded audio file a transcript.
