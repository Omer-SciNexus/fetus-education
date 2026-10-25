-- Little Bloom: grants, Row Level Security and storage policies (section 11).
-- Principle: revoke everything, then grant only the operations each role needs.
-- RLS then narrows which rows those operations can touch.

-- ---------------------------------------------------------------------------
-- Helper predicates. Security definer so policies can consult membership and
-- role tables without granting users direct access to them. Identity always
-- comes from the verified session (auth.uid()), never from arguments.
-- ---------------------------------------------------------------------------
grant usage on schema private to anon, authenticated;

create function private.is_member(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_memberships m
    where m.family_id = p_family and m.user_id = (select auth.uid()) and m.status = 'active'
  )
$$;

create function private.is_owner(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_memberships m
    where m.family_id = p_family and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = 'owner'
  )
$$;

create function private.is_pilot_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_memberships m
    join public.families f on f.id = m.family_id
    where m.user_id = (select auth.uid()) and m.status = 'active' and f.status = 'active'
  )
$$;

create function private.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = (select auth.uid()) and r.role = p_role
  )
$$;

create function private.has_editorial_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = (select auth.uid()) and r.role in ('editor', 'reviewer', 'publisher')
  )
$$;

create function private.can_read_item(p_item uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.content_items i
    where i.id = p_item
      and i.published_version_id is not null
      and i.withdrawn_at is null
      and (i.is_sample or private.is_pilot_member())
  )
$$;

-- Storage predicates for the private "recordings" bucket.
create function private.can_upload_recording(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recordings r
    where r.object_key = p_name
      and r.author_id = (select auth.uid())
      and r.state = 'reserved'
      and r.expires_at > now()
      and private.is_member(r.family_id)
  )
$$;

create function private.can_read_recording(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recordings r
    left join public.memories m on m.id = r.memory_id
    where r.object_key = p_name
      and (
        -- Authors can always see their own objects (needed for retry/cleanup).
        r.author_id = (select auth.uid())
        or (
          r.state = 'active' and m.state = 'active' and m.visibility = 'shared'
          and private.is_member(m.family_id)
        )
      )
  )
$$;

create function private.can_delete_recording(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recordings r
    where r.object_key = p_name
      and r.author_id = (select auth.uid())
      and r.state in ('reserved', 'failed', 'deleting')
  )
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_member(uuid), private.is_owner(uuid), private.is_pilot_member(),
  private.has_role(text), private.has_editorial_role(), private.can_read_item(uuid),
  private.can_upload_recording(text), private.can_read_recording(text),
  private.can_delete_recording(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants: start from nothing.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- The service role (Edge Functions and operator scripts only; bypasses RLS).
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Public editorial content (guests may read published samples).
grant select on public.content_items, public.content_versions, public.content_sources, public.asset_licenses
  to anon, authenticated;

-- Authenticated users.
grant select, insert on public.profiles to authenticated;
grant update (display_name, timezone, preferences, content_paused, onboarded_at) on public.profiles to authenticated;
grant select on public.families, public.family_memberships to authenticated;
grant select, insert on public.pregnancy_profiles to authenticated;
grant update (stage, due_date, share_with_partner) on public.pregnancy_profiles to authenticated;
grant select, delete on public.activity_progress to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.memories to authenticated;
grant update (title, body, visibility) on public.memories to authenticated;
grant select on public.recordings to authenticated;
grant select, insert on public.consent_records to authenticated;
grant select on public.admin_roles, public.deletion_requests to authenticated;

-- Editorial and operator roles (RLS restricts to role holders).
grant insert on public.content_items to authenticated;
grant update (category, is_sample, program_position) on public.content_items to authenticated;
grant insert on public.content_versions to authenticated;
grant update (title, summary, body, solo_steps, together_steps, reflection_prompt, duration_minutes,
              stages, health_related, is_placeholder, audio_path, transcript, revision_note)
  on public.content_versions to authenticated;
grant insert, delete on public.content_sources to authenticated;
grant insert, update, delete on public.asset_licenses to authenticated;
grant select on public.content_reviews to authenticated;
grant select, insert, delete on public.pilot_admissions to authenticated;
grant select on public.admin_audit_events to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pilot_admissions enable row level security;
alter table public.admin_roles enable row level security;
alter table public.consent_records enable row level security;
alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.pregnancy_profiles enable row level security;
alter table public.family_invitations enable row level security;
alter table public.content_items enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_reviews enable row level security;
alter table public.content_sources enable row level security;
alter table public.asset_licenses enable row level security;
alter table public.activity_progress enable row level security;
alter table public.favorites enable row level security;
alter table public.memories enable row level security;
alter table public.recordings enable row level security;
alter table public.pilot_events enable row level security;
alter table public.admin_audit_events enable row level security;
alter table public.deletion_requests enable row level security;

-- profiles: own row only.
create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- pilot_admissions: operators only.
create policy admissions_operator_select on public.pilot_admissions for select to authenticated
  using (private.has_role('operator'));
create policy admissions_operator_insert on public.pilot_admissions for insert to authenticated
  with check (private.has_role('operator'));
create policy admissions_operator_delete on public.pilot_admissions for delete to authenticated
  using (private.has_role('operator'));

-- admin_roles: see your own; operators see all. Changes only via operator functions.
create policy admin_roles_select on public.admin_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('operator'));

