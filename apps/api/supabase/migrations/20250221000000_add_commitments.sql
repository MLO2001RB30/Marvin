-- Add commitments column to daily_context_snapshots for Commitment Tracker feature.
alter table daily_context_snapshots
  add column if not exists commitments jsonb not null default '[]'::jsonb;
