# ADR 0001: Recording upload path

**Status:** Accepted · 2026-10-31

## Context

Plan §12.1 proposed uploading recordings "through a short authenticated backend handler"
(an Edge Function) to prevent arbitrary browser writes. On the free tier, proxying 2 MB bodies
through a function uses invocations, function egress and wall-clock time. It also adds a second
place where size checks must stay correct.

## Decision

The browser uploads **directly** to Supabase Storage, but only to a key the server generated:

1. `reserve_recording_upload()` locks the family row, enforces the count, byte and
   one-active-upload limits, and creates a `recordings` row (`state = reserved`) with an immutable,
   server-generated `object_key` and a 15-minute expiry.
2. The storage INSERT policy allows a write **only** when the object name equals a live
   reservation owned by the caller. There is no UPDATE policy, so objects can't be overwritten.
   The bucket enforces `file_size_limit = 2,000,000` and an audio MIME allowlist.
3. `finalize_recording()` reads the stored object's **actual** size and type from
   `storage.objects`, rejects anything larger than the reservation, and then creates the
   memory. It is idempotent.
4. Failed or abandoned attempts are released only after the object is confirmed absent
   (`abandon_recording`, `scripts/cleanup-uploads.mjs`).

## Consequences

- No function is needed for uploads. The authoritative protections all live server-side:
  RLS, bucket limits, quota locks and finalisation checks.
- The client uses XHR so it can show real upload progress.
- Recording **duration** is not verified server-side (plan §12.1 allows this). Bytes and counts are
  the quota boundary.
- Account deletion still uses an Edge Function, because it needs the service role.
