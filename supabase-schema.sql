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

-- Enable RLS but allow public read/write (no auth for this app)
alter table events enable row level security;
alter table signups enable row level security;

create policy "Public read events" on events for select using (true);
create policy "Public read signups" on signups for select using (true);
create policy "Public insert signups" on signups for insert with check (true);
create policy "Public delete signups" on signups for delete using (true);
create policy "Service manage events" on events for all using (true);
create policy "Service manage signups" on signups for all using (true);

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
