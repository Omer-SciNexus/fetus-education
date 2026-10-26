-- Little Bloom: backend operations (section 12).
-- Every function is security definer with an empty search_path, derives the
-- caller from auth.uid(), and raises short machine-readable error codes that
-- the frontend maps to messages (src/lib/errors.ts).

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;

create function private.active_membership(p_uid uuid)
returns public.family_memberships
language sql
stable
set search_path = ''
as $$
  select m.* from public.family_memberships m
  join public.families f on f.id = m.family_id
  where m.user_id = p_uid and m.status = 'active' and f.status = 'active'
$$;

create function private.pseudonym(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_id is null then null else encode(
    extensions.hmac(p_id::text, (select value from private.settings where key = 'event_salt'), 'sha256'),
    'hex') end
$$;

create function private.record_event(p_uid uuid, p_family uuid, p_type text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.pilot_events (actor, family, event_type)
  values (private.pseudonym(p_uid), private.pseudonym(p_family), p_type)
$$;

create function private.audit(p_action text, p_target text, p_outcome text default 'ok')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_events (actor_id, action, target_id, outcome)
  values (auth.uid(), p_action, p_target, p_outcome)
$$;

create function private.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(auth.jwt() ->> 'role', '') = 'service_role' $$;

create function private.allowed_audio_mime(p_mime text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(lower(coalesce(p_mime, '')), ';', 1) in
    ('audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav')
$$;

-- ---------------------------------------------------------------------------
-- Session context
-- ---------------------------------------------------------------------------
create function public.get_my_context()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_profile public.profiles;
  v_member public.family_memberships;
  v_preg public.pregnancy_profiles;
  v_pending_deletion boolean;
begin
  select * into v_profile from public.profiles where user_id = v_uid;
  if not found then
    insert into public.profiles (user_id) values (v_uid) returning * into v_profile;
  end if;
  v_member := private.active_membership(v_uid);
  if v_member.id is not null then
    select * into v_preg from public.pregnancy_profiles p
    where p.family_id = v_member.family_id
      and (v_member.role = 'owner' or p.share_with_partner);
  end if;
  select exists (select 1 from public.deletion_requests d where d.user_id = v_uid and d.state = 'processing')
    into v_pending_deletion;

  return jsonb_build_object(
    'user_id', v_uid,
    'profile', to_jsonb(v_profile),
    'admitted', exists (select 1 from public.pilot_admissions a where a.email = v_email),
    'membership', case when v_member.id is null then null else jsonb_build_object(
      'family_id', v_member.family_id, 'role', v_member.role, 'joined_at', v_member.joined_at) end,
    'pregnancy', case when v_preg.family_id is null then null else jsonb_build_object(
      'stage', v_preg.stage, 'due_date', v_preg.due_date,
      'share_with_partner', v_preg.share_with_partner) end,
    'roles', coalesce((select jsonb_agg(r.role order by r.role) from public.admin_roles r where r.user_id = v_uid), '[]'::jsonb),
    'pending_deletion', v_pending_deletion
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Families and onboarding
-- ---------------------------------------------------------------------------
create function public.create_family()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_member public.family_memberships;
  v_family uuid;
begin
  v_member := private.active_membership(v_uid);
  if v_member.id is not null then
    if v_member.role = 'owner' then
      return v_member.family_id; -- idempotent: login retries never duplicate families
    end if;
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.pilot_admissions a
    join auth.users u on lower(u.email) = a.email
    where a.email = v_email and u.id = v_uid and u.email_confirmed_at is not null
  ) then
    raise exception 'not_admitted' using errcode = 'P0001';
  end if;

  -- Serialise family creation so the pilot cap cannot be exceeded concurrently.
  perform pg_advisory_xact_lock(hashtext('little_bloom.create_family'));
  if (select count(*) from public.families where status = 'active') >= private.limit_value('max_families') then
    raise exception 'pilot_full' using errcode = 'P0001';
  end if;

  insert into public.families (owner_user_id) values (v_uid) returning id into v_family;
  insert into public.family_memberships (family_id, user_id, role) values (v_family, v_uid, 'owner');
  insert into public.pregnancy_profiles (family_id) values (v_family);
  return v_family;
end;
$$;

create function public.complete_onboarding(
  p_display_name text,
  p_timezone text,
  p_preferences jsonb,
  p_stage text,
  p_due_date date,
  p_policy_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
begin
  if v_member.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if p_stage is not null and p_stage not in ('first', 'second', 'third') then
    raise exception 'invalid_stage' using errcode = 'P0001';
  end if;
  if p_due_date is not null and (p_due_date < current_date - 60 or p_due_date > current_date + 300) then
    raise exception 'invalid_due_date' using errcode = 'P0001';
  end if;

  update public.profiles
     set display_name = left(nullif(trim(coalesce(p_display_name, '')), ''), 60),
         timezone = left(p_timezone, 64),
         preferences = coalesce(p_preferences, '{}'::jsonb),
         onboarded_at = coalesce(onboarded_at, now())
   where user_id = v_uid;

  if v_member.role = 'owner' then
    update public.pregnancy_profiles
       set stage = p_stage, due_date = p_due_date
     where family_id = v_member.family_id;
  end if;

  insert into public.consent_records (user_id, policy, policy_version, decision) values
    (v_uid, 'privacy_notice', p_policy_version, 'accepted'),
    (v_uid, 'pilot_terms', p_policy_version, 'accepted');
end;
$$;

create function public.get_family_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_invite public.family_invitations;
begin
  if v_member.id is null then
    return null;
  end if;
  if v_member.role = 'owner' then
    select * into v_invite from public.family_invitations i
    where i.family_id = v_member.family_id and i.accepted_at is null and i.revoked_at is null
      and i.expires_at > now();
  end if;

  return jsonb_build_object(
    'family_id', v_member.family_id,
    'my_role', v_member.role,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'role', m.role,
        'display_name', coalesce(nullif(p.display_name, ''), case m.role when 'owner' then 'Parent' else 'Partner' end),
        'joined_at', m.joined_at,
        'is_me', m.user_id = v_uid) order by m.role), '[]'::jsonb)
      from public.family_memberships m
      left join public.profiles p on p.user_id = m.user_id
      where m.family_id = v_member.family_id and m.status = 'active'),
    'pending_invitation', case when v_invite.id is null then null
      else jsonb_build_object('expires_at', v_invite.expires_at, 'created_at', v_invite.created_at) end,
    'usage', jsonb_build_object(
      'recordings', (select count(*) from public.recordings r
                     where r.family_id = v_member.family_id and r.state in ('reserved', 'active', 'deleting')),
      'recording_bytes', (select coalesce(sum(coalesce(r.actual_bytes, r.reserved_bytes)), 0) from public.recordings r
                          where r.family_id = v_member.family_id and r.state in ('reserved', 'active', 'deleting')),
      'text_memories', (select count(*) from public.memories m
                        where m.family_id = v_member.family_id and m.kind = 'text'),
      'max_recordings', private.limit_value('max_recordings_per_family'),
      'max_recording_bytes', private.limit_value('max_family_recording_bytes'),
      'max_text_memories', private.limit_value('max_text_memories_per_family'))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations (section 12.3)
-- ---------------------------------------------------------------------------
create function public.create_invitation()
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_token text;
  v_expires timestamptz;
begin
  if v_member.id is null or v_member.role <> 'owner' then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  perform 1 from public.families f where f.id = v_member.family_id for update;

  if exists (select 1 from public.family_memberships m
             where m.family_id = v_member.family_id and m.role = 'partner' and m.status = 'active') then
    raise exception 'partner_exists' using errcode = 'P0001';
  end if;
  if (select count(*) from public.family_invitations i
      where i.family_id = v_member.family_id and i.created_at > now() - interval '1 day')
     >= private.limit_value('max_invitations_per_day') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  update public.family_invitations i
     set revoked_at = now()
   where i.family_id = v_member.family_id and i.accepted_at is null and i.revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + make_interval(hours => private.limit_value('invitation_hours')::int);
  insert into public.family_invitations (family_id, token_hash, created_by, expires_at)
  values (v_member.family_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_uid, v_expires);

  return query select v_token, v_expires;
end;
$$;

create function public.revoke_invitation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
begin
  if v_member.id is null or v_member.role <> 'owner' then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  update public.family_invitations i
     set revoked_at = now()
   where i.family_id = v_member.family_id and i.accepted_at is null and i.revoked_at is null;
end;
$$;

create function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_inv public.family_invitations;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;

  select * into v_inv from public.family_invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_uid and private.is_member(v_inv.family_id) then
      return v_inv.family_id; -- idempotent for the same user
    end if;
    raise exception 'invitation_used' using errcode = 'P0001';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  perform 1 from public.families f where f.id = v_inv.family_id and f.status = 'active' for update;
  if not found then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;
  if (private.active_membership(v_uid)).id is not null then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.family_memberships m
             where m.family_id = v_inv.family_id and m.role = 'partner' and m.status = 'active') then
    raise exception 'partner_exists' using errcode = 'P0001';
  end if;

  insert into public.family_memberships (family_id, user_id, role) values (v_inv.family_id, v_uid, 'partner');
  update public.family_invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  perform private.record_event(v_uid, v_inv.family_id, 'partner_invite_accepted');
  return v_inv.family_id;
