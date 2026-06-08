-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Aircraft table
create table if not exists aircraft (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Identity
  make text default '',
  model text default '',
  year int,
  serial_number text default '',
  registration text default '',
  -- Deal
  status text default 'New Lead',
  asking_price numeric,
  source_url text default '',
  source_site text default '',
  location text default '',
  seller_name text default '',
  seller_contact text default '',
  -- Airframe
  airframe_hours numeric,
  cycles numeric,
  -- Engine
  engine_model text default '',
  engine_serial text default '',
  engine_time numeric,
  engine_program text default '',
  -- Prop
  prop_model text default '',
  prop_time numeric,
  -- Avionics
  avionics_notes text default '',
  -- Condition
  interior_notes text default '',
  exterior_notes text default '',
  damage_history text default '',
  -- Inspections
  annual_due text default '',
  inspection_notes text default '',
  -- Import meta
  raw_snapshot text default '',
  import_confidence jsonb default '{}',
  -- Notes
  notes text default '',
  next_action text default '',
  next_action_date text default ''
);

-- Diligence table
create table if not exists diligence (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  aircraft_id uuid references aircraft(id) on delete cascade,
  category text default '',
  item text default '',
  status text default 'Pending',
  owner text default '',
  due_date text default '',
  evidence_url text default '',
  notes text default ''
);

-- Enable Row Level Security (open for now, add auth later)
alter table aircraft enable row level security;
alter table diligence enable row level security;

-- Allow all operations for now (you can restrict later with auth)
create policy "Allow all on aircraft" on aircraft for all using (true) with check (true);
create policy "Allow all on diligence" on diligence for all using (true) with check (true);
