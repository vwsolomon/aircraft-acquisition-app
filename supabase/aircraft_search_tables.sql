-- Run this in your Supabase SQL Editor to enable the Aircraft Search feature.

create table if not exists aircraft_searches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  created_at   timestamptz default now(),
  aircraft_type text not null,
  budget        text,
  priorities    jsonb,
  results       jsonb,
  emails        jsonb,
  mentor_brief  text
);

create table if not exists aircraft_leads (
  id              uuid primary key default gen_random_uuid(),
  search_id       uuid references aircraft_searches(id) on delete cascade,
  created_at      timestamptz default now(),
  tail            text,
  sn              text,
  year            int,
  tt              numeric,
  price           numeric,
  engine_program  text,
  last_inspection text,
  interior        text,
  paint           text,
  score           int,
  broker          text,
  broker_contact  text,
  url             text,
  budget_fit      text,
  flags           jsonb,
  notes           text
);

-- Enable row level security (optional but recommended)
alter table aircraft_searches enable row level security;
alter table aircraft_leads enable row level security;

-- Allow anon/authenticated reads and inserts (adjust to your auth setup)
create policy "Allow all" on aircraft_searches for all using (true) with check (true);
create policy "Allow all" on aircraft_leads for all using (true) with check (true);
