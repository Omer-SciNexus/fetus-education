-- Little Bloom: core schema.
-- Security model: every table has RLS enabled (see 20261031000200_policies.sql).
-- Multi-row or quota-sensitive writes go through security-definer functions
-- (see 20261031000300_functions.sql) so they stay atomic and cannot be bypassed.

create extension if not exists pgcrypto with schema extensions;

-- Schema for internals that must never be exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);
-- Secret used to pseudonymise pilot events. Generated once per database.
insert into private.settings (key, value)
values ('event_salt', encode(extensions.gen_random_bytes(32), 'hex'));

-- ---------------------------------------------------------------------------
-- Application limits (section 5.2). Kept in one place so tests and functions agree.
-- ---------------------------------------------------------------------------
create table private.limits (
  key text primary key,
  value bigint not null
);
insert into private.limits (key, value) values
  ('max_families', 25),
  ('max_recordings_per_family', 10),
  ('max_recording_bytes', 2000000),
  ('max_family_recording_bytes', 20000000),
  ('max_text_memories_per_family', 100),
  ('max_memory_chars', 2000),
  ('invitation_hours', 48),
  ('max_invitations_per_day', 5),
  ('reservation_minutes', 15);

create function private.limit_value(p_key text)
returns bigint
language sql
stable
set search_path = ''
as $$ select value from private.limits where key = p_key $$;

-- ---------------------------------------------------------------------------
-- Identity, pilot admission and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  timezone text check (char_length(timezone) <= 64),
  preferences jsonb not null default '{}'::jsonb,
  content_paused boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owner-maintained allowlist of pilot participants (account owners only;
-- partners join through invitations).
create table public.pilot_admissions (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  note text check (char_length(note) <= 200),
  admitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('editor', 'reviewer', 'publisher', 'operator')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy text not null check (policy in ('privacy_notice', 'pilot_terms')),
  policy_version text not null check (char_length(policy_version) <= 20),
  decision text not null check (decision in ('accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id);

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index families_one_active_per_owner
  on public.families (owner_user_id) where status = 'active';

create table public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  status text not null default 'active' check (status in ('active', 'revoked', 'left')),
  joined_at timestamptz not null default now(),
  ended_at timestamptz
);
-- A user belongs to at most one family at a time.
create unique index family_memberships_one_active_per_user
  on public.family_memberships (user_id) where status = 'active';
-- At most one active owner and one active partner per family.
create unique index family_memberships_one_role_per_family
  on public.family_memberships (family_id, role) where status = 'active';
create index family_memberships_family_idx on public.family_memberships (family_id);

create table public.pregnancy_profiles (
  family_id uuid primary key references public.families (id) on delete cascade,
  stage text check (stage in ('first', 'second', 'third')),
  due_date date,
  share_with_partner boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index family_invitations_one_pending
  on public.family_invitations (family_id)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Content and editorial workflow
-- ---------------------------------------------------------------------------
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null check (kind in ('activity', 'education', 'story', 'audio')),
  category text not null check (category in ('voice', 'story', 'calm', 'music', 'family', 'learn', 'reflect')),
  is_sample boolean not null default false,
  program_position int unique check (program_position between 1 and 14),
  published_version_id uuid,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  check (program_position is null or kind = 'activity')
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.content_items (id) on delete cascade,
  version int not null,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'superseded', 'withdrawn')),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 400),
  body text not null default '' check (char_length(body) <= 20000),
  solo_steps text not null default '' check (char_length(solo_steps) <= 4000),
  together_steps text not null default '' check (char_length(together_steps) <= 4000),
  reflection_prompt text not null default '' check (char_length(reflection_prompt) <= 300),
  duration_minutes int not null default 5 check (duration_minutes between 1 and 60),
  stages text[] not null default '{}' check (stages <@ array['first', 'second', 'third']::text[]),
  health_related boolean not null default false,
  is_placeholder boolean not null default false,
  audio_path text check (audio_path is null or audio_path ~ '^/editorial-assets/[A-Za-z0-9._/-]+$'),
  transcript text check (char_length(transcript) <= 20000),
  revision_note text not null default '' check (char_length(revision_note) <= 500),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (item_id, version)
);
create index content_versions_item_idx on public.content_versions (item_id);

