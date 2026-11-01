-- Family plan lists and the bump nickname (migration 20261101000100_family_plan).
-- Run with: npm run db:test. Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

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
  ('owner',    tests.mk_user('plan-owner@test.local'),    'plan-owner@test.local'),
  ('partner',  tests.mk_user('plan-partner@test.local'),  'plan-partner@test.local'),
  ('stranger', tests.mk_user('plan-stranger@test.local'), 'plan-stranger@test.local');
insert into public.pilot_admissions (email) values ('plan-owner@test.local');

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
create function tests.item(p_label text) returns uuid language sql as $$
  select id from public.family_list_items where label = p_label $$;

-- ---------------------------------------------------------------- setup
select tests.become('owner');
select public.create_family();

select tests.become('stranger');
select throws_ok($$ select public.add_list_item('bag', 'Socks', '', 'private') $$, 'P0001', 'not_member',
                 'a user without a family cannot add entries');

select tests.become('owner');
select lives_ok($$ select public.add_list_item('bag', 'o-private', '', 'private') $$, 'owner adds a private entry');
select lives_ok($$ select public.add_list_item('bag', 'o-shared', '', 'shared') $$, 'owner adds a shared entry');
select lives_ok($$ select public.add_list_item('names', 'Robin', '', 'shared') $$, 'owner adds a shared name');
select throws_ok($$ select public.add_list_item('weights', 'x', '', 'private') $$, 'P0001', 'invalid_list',
                 'only the three plan lists exist');
select throws_ok($$ select public.add_list_item('bag', '   ', '', 'private') $$, 'P0001', 'list_item_empty',
                 'blank entries are rejected');
select throws_ok($$ select public.add_list_item('bag', repeat('a', 121), '', 'private') $$, 'P0001', 'list_item_too_long',
                 'entry length is enforced');
select throws_ok($$ insert into public.family_list_items (family_id, author_id, list, label)
                    values (gen_random_uuid(), auth.uid(), 'bag', 'direct') $$,
                 '42501', null, 'entries can only be created through add_list_item');
select lives_ok($$ update public.pregnancy_profiles set nickname = 'Peanut' $$, 'owner sets a bump nickname');
select is((public.get_my_context() -> 'pregnancy' ->> 'nickname'), 'Peanut', 'context returns the nickname to the owner');
insert into tests.vals values ('o-private', tests.item('o-private')::text);
insert into tests.vals select 'token', token from public.create_invitation();

-- ---------------------------------------------------------------- partner
select tests.become('partner');
select is((select count(*)::int from public.family_list_items), 0, 'partner sees nothing before joining');
select public.accept_invitation(tests.val('token'));
select results_eq($$ select label from public.family_list_items order by label collate "C" $$,
                  $$ values ('Robin'::text), ('o-shared') $$, 'partner sees only shared owner entries');
select is((public.get_my_context() ->> 'pregnancy'), null, 'nickname stays hidden while pregnancy details are unshared');
select lives_ok($$ select public.set_list_item_done(tests.item('o-shared'), true) $$, 'partner ticks a shared entry');
select throws_ok($$ select public.set_list_item_done(tests.val('o-private')::uuid, true) $$,
                 'P0001', 'not_found', 'partner cannot tick an entry they cannot see');
update public.family_list_items set label = 'tampered' where label = 'o-shared';
delete from public.family_list_items where label = 'o-shared';
select is((select label from public.family_list_items where label = 'o-shared'), 'o-shared',
          'partner cannot rename or delete the owner''s entry');
select lives_ok($$ insert into public.name_hearts (item_id, user_id) values (tests.item('Robin'), auth.uid()) $$,
                'partner hearts a shared name');
select throws_ok($$ insert into public.name_hearts (item_id, user_id)
                    values (tests.item('Robin'), (select id from tests.who where name = 'owner')) $$,
                 '42501', null, 'nobody can heart on someone else''s behalf');
select throws_ok($$ insert into public.name_hearts (item_id, user_id) values (tests.item('o-shared'), auth.uid()) $$,
                 '42501', null, 'only names can be hearted');
select lives_ok($$ select public.add_list_item('names', 'p-shared-name', '', 'shared') $$, 'partner adds a shared name');
select lives_ok($$ select public.add_list_item('questions', 'p-private-q', '', 'private') $$, 'partner adds a private question');

select tests.become('owner');
select results_eq($$ select label || ':' || done from public.family_list_items order by label collate "C" $$,
                  $$ values ('Robin:false'::text), ('o-private:false'), ('o-shared:true'), ('p-shared-name:false') $$,
                  'owner sees the partner''s tick and shared name, not their private question');
select is((select count(*)::int from public.name_hearts), 1, 'owner sees the partner''s heart');
insert into public.name_hearts (item_id, user_id) values (tests.item('p-shared-name'), auth.uid());

select tests.become('stranger');
select is((select count(*)::int from public.family_list_items) + (select count(*)::int from public.name_hearts), 0,
          'another account sees no entries or hearts');
select tests.become_anon();
select throws_ok($$ select * from public.family_list_items $$, '42501', null, 'guests cannot read plan entries');

-- ---------------------------------------------------------------- revocation
select tests.become('owner');
select public.revoke_partner();
select results_eq($$ select label from public.family_list_items order by label collate "C" $$,
                  $$ values ('Robin'::text), ('o-private'), ('o-shared') $$,
                  'after revocation the owner no longer sees the partner''s entries');
select is((select count(*)::int from public.name_hearts), 0, 'hearts across the old family boundary are removed');

select tests.become('partner');
select results_eq($$ select label || ':' || visibility from public.family_list_items order by label collate "C" $$,
                  $$ values ('p-private-q:private'::text), ('p-shared-name:private') $$,
                  'the revoked partner keeps only their own, now-unshared, entries');

select * from finish();
rollback;
