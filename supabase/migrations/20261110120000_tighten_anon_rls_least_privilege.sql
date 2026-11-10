-- Security fix 1/4 (10 Nov review): least-privilege RLS for the anon role.
--
-- The legacy schema granted anon full read/write via RLS policies with USING (true),
-- including bogus "Service manage" policies that applied to every role—not only
-- service_role. Writes and admin reads must use the Supabase service role on the server
-- (bypasses RLS). This migration does not grant anon insert/update/delete on any table.
--
-- Apply via Supabase SQL Editor or `supabase db push` (not in app CI—never production).

-- ---------------------------------------------------------------------------
-- volunteers (present in production since volunteer management; missing from schema)
-- ---------------------------------------------------------------------------
create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists volunteers_name_lower_idx
  on public.volunteers (lower(trim(name)));

alter table public.volunteers enable row level security;

-- ---------------------------------------------------------------------------
-- Drop permissive legacy policies (events + signups)
-- ---------------------------------------------------------------------------
drop policy if exists "Public read events" on public.events;
drop policy if exists "Public read signups" on public.signups;
drop policy if exists "Public insert signups" on public.signups;
drop policy if exists "Public delete signups" on public.signups;
drop policy if exists "Service manage events" on public.events;
drop policy if exists "Service manage signups" on public.signups;

drop policy if exists "Public read volunteers" on public.volunteers;
drop policy if exists "Service manage volunteers" on public.volunteers;

-- ---------------------------------------------------------------------------
-- anon: read-only policies aligned with the public volunteer sign-up page
-- ---------------------------------------------------------------------------

-- Event list, detail, capacity, cancelled state, nested signup names
create policy "anon_select_events"
  on public.events
  for select
  to anon
  using (true);

-- Who is signed up per event (withdraw uses signup id via server API, not direct DB)
create policy "anon_select_signups"
  on public.signups
  for select
  to anon
  using (true);

-- Name picker on the public page (active roster only)
create policy "anon_select_active_volunteers"
  on public.volunteers
  for select
  to anon
  using (active is true);

-- ---------------------------------------------------------------------------
-- Column-level grants: anon cannot read volunteer PII or signup emails
-- ---------------------------------------------------------------------------
revoke all on table public.events from anon;
grant select on table public.events to anon;

revoke all on table public.signups from anon;
grant select (id, event_id, volunteer_name, created_at) on table public.signups to anon;

revoke all on table public.volunteers from anon;
grant select (name) on table public.volunteers to anon;