alter table public.content_items
  add constraint content_items_published_version_fk
  foreign key (published_version_id) references public.content_versions (id) on delete set null;

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.content_versions (id) on delete cascade,
  reviewer_id uuid references auth.users (id) on delete set null,
  review_type text not null check (review_type in ('editorial', 'clinical')),
  result text not null check (result in ('approved', 'changes_requested')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index content_reviews_version_idx on public.content_reviews (version_id);

create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.content_versions (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  url text not null check (url ~ '^https://'),
  accessed_on date not null default current_date
);
create index content_sources_version_idx on public.content_sources (version_id);

create table public.asset_licenses (
  id uuid primary key default gen_random_uuid(),
  asset_path text not null unique check (asset_path ~ '^/editorial-assets/'),
  title text not null,
  creator text not null,
  license text not null,
  attribution text not null default '',
  allowed_uses text not null default '',
  created_at timestamptz not null default now()
);

-- Reviewed text must not change after it leaves draft: approval applies to an
-- immutable version. Status-only transitions are allowed.
create function private.protect_content_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' and old.status <> 'changes_requested' and (
       new.title is distinct from old.title or
       new.summary is distinct from old.summary or
       new.body is distinct from old.body or
       new.solo_steps is distinct from old.solo_steps or
       new.together_steps is distinct from old.together_steps or
       new.reflection_prompt is distinct from old.reflection_prompt or
       new.duration_minutes is distinct from old.duration_minutes or
       new.stages is distinct from old.stages or
       new.health_related is distinct from old.health_related or
       new.is_placeholder is distinct from old.is_placeholder or
       new.audio_path is distinct from old.audio_path or
       new.transcript is distinct from old.transcript) then
    raise exception 'content_version_locked' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_versions_protect
  before update on public.content_versions
  for each row execute function private.protect_content_version();

-- ---------------------------------------------------------------------------
-- Progress, favourites, memories, recordings
-- ---------------------------------------------------------------------------
create table public.activity_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.content_items (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('text', 'voice')),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  activity_id uuid references public.content_items (id) on delete set null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  state text not null default 'active' check (state in ('active', 'deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'text' or char_length(body) > 0)
);
create index memories_family_idx on public.memories (family_id, created_at desc);
create index memories_author_idx on public.memories (author_id);

-- One row per stored or reserved recording. Combines the plan's media_assets and
-- upload_reservations so quota accounting and object state live together.
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  memory_id uuid unique references public.memories (id) on delete set null,
  object_key text not null unique,
  idempotency_key uuid not null,
  mime text not null,
  reserved_bytes bigint not null,
  actual_bytes bigint,
  duration_seconds int check (duration_seconds between 0 and 600),
  -- Draft metadata applied to the memory when the upload is finalized.
  draft_title text not null default '' check (char_length(draft_title) <= 120),
  draft_body text not null default '' check (char_length(draft_body) <= 2000),
  draft_visibility text not null default 'private' check (draft_visibility in ('private', 'shared')),
  draft_activity_id uuid references public.content_items (id) on delete set null,
  state text not null default 'reserved' check (state in ('reserved', 'active', 'failed', 'deleting')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (author_id, idempotency_key)
);
create index recordings_family_state_idx on public.recordings (family_id, state);

-- ---------------------------------------------------------------------------
-- Reporting, audit, lifecycle
-- ---------------------------------------------------------------------------
create table public.pilot_events (
  id bigint generated always as identity primary key,
  actor text not null,
  family text,
  event_type text not null check (event_type in (
    'activity_started', 'activity_completed', 'memory_saved',
    'memory_revisited', 'partner_invite_accepted', 'save_failed')),
  created_at timestamptz not null default now()
);
create index pilot_events_created_idx on public.pilot_events (created_at);

create table public.admin_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_id text,
  outcome text not null default 'ok',
  created_at timestamptz not null default now()
);

-- Minimal deletion ledger. Deliberately has no FK to auth.users so it survives the
-- deletion and can be replayed after a backup restore (section 13.3).
create table public.deletion_requests (
  user_id uuid primary key,
  state text not null default 'processing' check (state in ('processing', 'completed', 'failed')),
  attempts int not null default 0,
  last_error text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance and profile creation
-- ---------------------------------------------------------------------------
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger memories_touch before update on public.memories
  for each row execute function private.touch_updated_at();
create trigger pregnancy_profiles_touch before update on public.pregnancy_profiles
  for each row execute function private.touch_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