-- consent_records: own only, append-only.
create policy consent_select_own on public.consent_records for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_insert_own on public.consent_records for insert to authenticated
  with check (user_id = (select auth.uid()));

-- families / memberships: visible to current members.
create policy families_select_member on public.families for select to authenticated
  using (private.is_member(id));
create policy memberships_select on public.family_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_member(family_id));

-- pregnancy_profiles: owner manages; partner reads only when explicitly shared.
create policy pregnancy_select on public.pregnancy_profiles for select to authenticated
  using (private.is_owner(family_id) or (share_with_partner and private.is_member(family_id)));
create policy pregnancy_insert_owner on public.pregnancy_profiles for insert to authenticated
  with check (private.is_owner(family_id));
create policy pregnancy_update_owner on public.pregnancy_profiles for update to authenticated
  using (private.is_owner(family_id)) with check (private.is_owner(family_id));

-- family_invitations: no direct access at all (functions only).

-- content_items
create policy content_items_select on public.content_items for select to anon, authenticated
  using (
    (published_version_id is not null and withdrawn_at is null and (is_sample or private.is_pilot_member()))
    or private.has_editorial_role()
  );
create policy content_items_insert on public.content_items for insert to authenticated
  with check (private.has_role('editor') and published_version_id is null);
create policy content_items_update on public.content_items for update to authenticated
  using (private.has_role('editor') or private.has_role('publisher'))
  with check (private.has_role('editor') or private.has_role('publisher'));

-- content_versions
create policy content_versions_select on public.content_versions for select to anon, authenticated
  using (
    (status = 'published' and private.can_read_item(item_id))
    or private.has_editorial_role()
  );
create policy content_versions_insert on public.content_versions for insert to authenticated
  with check (private.has_role('editor') and status = 'draft' and author_id = (select auth.uid()));
create policy content_versions_update on public.content_versions for update to authenticated
  using (private.has_role('editor') and status in ('draft', 'changes_requested'))
  with check (private.has_role('editor') and status in ('draft', 'changes_requested'));

-- content_reviews: editorial roles read; writes via function.
create policy content_reviews_select on public.content_reviews for select to authenticated
  using (private.has_editorial_role());

-- content_sources: readable when the version is readable; editors change drafts.
create policy content_sources_select on public.content_sources for select to anon, authenticated
  using (exists (select 1 from public.content_versions v where v.id = version_id));
create policy content_sources_insert on public.content_sources for insert to authenticated
  with check (
    private.has_role('editor') and exists (
      select 1 from public.content_versions v
      where v.id = version_id and v.status in ('draft', 'changes_requested'))
  );
create policy content_sources_delete on public.content_sources for delete to authenticated
  using (
    private.has_role('editor') and exists (
      select 1 from public.content_versions v
      where v.id = version_id and v.status in ('draft', 'changes_requested'))
  );

-- asset_licenses: public register; editors/publishers maintain.
create policy asset_licenses_select on public.asset_licenses for select to anon, authenticated
  using (true);
create policy asset_licenses_insert on public.asset_licenses for insert to authenticated
  with check (private.has_role('editor') or private.has_role('publisher'));
create policy asset_licenses_update on public.asset_licenses for update to authenticated
  using (private.has_role('editor') or private.has_role('publisher'))
  with check (private.has_role('editor') or private.has_role('publisher'));
create policy asset_licenses_delete on public.asset_licenses for delete to authenticated
  using (private.has_role('editor') or private.has_role('publisher'));

-- activity_progress: own rows. Completion goes through complete_activity().
create policy progress_select_own on public.activity_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy progress_delete_own on public.activity_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- favorites: own rows, only for content the user may read.
create policy favorites_select_own on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy favorites_insert_own on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_item(item_id));
create policy favorites_delete_own on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- memories: authors see their own; shared entries visible to current family members.
-- Owners can never read a partner's private entries (and vice versa).
create policy memories_select on public.memories for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'shared' and state = 'active' and private.is_member(family_id))
  );
create policy memories_update_author on public.memories for update to authenticated
  using (author_id = (select auth.uid()) and state = 'active')
  with check (
    author_id = (select auth.uid()) and state = 'active'
    and (visibility = 'private' or private.is_member(family_id))
  );

-- recordings: authors see their own rows; others only for visible memories.
create policy recordings_select on public.recordings for select to authenticated
  using (
    author_id = (select auth.uid())
    or (state = 'active' and exists (
      select 1 from public.memories m
      where m.id = memory_id and m.state = 'active' and m.visibility = 'shared'
        and private.is_member(m.family_id)))
  );

-- pilot_events: no direct access (log_event / reports only).

create policy audit_select_operator on public.admin_audit_events for select to authenticated
  using (private.has_role('operator'));

create policy deletion_select on public.deletion_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('operator'));

-- ---------------------------------------------------------------------------
-- Private recordings bucket. 2,000,000-byte cap and constrained audio types are
-- enforced by Storage itself; RLS allows writes only to a server-reserved key.
-- There is deliberately no UPDATE policy, so objects can never be overwritten.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings', 'recordings', false, 2000000,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy recordings_object_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and private.can_upload_recording(name));
create policy recordings_object_select on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and private.can_read_recording(name));
create policy recordings_object_delete on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and private.can_delete_recording(name));
