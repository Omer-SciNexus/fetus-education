-- Little Bloom: family plan lists and an optional bump nickname.
-- Features adopted from the platform review in docs/research/prenatal-platforms.md.
-- The rules match memories: entries are author-only unless shared, a partner who
-- leaves or is removed loses access, and nothing here holds health measurements.

insert into private.limits (key, value) values
  ('max_list_items_per_family', 300);

-- ---------------------------------------------------------------------------
-- Bump nickname (태명). Owner-set; the partner sees it only through
-- pregnancy_profiles' existing share_with_partner rule.
-- ---------------------------------------------------------------------------
alter table public.pregnancy_profiles
  add column nickname text check (char_length(nickname) <= 40);

grant update (nickname) on public.pregnancy_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Family plan: hospital bag, questions for the care provider, baby names.
-- ---------------------------------------------------------------------------
create table public.family_list_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  list text not null check (list in ('bag', 'questions', 'names')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 300),
  done boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index family_list_items_family_idx on public.family_list_items (family_id, list);
create index family_list_items_author_idx on public.family_list_items (author_id);

create trigger family_list_items_touch before update on public.family_list_items
  for each row execute function private.touch_updated_at();

-- A heart on a name: one per person per name.
create table public.name_hearts (
  item_id uuid not null references public.family_list_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index name_hearts_user_idx on public.name_hearts (user_id);

-- True when the caller may see a list item: their own, or shared within their current family.
create function private.can_see_list_item(p_item uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_list_items i
    where i.id = p_item
      and (i.author_id = (select auth.uid()) or (i.visibility = 'shared' and private.is_member(i.family_id)))
  )
$$;
revoke execute on function private.can_see_list_item(uuid) from public, anon;
grant execute on function private.can_see_list_item(uuid) to authenticated;

grant select, delete on public.family_list_items to authenticated;
grant update (label, note, visibility) on public.family_list_items to authenticated;
grant select, insert, delete on public.name_hearts to authenticated;

alter table public.family_list_items enable row level security;
alter table public.name_hearts enable row level security;

create policy list_items_select on public.family_list_items for select to authenticated
  using (author_id = (select auth.uid()) or (visibility = 'shared' and private.is_member(family_id)));
create policy list_items_update_author on public.family_list_items for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and (visibility = 'private' or private.is_member(family_id)));
create policy list_items_delete_author on public.family_list_items for delete to authenticated
  using (author_id = (select auth.uid()));

create policy name_hearts_select on public.name_hearts for select to authenticated
  using (user_id = (select auth.uid()) or private.can_see_list_item(item_id));
create policy name_hearts_insert_own on public.name_hearts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_see_list_item(item_id)
    and exists (select 1 from public.family_list_items i where i.id = item_id and i.list = 'names')
  );
create policy name_hearts_delete_own on public.name_hearts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Adds an entry to the caller's family, under a family lock so the quota holds.
create function public.add_list_item(p_list text, p_label text, p_note text, p_visibility text)
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
  if p_list not in ('bag', 'questions', 'names') then
    raise exception 'invalid_list' using errcode = 'P0001';
  end if;
  if p_visibility not in ('private', 'shared') then
    raise exception 'invalid_visibility' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_label, ''))) = 0 then
    raise exception 'list_item_empty' using errcode = 'P0001';
  end if;
  if char_length(btrim(p_label)) > 120 or char_length(coalesce(p_note, '')) > 300 then
    raise exception 'list_item_too_long' using errcode = 'P0001';
  end if;
  perform 1 from public.families f where f.id = v_member.family_id for update;
  if (select count(*) from public.family_list_items i where i.family_id = v_member.family_id)
     >= private.limit_value('max_list_items_per_family') then
    raise exception 'list_item_limit' using errcode = 'P0001';
  end if;

  insert into public.family_list_items (family_id, author_id, list, label, note, visibility)
  values (v_member.family_id, v_uid, p_list, btrim(p_label), coalesce(p_note, ''), p_visibility)
  returning id into v_id;
  return v_id;
end;
$$;

-- Ticks an entry. Either partner may tick a shared entry; only the author a private one.
create function public.set_list_item_done(p_item uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.can_see_list_item(p_item) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  update public.family_list_items set done = coalesce(p_done, false) where id = p_item;
end;
$$;

revoke execute on function
  public.add_list_item(text, text, text, text), public.set_list_item_done(uuid, boolean)
  from public, anon;
grant execute on function
  public.add_list_item(text, text, text, text), public.set_list_item_done(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- A partner who leaves or is removed: their entries become author-only, and
-- hearts across the old boundary are removed so neither side keeps a trace.
-- ---------------------------------------------------------------------------
create or replace function private.end_partner_membership(p_family uuid, p_partner uuid, p_status text)
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
  update public.family_list_items
     set visibility = 'private'
   where family_id = p_family and author_id = p_partner and visibility = 'shared';
  delete from public.name_hearts h
   using public.family_list_items i
   where h.item_id = i.id and i.family_id = p_family
     and ((h.user_id = p_partner and i.author_id <> p_partner)
          or (i.author_id = p_partner and h.user_id <> p_partner));
end;
$$;

-- ---------------------------------------------------------------------------
-- Context and export now include the nickname and list entries.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_context()
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
      'share_with_partner', v_preg.share_with_partner, 'nickname', v_preg.nickname) end,
    'roles', coalesce((select jsonb_agg(r.role order by r.role) from public.admin_roles r where r.user_id = v_uid), '[]'::jsonb),
    'pending_deletion', v_pending_deletion
  );
end;
$$;

create or replace function public.export_my_data()
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
    'format', 'little-bloom-export-v2',
    'readme', 'profile: your settings. progress/favorites: activities by slug. memories: entries you authored. '
              || 'family_plan: list entries you authored. name_hearts: names you hearted. '
              || 'Voice recordings are listed under memories[].recording and are downloaded as separate files.',
    'profile', (select to_jsonb(p) - 'user_id' from public.profiles p where p.user_id = v_uid),
    'family_role', v_member.role,
    'pregnancy', case when v_member.role = 'owner' then (
      select jsonb_build_object('stage', pp.stage, 'due_date', pp.due_date, 'nickname', pp.nickname,
                                'share_with_partner', pp.share_with_partner)
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
    'family_plan', (select coalesce(jsonb_agg(jsonb_build_object(
                      'list', l.list, 'label', l.label, 'note', l.note, 'done', l.done,
                      'visibility', l.visibility, 'created_at', l.created_at)
                    order by l.list, l.created_at), '[]'::jsonb)
                    from public.family_list_items l where l.author_id = v_uid),
    'name_hearts', (select coalesce(jsonb_agg(l.label order by h.created_at), '[]'::jsonb)
                    from public.name_hearts h join public.family_list_items l on l.id = h.item_id
                    where h.user_id = v_uid),
    'consents', (select coalesce(jsonb_agg(jsonb_build_object(
                   'policy', c.policy, 'version', c.policy_version, 'decision', c.decision, 'at', c.created_at)), '[]'::jsonb)
                 from public.consent_records c where c.user_id = v_uid)
  );
end;
$$;