end;
$$;

-- Ending a partnership unshares the partner's entries: they stay with their author.
create function private.end_partner_membership(p_family uuid, p_partner uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.family_memberships
     set status = p_status, ended_at = now()
   where family_id = p_family and user_id = p_partner and role = 'partner' and status = 'active';
  update public.memories
     set visibility = 'private'
   where family_id = p_family and author_id = p_partner and visibility = 'shared';
end;
$$;

create function public.revoke_partner()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_partner uuid;
begin
  if v_member.id is null or v_member.role <> 'owner' then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  select m.user_id into v_partner from public.family_memberships m
  where m.family_id = v_member.family_id and m.role = 'partner' and m.status = 'active';
  if v_partner is not null then
    perform private.end_partner_membership(v_member.family_id, v_partner, 'revoked');
  end if;
  update public.family_invitations i set revoked_at = now()
   where i.family_id = v_member.family_id and i.accepted_at is null and i.revoked_at is null;
end;
$$;

create function public.leave_family()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
begin
  if v_member.id is null or v_member.role <> 'partner' then
    raise exception 'not_partner' using errcode = 'P0001';
  end if;
  perform private.end_partner_membership(v_member.family_id, v_uid, 'left');
end;
$$;

-- ---------------------------------------------------------------------------
-- Progress and events
-- ---------------------------------------------------------------------------
create function public.complete_activity(p_item uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_at timestamptz;
begin
  if v_member.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if not private.can_read_item(p_item) then
    raise exception 'content_unavailable' using errcode = 'P0001';
  end if;
  insert into public.activity_progress (user_id, item_id) values (v_uid, p_item)
  on conflict (user_id, item_id) do nothing
  returning completed_at into v_at;
  if v_at is not null then
    perform private.record_event(v_uid, v_member.family_id, 'activity_completed');
    return v_at;
  end if;
  select completed_at into v_at from public.activity_progress where user_id = v_uid and item_id = p_item;
  return v_at;
end;
$$;

-- Only events that cannot be derived server-side may be logged by clients.
create function public.log_event(p_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_type not in ('activity_started', 'memory_revisited', 'save_failed') then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;
  perform private.record_event(v_uid, (private.active_membership(v_uid)).family_id, p_type);
end;
$$;

-- ---------------------------------------------------------------------------
-- Memories
-- ---------------------------------------------------------------------------
create function public.create_text_memory(p_title text, p_body text, p_visibility text, p_activity uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_id uuid;
begin
  if v_member.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if p_visibility not in ('private', 'shared') then
    raise exception 'invalid_visibility' using errcode = 'P0001';
  end if;
  if char_length(coalesce(trim(p_body), '')) = 0 then
    raise exception 'memory_empty' using errcode = 'P0001';
  end if;
  if char_length(p_body) > private.limit_value('max_memory_chars') then
    raise exception 'memory_too_long' using errcode = 'P0001';
  end if;
  perform 1 from public.families f where f.id = v_member.family_id for update;
  if (select count(*) from public.memories m where m.family_id = v_member.family_id and m.kind = 'text')
     >= private.limit_value('max_text_memories_per_family') then
    raise exception 'text_memory_limit' using errcode = 'P0001';
  end if;

  insert into public.memories (family_id, author_id, kind, title, body, visibility, activity_id)
  values (v_member.family_id, v_uid, 'text', left(coalesce(p_title, ''), 120), p_body, p_visibility,
          case when p_activity is not null and private.can_read_item(p_activity) then p_activity end)
  returning id into v_id;
  perform private.record_event(v_uid, v_member.family_id, 'memory_saved');
  return v_id;
end;
$$;

-- Recording upload, step 1 (section 12.1): reserve quota under a family lock.
create function public.reserve_recording_upload(
  p_idempotency_key uuid,
  p_mime text,
  p_bytes bigint,
  p_duration_seconds int,
  p_title text,
  p_body text,
  p_visibility text,
  p_activity uuid
)
returns table (recording_id uuid, object_key text, expires_at timestamptz, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
  v_existing public.recordings;
  v_id uuid := gen_random_uuid();
  v_key text;
  v_ext text;
  v_expires timestamptz;
begin
  if v_member.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if p_idempotency_key is null then
    raise exception 'idempotency_key_required' using errcode = 'P0001';
  end if;
  if p_bytes is null or p_bytes <= 0 or p_bytes > private.limit_value('max_recording_bytes') then
    raise exception 'file_too_large' using errcode = 'P0001';
  end if;
  if not private.allowed_audio_mime(p_mime) then
    raise exception 'unsupported_audio' using errcode = 'P0001';
  end if;
  if p_visibility not in ('private', 'shared') then
    raise exception 'invalid_visibility' using errcode = 'P0001';
  end if;

  -- Retrying the same save attempt returns the same reservation.
  select * into v_existing from public.recordings r
  where r.author_id = v_uid and r.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.state = 'failed' then
      raise exception 'reservation_failed' using errcode = 'P0001';
    end if;
    return query select v_existing.id, v_existing.object_key, v_existing.expires_at, v_existing.state;
    return;
  end if;

  perform 1 from public.families f where f.id = v_member.family_id for update;

  if exists (select 1 from public.recordings r
             where r.author_id = v_uid and r.state = 'reserved' and r.expires_at > now()) then
    raise exception 'upload_in_progress' using errcode = 'P0001';
  end if;
  -- Expired-but-unreleased reservations still count until cleanup confirms no object exists.
  if (select count(*) from public.recordings r
      where r.family_id = v_member.family_id and r.state in ('reserved', 'active', 'deleting'))
     >= private.limit_value('max_recordings_per_family') then
    raise exception 'recording_limit' using errcode = 'P0001';
  end if;
  if (select coalesce(sum(coalesce(r.actual_bytes, r.reserved_bytes)), 0) from public.recordings r
      where r.family_id = v_member.family_id and r.state in ('reserved', 'active', 'deleting')) + p_bytes
     > private.limit_value('max_family_recording_bytes') then
    raise exception 'storage_limit' using errcode = 'P0001';
  end if;

  v_ext := case split_part(lower(p_mime), ';', 1)
    when 'audio/webm' then 'webm' when 'audio/ogg' then 'ogg' when 'audio/mp4' then 'm4a'
    when 'audio/x-m4a' then 'm4a' when 'audio/aac' then 'aac' when 'audio/mpeg' then 'mp3'
    else 'wav' end;
  v_key := v_member.family_id::text || '/' || v_uid::text || '/' || v_id::text || '.' || v_ext;
  v_expires := now() + make_interval(mins => private.limit_value('reservation_minutes')::int);

  insert into public.recordings (
    id, family_id, author_id, object_key, idempotency_key, mime, reserved_bytes, duration_seconds,
    draft_title, draft_body, draft_visibility, draft_activity_id, expires_at)
  values (
    v_id, v_member.family_id, v_uid, v_key, p_idempotency_key, split_part(lower(p_mime), ';', 1), p_bytes,
    least(greatest(coalesce(p_duration_seconds, 0), 0), 600),
    left(coalesce(p_title, ''), 120), left(coalesce(p_body, ''), 2000), p_visibility,
    case when p_activity is not null and private.can_read_item(p_activity) then p_activity end,
    v_expires);

  return query select v_id, v_key, v_expires, 'reserved'::text;
end;
$$;

-- Recording upload, step 3: verify the stored object and activate the memory once.
create function public.finalize_recording(p_recording uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_rec public.recordings;
  v_size bigint;
  v_mime text;
  v_memory uuid;
begin
  select * into v_rec from public.recordings r where r.id = p_recording and r.author_id = v_uid for update;
  if not found then
    raise exception 'reservation_invalid' using errcode = 'P0001';
  end if;
  if v_rec.state = 'active' then
    return v_rec.memory_id; -- safe to retry
  end if;
  if v_rec.state <> 'reserved' then
    raise exception 'reservation_invalid' using errcode = 'P0001';
  end if;
  if not private.is_member(v_rec.family_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype'
    into v_size, v_mime
  from storage.objects o
  where o.bucket_id = 'recordings' and o.name = v_rec.object_key;
  if not found then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  if v_size is null or v_size <= 0 or v_size > v_rec.reserved_bytes
     or v_size > private.limit_value('max_recording_bytes') or not private.allowed_audio_mime(v_mime) then
    raise exception 'upload_invalid' using errcode = 'P0001';
  end if;

  insert into public.memories (family_id, author_id, kind, title, body, visibility, activity_id)
  values (v_rec.family_id, v_uid, 'voice', v_rec.draft_title, v_rec.draft_body, v_rec.draft_visibility,
          v_rec.draft_activity_id)
  returning id into v_memory;

  update public.recordings
     set state = 'active', actual_bytes = v_size, memory_id = v_memory, finalized_at = now()
   where id = v_rec.id;
  perform private.record_event(v_uid, v_rec.family_id, 'memory_saved');
  return v_memory;
end;
$$;

-- Releases a reservation whose upload never completed. The caller must remove
-- any uploaded object first so quota is never released while bytes are stored.
create function public.abandon_recording(p_recording uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_rec public.recordings;
begin
  select * into v_rec from public.recordings r where r.id = p_recording and r.author_id = v_uid for update;
  if not found or v_rec.state not in ('reserved', 'failed') then
    raise exception 'reservation_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'recordings' and o.name = v_rec.object_key) then
    raise exception 'object_exists' using errcode = 'P0001';
  end if;
  update public.recordings set state = 'failed' where id = v_rec.id;
end;
$$;

-- Deletion, step 1: immediately deny access. Returns the object key to remove (voice only).
create function public.delete_memory(p_memory uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_mem public.memories;
  v_key text;
begin
  select * into v_mem from public.memories m where m.id = p_memory and m.author_id = v_uid for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_mem.kind = 'text' then
    delete from public.memories where id = v_mem.id;
    return null;
  end if;
  update public.memories set state = 'deleting', visibility = 'private' where id = v_mem.id;
  update public.recordings set state = 'deleting' where memory_id = v_mem.id
  returning object_key into v_key;
  return v_key;
end;
$$;

-- Deletion, step 2: after the object is gone, remove metadata and release quota.
create function public.complete_memory_deletion(p_memory uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_mem public.memories;
  v_key text;
begin
  select * into v_mem from public.memories m where m.id = p_memory and m.author_id = v_uid for update;
  if not found then
    return; -- already completed
  end if;
  if v_mem.state <> 'deleting' then
    raise exception 'not_deleting' using errcode = 'P0001';
  end if;
  select r.object_key into v_key from public.recordings r where r.memory_id = v_mem.id;
  if v_key is not null and exists (
      select 1 from storage.objects o where o.bucket_id = 'recordings' and o.name = v_key) then
    raise exception 'object_exists' using errcode = 'P0001';
  end if;
  delete from public.recordings where memory_id = v_mem.id;
  delete from public.memories where id = v_mem.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Export (section 13.3): the caller's own data only.
-- ---------------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_member public.family_memberships := private.active_membership(v_uid);
begin
  return jsonb_build_object(
    'exported_at', now(),
    'format', 'little-bloom-export-v1',
    'readme', 'profile: your settings. progress/favorites: activities by slug. memories: entries you authored. '
              || 'Voice recordings are listed under memories[].recording and are downloaded as separate files.',
    'profile', (select to_jsonb(p) - 'user_id' from public.profiles p where p.user_id = v_uid),
    'family_role', v_member.role,
    'pregnancy', case when v_member.role = 'owner' then (
      select jsonb_build_object('stage', pp.stage, 'due_date', pp.due_date, 'share_with_partner', pp.share_with_partner)
      from public.pregnancy_profiles pp where pp.family_id = v_member.family_id) end,
    'progress', (select coalesce(jsonb_agg(jsonb_build_object('activity', i.slug, 'completed_at', a.completed_at)
                   order by a.completed_at), '[]'::jsonb)
                 from public.activity_progress a join public.content_items i on i.id = a.item_id
                 where a.user_id = v_uid),
    'favorites', (select coalesce(jsonb_agg(i.slug), '[]'::jsonb)
                  from public.favorites f join public.content_items i on i.id = f.item_id where f.user_id = v_uid),
    'memories', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', m.id, 'kind', m.kind, 'title', m.title, 'body', m.body,
                    'visibility', m.visibility, 'created_at', m.created_at, 'updated_at', m.updated_at,
                    'recording', case when r.id is null then null else jsonb_build_object(
                      'file', r.object_key, 'mime', r.mime, 'bytes', r.actual_bytes,
                      'duration_seconds', r.duration_seconds) end)
                  order by m.created_at), '[]'::jsonb)
                 from public.memories m
                 left join public.recordings r on r.memory_id = m.id and r.state = 'active'
                 where m.author_id = v_uid and m.state = 'active'),
    'consents', (select coalesce(jsonb_agg(jsonb_build_object(
                   'policy', c.policy, 'version', c.policy_version, 'decision', c.decision, 'at', c.created_at)), '[]'::jsonb)
                 from public.consent_records c where c.user_id = v_uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Editorial workflow (section 8.3)
-- ---------------------------------------------------------------------------
create function public.admin_create_item(
  p_slug text, p_kind text, p_category text, p_title text, p_is_sample boolean, p_program_position int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item uuid;
begin
  if not private.has_role('editor') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.content_items (slug, kind, category, is_sample, program_position)
  values (p_slug, p_kind, p_category, coalesce(p_is_sample, false), p_program_position)
  returning id into v_item;
  insert into public.content_versions (item_id, version, title, author_id)
  values (v_item, 1, p_title, auth.uid());
  perform private.audit('content.create', v_item::text);
  return v_item;
end;
$$;

-- Starts a new draft from the latest version. Returns an existing open draft if one exists.
create function public.admin_new_version(p_item uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open uuid;
  v_src public.content_versions;
  v_id uuid;
begin
  if not private.has_role('editor') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  perform 1 from public.content_items i where i.id = p_item for update;
  select v.id into v_open from public.content_versions v
  where v.item_id = p_item and v.status in ('draft', 'changes_requested', 'in_review', 'approved')
  order by v.version desc limit 1;
  if v_open is not null then
    return v_open;
  end if;
  select * into v_src from public.content_versions v where v.item_id = p_item order by v.version desc limit 1;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.content_versions (
    item_id, version, title, summary, body, solo_steps, together_steps, reflection_prompt,
    duration_minutes, stages, health_related, is_placeholder, audio_path, transcript, author_id)
  values (
    p_item, v_src.version + 1, v_src.title, v_src.summary, v_src.body, v_src.solo_steps, v_src.together_steps,
    v_src.reflection_prompt, v_src.duration_minutes, v_src.stages, v_src.health_related, v_src.is_placeholder,
    v_src.audio_path, v_src.transcript, auth.uid())
  returning id into v_id;
  insert into public.content_sources (version_id, title, url, accessed_on)
  select v_id, s.title, s.url, s.accessed_on from public.content_sources s where s.version_id = v_src.id;
  perform private.audit('content.new_version', v_id::text);
  return v_id;
end;
$$;

create function public.admin_submit_for_review(p_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('editor') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.content_versions set status = 'in_review'
   where id = p_version and status in ('draft', 'changes_requested');
  if not found then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  perform private.audit('content.submit', p_version::text);
end;
$$;

create function public.admin_record_review(p_version uuid, p_type text, p_result text, p_notes text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ver public.content_versions;
  v_status text;
begin
  if not private.has_role('reviewer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into v_ver from public.content_versions v where v.id = p_version for update;
  if not found or v_ver.status <> 'in_review' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  insert into public.content_reviews (version_id, reviewer_id, review_type, result, notes)
  values (p_version, auth.uid(), p_type, p_result, coalesce(p_notes, ''));

  if p_result = 'changes_requested' then
    v_status := 'changes_requested';
  elsif exists (select 1 from public.content_reviews r
                where r.version_id = p_version and r.review_type = 'editorial' and r.result = 'approved')
        and (not v_ver.health_related or v_ver.is_placeholder or exists (
               select 1 from public.content_reviews r
               where r.version_id = p_version and r.review_type = 'clinical' and r.result = 'approved')) then
    v_status := 'approved';
  else
    v_status := 'in_review';
  end if;
  update public.content_versions set status = v_status where id = p_version;
  perform private.audit('content.review.' || p_type || '.' || p_result, p_version::text);
  return v_status;
end;
$$;

create function public.admin_publish_version(p_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ver public.content_versions;
begin
  if not private.has_role('publisher') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into v_ver from public.content_versions v where v.id = p_version for update;
  if not found or v_ver.status <> 'approved' then
    raise exception 'not_approved' using errcode = 'P0001';
  end if;
  if v_ver.health_related and not v_ver.is_placeholder
     and not exists (select 1 from public.content_sources s where s.version_id = p_version) then
    raise exception 'sources_required' using errcode = 'P0001';
  end if;
  if v_ver.audio_path is not null
     and not exists (select 1 from public.asset_licenses l where l.asset_path = v_ver.audio_path) then
    raise exception 'license_required' using errcode = 'P0001';
  end if;

  update public.content_versions set status = 'superseded'
   where item_id = v_ver.item_id and status = 'published';
  update public.content_versions set status = 'published', published_at = now() where id = p_version;
  update public.content_items set published_version_id = p_version, withdrawn_at = null where id = v_ver.item_id;
  perform private.audit('content.publish', p_version::text);
end;
$$;

create function public.admin_withdraw_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('publisher') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.content_versions set status = 'withdrawn'
   where item_id = p_item and status = 'published';
  update public.content_items set withdrawn_at = now(), published_version_id = null where id = p_item;
  perform private.audit('content.withdraw', p_item::text);
end;
$$;

-- Public review attribution for a published version (shown on /learn pages).
-- Reveals only review type, date and the reviewer's display name.
create function public.content_review_summary(p_version uuid)
returns table (review_type text, reviewed_at timestamptz, reviewer_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.review_type, r.created_at, coalesce(nullif(p.display_name, ''), 'Little Bloom reviewer')
  from public.content_reviews r
  join public.content_versions v on v.id = r.version_id
  left join public.profiles p on p.user_id = r.reviewer_id
  where r.version_id = p_version and r.result = 'approved'
    and v.status = 'published' and private.can_read_item(v.item_id)
  order by r.created_at
$$;

-- ---------------------------------------------------------------------------
-- Operator functions
-- ---------------------------------------------------------------------------
create function public.admin_set_role(p_email text, p_role text, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  if not private.has_role('operator') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select u.id into v_target from auth.users u where lower(u.email) = lower(p_email);
  if v_target is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if p_grant then
    insert into public.admin_roles (user_id, role) values (v_target, p_role) on conflict do nothing;
  else
    if v_target = auth.uid() and p_role = 'operator' then
      raise exception 'cannot_remove_own_operator' using errcode = 'P0001';
    end if;
    delete from public.admin_roles where user_id = v_target and role = p_role;
  end if;
  perform private.audit(case when p_grant then 'role.grant.' else 'role.revoke.' end || p_role, v_target::text);
end;
$$;

-- Aggregate pilot report (section 21). No private content, no identities.
create function public.admin_pilot_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('operator') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return (
    with fam as (
      select f.id, f.created_at from public.families f
    ),
    member_progress as (
      select m.family_id, a.completed_at
      from public.family_memberships m
      join public.activity_progress a on a.user_id = m.user_id
    ),
    activated as (
      select distinct fam.id, fam.created_at from fam
      join member_progress mp on mp.family_id = fam.id
      where mp.completed_at <= fam.created_at + interval '48 hours'
    ),
    returned as (
      select distinct a.id from activated a
      join member_progress mp on mp.family_id = a.id
      where mp.completed_at >= a.created_at + interval '7 days'
        and mp.completed_at < a.created_at + interval '14 days'
    ),
    accepted as (
      select i.family_id, i.accepted_by from public.family_invitations i where i.accepted_at is not null
    )
    select jsonb_build_object(
      'generated_at', now(),
      'families_enrolled', (select count(*) from fam),
      'families_active', (select count(*) from public.families where status = 'active'),
      'families_max', private.limit_value('max_families'),
      'activated', (select count(*) from activated),
      'returned_days_8_14', (select count(*) from returned),
      'eligible_for_return_metric', (select count(*) from activated where created_at <= now() - interval '14 days'),
      'partner_invites_accepted', (select count(*) from accepted),
      'partners_contributed', (select count(*) from accepted a where exists (
          select 1 from public.memories m where m.family_id = a.family_id and m.author_id = a.accepted_by)),
      'families_with_memory', (select count(distinct family_id) from public.memories where state = 'active'),
      'storage', jsonb_build_object(
        'active_recordings', (select count(*) from public.recordings where state = 'active'),
        'active_bytes', (select coalesce(sum(actual_bytes), 0) from public.recordings where state = 'active'),
        'reserved', (select count(*) from public.recordings where state = 'reserved'),
        'stale_reservations', (select count(*) from public.recordings where state = 'reserved' and expires_at < now()),
        'deleting', (select count(*) from public.recordings where state = 'deleting'),
        'failed', (select count(*) from public.recordings where state = 'failed'),
        'storage_limit_bytes', 1000000000),
      'events_90d', (select coalesce(jsonb_object_agg(event_type, n), '{}'::jsonb) from (
          select event_type, count(*) as n from public.pilot_events
          where created_at > now() - interval '90 days' group by event_type) e),
      'pending_deletions', (select count(*) from public.deletion_requests where state <> 'completed'),
      'content', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
          select status, count(*) as n from public.content_versions group by status) c)
    )
  );
end;
$$;

-- Retention (section 13.2): raw events 90 days; spent invitation tokens after 7 days.
create function public.admin_run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_events int;
  v_invites int;
begin
  if not (private.has_role('operator') or private.is_service_role()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  delete from public.pilot_events where created_at < now() - interval '90 days';
  get diagnostics v_events = row_count;
  delete from public.family_invitations
   where (accepted_at is not null or revoked_at is not null or expires_at < now())
     and greatest(coalesce(accepted_at, '-infinity'), coalesce(revoked_at, '-infinity'), expires_at)
         < now() - interval '7 days';
  get diagnostics v_invites = row_count;
  perform private.audit('ops.retention', null);
  return jsonb_build_object('events_deleted', v_events, 'invitations_deleted', v_invites);
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (section 7.6), called by the delete-account Edge Function
-- with the service role after it has verified the user's session.
-- ---------------------------------------------------------------------------
create function public.prepare_account_deletion(p_user uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.family_memberships;
  v_partner uuid;
  v_keys text[];
begin
  if not private.is_service_role() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.deletion_requests (user_id, attempts) values (p_user, 1)
  on conflict (user_id) do update
    set attempts = public.deletion_requests.attempts + 1, state = 'processing', last_error = null;

  v_member := private.active_membership(p_user);
  if v_member.id is not null and v_member.role = 'owner' then
    -- Close the family. Partner entries are detached into author-only access.
    select m.user_id into v_partner from public.family_memberships m
    where m.family_id = v_member.family_id and m.role = 'partner' and m.status = 'active';
    if v_partner is not null then
      perform private.end_partner_membership(v_member.family_id, v_partner, 'revoked');
    end if;
    update public.family_invitations set revoked_at = now()
     where family_id = v_member.family_id and accepted_at is null and revoked_at is null;
    update public.families set status = 'closed', closed_at = now() where id = v_member.family_id;
  elsif v_member.id is not null then
    perform private.end_partner_membership(v_member.family_id, p_user, 'left');
  end if;

  -- Block access to the user's entries immediately.
  update public.memories set state = 'deleting', visibility = 'private' where author_id = p_user;
  update public.recordings set state = 'deleting' where author_id = p_user and state in ('reserved', 'active');

  select coalesce(array_agg(r.object_key), '{}') into v_keys from public.recordings r where r.author_id = p_user;
  return v_keys;
end;
$$;

create function public.finish_account_deletion(p_user uuid, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_service_role() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.deletion_requests
     set state = case when p_error is null then 'completed' else 'failed' end,
         completed_at = case when p_error is null then now() end,
         last_error = left(p_error, 500)
   where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execution grants. Nothing is executable unless listed here.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function
  private.is_member(uuid), private.is_owner(uuid), private.is_pilot_member(),
  private.has_role(text), private.has_editorial_role(), private.can_read_item(uuid),
  private.can_upload_recording(text), private.can_read_recording(text),
  private.can_delete_recording(text)
  to anon, authenticated;

grant execute on function
  public.get_my_context(), public.create_family(),
  public.complete_onboarding(text, text, jsonb, text, date, text),
  public.get_family_overview(), public.create_invitation(), public.revoke_invitation(),
  public.accept_invitation(text), public.revoke_partner(), public.leave_family(),
  public.complete_activity(uuid), public.log_event(text),
  public.create_text_memory(text, text, text, uuid),
  public.reserve_recording_upload(uuid, text, bigint, int, text, text, text, uuid),
  public.finalize_recording(uuid), public.abandon_recording(uuid),
  public.delete_memory(uuid), public.complete_memory_deletion(uuid),
  public.export_my_data(),
  public.admin_create_item(text, text, text, text, boolean, int), public.admin_new_version(uuid),
  public.admin_submit_for_review(uuid), public.admin_record_review(uuid, text, text, text),
  public.admin_publish_version(uuid), public.admin_withdraw_item(uuid),
  public.admin_set_role(text, text, boolean), public.admin_pilot_report(), public.admin_run_retention()
  to authenticated;

grant execute on function public.content_review_summary(uuid) to anon, authenticated;

grant execute on function
  public.prepare_account_deletion(uuid), public.finish_account_deletion(uuid, text), public.admin_run_retention()
  to service_role;
