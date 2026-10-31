-- Authorization tests (section 20, "Database and storage tests").
-- Run with: npm run db:test   (requires `npm run db:start`; uses the seeded content)
-- Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

-- ---------------------------------------------------------------- helpers
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.mk_user(p_email text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated', p_email, '',
          now(), '{}', '{}', now(), now());
  return v;
end $$;

create table tests.who (name text primary key, id uuid, email text);
create table tests.vals (k text primary key, v text);
grant select on tests.who to anon, authenticated;
grant select, insert, update on tests.vals to anon, authenticated;

insert into tests.who values
  ('owner',    tests.mk_user('owner@test.local'),    'owner@test.local'),
  ('owner2',   tests.mk_user('owner2@test.local'),   'owner2@test.local'),
  ('partner',  tests.mk_user('partner@test.local'),  'partner@test.local'),
  ('stranger', tests.mk_user('stranger@test.local'), 'stranger@test.local'),
  ('editor',   tests.mk_user('editor@test.local'),   'editor@test.local');

insert into public.pilot_admissions (email) values ('owner@test.local'), ('owner2@test.local');
insert into public.admin_roles (user_id, role) select id, 'editor' from tests.who where name = 'editor';

-- Impersonates a user exactly as PostgREST would: role + verified JWT claims.
create function tests.become(p_name text) returns void language plpgsql as $$
declare r record;
begin
  reset role;
  select * into r from tests.who where name = p_name;
  perform set_config('request.jwt.claims',
    json_build_object('sub', r.id, 'role', 'authenticated', 'email', r.email)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.become_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

create function tests.val(p_k text) returns text language sql as $$ select v from tests.vals where k = p_k $$;

-- ---------------------------------------------------------------- families
select tests.become('stranger');
select throws_ok($$ select public.create_family() $$, 'P0001', 'not_admitted', 'non-admitted user cannot create a family');

select tests.become('owner');
insert into tests.vals values ('family', public.create_family()::text);
select is(public.create_family()::text, tests.val('family'), 'create_family is idempotent for retried logins');
select is((select count(*)::int from public.families), 1, 'owner sees exactly their family');

select tests.become('owner2');
insert into tests.vals values ('family2', public.create_family()::text);
select is((select count(*)::int from public.families), 1, 'second owner sees only their own family');

-- ---------------------------------------------------------------- privilege escalation
select tests.become('owner');
select throws_ok($$ insert into public.admin_roles (user_id, role) values (auth.uid(), 'operator') $$,
                 '42501', null, 'users cannot self-assign roles');
select throws_ok($$ select * from public.family_invitations $$, '42501', null, 'invitation table is not readable');
select throws_ok($$ select * from public.pilot_events $$, '42501', null, 'raw events are not readable');
select throws_ok($$ update public.memories set author_id = auth.uid() $$, '42501', null, 'memory author cannot be changed');
select throws_ok($$ select public.prepare_account_deletion(auth.uid()) $$, '42501', null, 'deletion internals need the service role');
select throws_ok($$ select public.admin_pilot_report() $$, 'P0001', 'forbidden', 'pilot report needs the operator role');

-- ---------------------------------------------------------------- memories and partner isolation
select lives_ok($$ select public.create_text_memory('a-private', 'owner private note', 'private', null) $$, 'owner saves a private memory');
select lives_ok($$ select public.create_text_memory('a-shared', 'owner shared note', 'shared', null) $$, 'owner saves a shared memory');
select throws_ok($$ select public.create_text_memory('x', repeat('a', 2001), 'private', null) $$, 'P0001', 'memory_too_long', 'text length is enforced');
insert into tests.vals select 'token', token from public.create_invitation();

select tests.become('owner2');
select throws_ok($$ select public.accept_invitation(tests.val('token')) $$, 'P0001', 'already_member', 'a member of another family cannot accept');
select is((select count(*)::int from public.memories), 0, 'another family sees none of the owner''s memories');

select tests.become('partner');
select is((select count(*)::int from public.memories), 0, 'partner sees nothing before joining');
select lives_ok($$ select public.accept_invitation(tests.val('token')) $$, 'partner accepts the invitation');
select lives_ok($$ select public.accept_invitation(tests.val('token')) $$, 'accepting again is idempotent for the same user');
select results_eq($$ select title from public.memories order by title $$, $$ values ('a-shared'::text) $$,
                  'partner sees only explicitly shared owner memories');
select is((select count(*)::int from public.pregnancy_profiles), 0, 'pregnancy details are hidden from the partner by default');
select lives_ok($$ select public.create_text_memory('p-private', 'partner private note', 'private', null) $$, 'partner saves a private memory');
select lives_ok($$ select public.create_text_memory('p-shared', 'partner shared note', 'shared', null) $$, 'partner saves a shared memory');

select tests.become('stranger');
select throws_ok($$ select public.accept_invitation(tests.val('token')) $$, 'P0001', 'invitation_used', 'a used token cannot be redeemed by a second account');
select throws_ok($$ select public.accept_invitation(repeat('0', 64)) $$, 'P0001', 'invitation_invalid', 'a guessed token is rejected');

select tests.become('owner');
select results_eq($$ select title from public.memories order by title $$,
                  $$ values ('a-private'::text), ('a-shared'), ('p-shared') $$,
                  'owner cannot read the partner''s private memory');
update public.memories set body = 'tampered' where title = 'p-shared';
select tests.become('partner');
select is((select body from public.memories where title = 'p-shared'), 'partner shared note', 'owner cannot edit the partner''s memory');
select throws_ok($$ select public.delete_memory((select id from public.memories where title = 'a-shared')) $$,
                 'P0001', 'not_found', 'only the author can delete a memory');

select tests.become('owner');
select throws_ok($$ select * from public.create_invitation() $$, 'P0001', 'partner_exists', 'a third member cannot be invited');
select tests.become('partner');
select throws_ok($$ select * from public.create_invitation() $$, 'P0001', 'not_owner', 'partners cannot invite');

-- ---------------------------------------------------------------- revocation and expiry
select tests.become('owner');
select lives_ok($$ select public.revoke_partner() $$, 'owner revokes the partner');
select tests.become('partner');
select results_eq($$ select title || ':' || visibility from public.memories order by title $$,
                  $$ values ('p-private:private'::text), ('p-shared:private') $$,
                  'revoked partner keeps only their own, now-unshared, memories');
select tests.become('owner');
select is((select count(*)::int from public.memories where title like 'p-%'), 0, 'owner loses access to unshared partner entries');

insert into tests.vals select 'token2', token from public.create_invitation();
reset role;
update public.family_invitations set expires_at = now() - interval '1 minute' where accepted_at is null and revoked_at is null;
select tests.become('stranger');
select throws_ok($$ select public.accept_invitation(tests.val('token2')) $$, 'P0001', 'invitation_expired', 'an expired invitation grants no access');

-- ---------------------------------------------------------------- recording quotas and storage
select tests.become('owner');
insert into tests.vals select 'rec1', recording_id::text || '|' || object_key
  from public.reserve_recording_upload(gen_random_uuid(), 'audio/webm', 500000, 30, '', '', 'private', null);
select throws_ok($$ select * from public.reserve_recording_upload(gen_random_uuid(), 'audio/webm', 1000, 1, '', '', 'private', null) $$,
                 'P0001', 'upload_in_progress', 'only one active upload per user');
select throws_ok($$ select * from public.reserve_recording_upload(gen_random_uuid(), 'audio/webm', 2000001, 1, '', '', 'private', null) $$,
                 'P0001', 'file_too_large', 'the per-file byte limit is enforced');
select throws_ok($$ select * from public.reserve_recording_upload(gen_random_uuid(), 'video/mp4', 1000, 1, '', '', 'private', null) $$,
                 'P0001', 'unsupported_audio', 'non-audio types are refused');
select throws_ok($$ select public.finalize_recording(split_part(tests.val('rec1'), '|', 1)::uuid) $$,
                 'P0001', 'upload_missing', 'finalize cannot claim a file that does not exist');

select throws_ok($$ insert into storage.objects (bucket_id, name, metadata)
                    values ('recordings', 'someone/else/file.webm', '{"size":10,"mimetype":"audio/webm"}') $$,
                 '42501', null, 'direct upload to an unreserved key is blocked');
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
                   values ('recordings', split_part(tests.val('rec1'), '|', 2), '{"size":400000,"mimetype":"audio/webm"}') $$,
                'upload to the reserved key is allowed');
