# Operations runbook

Manual operations need a **named operator** and this checklist. They aren't automated
services (plan §16).

Operator scripts read `.env.operator`, which is git-ignored. Never commit it:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret — operator machine only>
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres
BACKUP_PASSPHRASE=<long passphrase stored in the owner's password manager>
```

Free projects may only offer IPv6 direct connections. If the direct URL fails, use the
**session pooler** connection string from the dashboard.

## Routine

| When | Action |
|---|---|
| Each release | `npm run typecheck && npm test && npm run db:test`, then `npm run build && npm run check:bundle`; smoke-test the main journeys |
| Daily (early pilot) | Admin → Pilot: failed saves, stale uploads, pending deletions |
| Twice weekly | Supabase → Usage: database size, storage, **egress**, function invocations |
| Weekly | `npm run ops:backup`; `npm run ops:cleanup-uploads`; verify counts |
| Before destructive migrations | Take and verify a backup |
| Before expansion | Reassess capacity, reliability, privacy and the free-tier terms |

## Thresholds (any limiting allowance)

- **60%:** investigate and update the forecast.
- **75%:** stop expanding the pilot.
- **85%:** pause new uploads or registrations. Keep read and export access working.
- Never delete memories to save space. Never enable paid upgrades. Never create fake activity
  to avoid the inactivity pause.

To pause new uploads quickly, set the reservation limit to zero:

```sql
update private.limits set value = 0 where key = 'max_recordings_per_family';  -- restore to 10 later
```

## Backups

`npm run ops:backup` writes `backups/<timestamp>/` with:

- Encrypted `schema.sql`, `data.sql` and `roles.sql` (AES-256-GCM, key derived from the passphrase with scrypt).
- Encrypted recordings plus `manifest.json`: key, size, SHA-256 and the deletion ledger.
- `backup-info.json`: migration version, counts and KDF salt. It contains no secrets.

It keeps two generations (`--keep 2`). Copy the folder to an owner-controlled location
**separate** from the deployment. Never put backups in the repository.

## Restoration drill

1. `npm run ops:decrypt -- backups/<ts> restore-work/`. Checksums are verified automatically.
2. Create a **restricted** environment: a second Free project or local Supabase with no public URL.
3. Restore: run `roles.sql`, then `schema.sql`, then `data.sql` with `psql`.
4. Upload `recordings/*` back to the `recordings` bucket under their manifest keys.
5. **Replay the deletion ledger.** For every `deletion_requests` row that is completed in
   production but present in the backup, delete that user's data again before reopening access.
6. Verify: memberships, RLS (`npm run db:test` against it), file references, and a sample of
   playback. Auth users and their Google identities may need to sign in again. Restoring a
   database doesn't restore Google or Supabase Auth configuration.
7. Record the date, the duration and any problems.

Up to a week of changes can be lost under weekly backups. Tell users this (it's in the
pilot terms) and encourage them to download important memories.

## Incidents

1. **Triage.** Is private data exposed? If so, treat it as severity 1. Disable access first
   (pause the project, or revoke the anon key), then investigate.
2. **Free project paused or down:** restore it from the dashboard. Post a plain-language notice
   to participants through the owner's existing channel.
3. **Quota hit:** follow the thresholds above.
4. **Account deletion failed:** Admin → Pilot shows pending deletions. Access is already blocked.
   Re-run deletion: the user retries, or the operator calls the function with that user's token.
   Otherwise, finish it with `cleanup-uploads` and delete the auth user in the dashboard.
5. Afterwards, write a short blameless note in `docs/operations/incidents/`.

## Support

Use the owner-controlled support mailbox. Ask users **not** to email recordings or detailed
health information. Operators don't browse private memories. Any support access to user
data must be justified and written down.
