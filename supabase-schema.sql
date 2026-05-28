-- Run this in Supabase SQL Editor (one time)
-- This creates a single table to store the shared round state.

create table if not exists rounds (
  id text primary key,
  groups jsonb not null,
  pars jsonb not null,
  scores jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Allow anyone with the link to read and write this round.
-- (No auth — this is a private app shared by link.)
alter table rounds enable row level security;

drop policy if exists "anyone can read rounds" on rounds;
create policy "anyone can read rounds"
  on rounds for select
  using (true);

drop policy if exists "anyone can insert rounds" on rounds;
create policy "anyone can insert rounds"
  on rounds for insert
  with check (true);

drop policy if exists "anyone can update rounds" on rounds;
create policy "anyone can update rounds"
  on rounds for update
  using (true)
  with check (true);

-- Enable Realtime for this table so all players see live updates.
alter publication supabase_realtime add table rounds;