update storage.objects set metadata = '{"size":1,"mimetype":"audio/webm"}' where name = split_part(tests.val('rec1'), '|', 2);
reset role;
select is((select (metadata ->> 'size')::int from storage.objects where name = split_part(tests.val('rec1'), '|', 2)), 400000,
          'stored objects cannot be overwritten');

select tests.become('owner');
select ok(public.finalize_recording(split_part(tests.val('rec1'), '|', 1)::uuid) is not null,
          'finalize activates the memory once the object exists');
select is((select actual_bytes::int from public.recordings), 400000, 'quota uses the stored object''s real size');

reset role;
insert into public.recordings (family_id, author_id, object_key, idempotency_key, mime, reserved_bytes, actual_bytes, state, expires_at)
select tests.val('family')::uuid, (select id from tests.who where name = 'owner'),
       'fill/' || g, gen_random_uuid(), 'audio/webm', 1000, 1000, 'active', now()
from generate_series(1, 9) g;
select tests.become('owner');
select throws_ok($$ select * from public.reserve_recording_upload(gen_random_uuid(), 'audio/webm', 1000, 1, '', '', 'private', null) $$,
                 'P0001', 'recording_limit', 'the family recording count limit is enforced server-side');

-- ---------------------------------------------------------------- content visibility and review locking
reset role;
insert into public.content_items (slug, kind, category) values ('draft-only', 'activity', 'calm');
insert into public.content_versions (item_id, version, title)
  select id, 1, 'Draft only' from public.content_items where slug = 'draft-only';

select tests.become_anon();
select is((select count(*)::int from public.content_items where not is_sample), 0, 'guests see only published samples');
select tests.become('owner');
select is((select count(*)::int from public.content_items where slug = 'draft-only'), 0, 'members cannot see unpublished drafts');
select tests.become('editor');
select is((select count(*)::int from public.content_items where slug = 'draft-only'), 1, 'editors can see drafts');

reset role;
select throws_ok($$ update public.content_versions set body = body || ' edited'
                    where id = (select published_version_id from public.content_items where slug = 'say-hello') $$,
                 'P0001', 'content_version_locked', 'a published version cannot be edited in place');

select * from finish();
rollback;
