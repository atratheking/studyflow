-- Run once in the SQL editor of a new Supabase project.
-- Each account owns one versioned library. Passwords are managed by Supabase Auth.
create table if not exists public.studyflow_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and state->>'version' = '1'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.studyflow_libraries enable row level security;
revoke all on public.studyflow_libraries from anon, authenticated;
grant select on public.studyflow_libraries to authenticated;
create policy "Read own library" on public.studyflow_libraries
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes go through this compare-and-swap function to prevent a stale device
-- from silently overwriting a newer library. Identity comes from the JWT.
create or replace function public.save_studyflow_library(p_state jsonb, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  next_revision bigint;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or (p_state->>'version') is distinct from '1'
    or jsonb_typeof(p_state->'sets') is distinct from 'array'
    or jsonb_typeof(p_state->'folders') is distinct from 'array'
    or jsonb_typeof(p_state->'activity') is distinct from 'array'
    or jsonb_typeof(p_state->'reviews') is distinct from 'object'
    or jsonb_typeof(p_state->'settings') is distinct from 'object'
    or octet_length(p_state::text) > 52428800 then
    raise exception 'Invalid library or library exceeds 50 MB' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.studyflow_libraries(user_id, state) values (owner_id, p_state)
      on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.studyflow_libraries set state = p_state, revision = revision + 1, updated_at = now()
      where user_id = owner_id and revision = p_expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then
    raise exception 'Library changed on another device' using errcode = '40001';
  end if;
  return next_revision;
end;
$$;
revoke all on function public.save_studyflow_library(jsonb, bigint) from public, anon;
grant execute on function public.save_studyflow_library(jsonb, bigint) to authenticated;
