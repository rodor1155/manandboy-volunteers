-- MAN&BOY Volunteer Signup Schema
-- Run this in your Supabase SQL editor

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_start date not null,
  date_end date,
  description text,
  address text,
  max_volunteers integer,
  cancelled boolean default false,
  created_at timestamptz default now()
);

create table signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  volunteer_name text not null,
  volunteer_email text,
  created_at timestamptz default now()
);

create table volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now()
);

create unique index volunteers_name_lower_idx on volunteers (lower(trim(name)));

-- RLS: anon is read-only with least privilege; server uses service_role for writes/admin.
alter table events enable row level security;
alter table signups enable row level security;
alter table volunteers enable row level security;

create policy "anon_select_events"
  on events for select to anon using (true);

create policy "anon_select_signups"
  on signups for select to anon using (true);

create policy "anon_select_active_volunteers"
  on volunteers for select to anon using (active is true);

revoke all on table events from anon;
grant select on table events to anon;

revoke all on table signups from anon;
grant select (id, event_id, volunteer_name, created_at) on table signups to anon;

revoke all on table volunteers from anon;
grant select (name) on table volunteers to anon;

-- Seed the initial events
insert into events (title, date_start, max_volunteers) values
  ('Surrey Activity Day 2', '2025-05-23', null),
  ('Activity Day 2', '2025-06-07', null),
  ('June Camp 2', '2025-06-26', null),
  ('Dads, Lads & Lasses', '2025-07-03', null),
  ('Activity Day 3', '2025-09-26', null),
  ('October Camp 3', '2025-10-09', null),
  ('Possible Surrey Camp', '2025-11-13', null),
  ('Climb and Connect 1', '2025-11-22', null),
  ('Activity Day - End of Year', '2025-11-28', null),
  ('Climb and Connect 2', '2025-11-29', null),
  ('Climb and Connect 3', '2025-12-06', null);

-- Update multi-day events with end dates
update events set date_end = '2025-06-28' where title = 'June Camp 2';
update events set date_end = '2025-07-05' where title = 'Dads, Lads & Lasses';
update events set date_end = '2025-10-11' where title = 'October Camp 3';
update events set date_end = '2025-11-15' where title = 'Possible Surrey Camp';

-- Migration: run this in the Supabase SQL editor if your project was created
-- before the "address" field was added (fixes "Edit" not saving on events).
-- alter table events add column if not exists address text;
