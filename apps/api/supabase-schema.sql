-- Context-engine baseline schema for the API service.
-- Run this in Supabase SQL editor before using persisted endpoints.

create table if not exists integration_consents (
  user_id text not null,
  provider text not null,
  enabled boolean not null default false,
  metadata_only boolean not null default true,
  scopes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists integration_accounts (
  user_id text not null,
  provider text not null,
  status text not null,
  metadata_only boolean not null default true,
  scopes jsonb not null default '[]'::jsonb,
  last_sync_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists integration_tokens (
  user_id text not null,
  provider text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_type text,
  expires_at timestamptz,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists oauth_states (
  state text primary key,
  user_id text not null,
  provider text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create table if not exists external_items (
  id text primary key,
  user_id text not null,
  provider text not null,
  type text not null,
  source_ref text not null,
  title text not null,
  summary text not null,
  requires_reply boolean not null default false,
  is_outstanding boolean not null default false,
  sender text,
  tags jsonb not null default '[]'::jsonb,
  created_at_iso timestamptz not null default now(),
  updated_at_iso timestamptz not null default now()
);

create table if not exists workflows (
  id text primary key,
  user_id text not null,
  name text not null,
  enabled boolean not null default true,
  selected_providers jsonb not null default '[]'::jsonb,
  template text not null,
  trigger jsonb not null,
  delivery_channels jsonb not null default '[]'::jsonb,
  created_at_iso timestamptz not null default now(),
  updated_at_iso timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_runs (
  id text primary key,
  user_id text not null,
  workflow_id text not null,
  started_at_iso timestamptz not null,
  finished_at_iso timestamptz not null,
  status text not null,
  delivered_channels jsonb not null default '[]'::jsonb,
  digest jsonb,
  error_message text,
  integrations_used jsonb not null default '[]'::jsonb,
  stage_results jsonb not null default '[]'::jsonb,
  artifact_refs jsonb not null default '[]'::jsonb,
  context_snapshot_id text
);

create table if not exists daily_context_snapshots (
  id text primary key,
  user_id text not null,
  date_iso date not null,
  generated_at_iso timestamptz not null,
  summary text not null,
  confidence double precision not null default 0,
  outstanding_items jsonb not null default '[]'::jsonb,
  top_blockers jsonb not null default '[]'::jsonb,
  what_changed jsonb not null default '[]'::jsonb,
  digest jsonb not null,
  source_statuses jsonb not null default '[]'::jsonb,
  workflow_artifact_refs jsonb not null default '[]'::jsonb,
  commitments jsonb not null default '[]'::jsonb,
  llm_model text not null,
  fallback_used boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists recommendation_audit (
  id bigint generated always as identity primary key,
  user_id text not null,
  generated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists morning_briefs (
  id bigint generated always as identity primary key,
  user_id text not null,
  generated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists daily_briefs (
  user_id text not null,
  date date not null,
  brief_json jsonb not null,
  model_version text not null default 'v1',
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists context_inputs (
  id bigint generated always as identity primary key,
  user_id text not null,
  source text not null,
  captured_at_iso timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists pipeline_audit (
  id bigint generated always as identity primary key,
  user_id text not null,
  snapshot_id text not null,
  traces jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists assistant_audit (
  id bigint generated always as identity primary key,
  user_id text not null,
  snapshot_id text,
  question text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists llm_call_audit (
  id bigint generated always as identity primary key,
  user_id text not null,
  core_version text not null default 'v1',
  mode_version text not null default 'v1',
  mode text not null,
  context_hash text,
  tool_calls jsonb default '[]'::jsonb,
  token_usage jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id text primary key,
  email text,
  display_name text,
  first_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function sync_user_profile_from_auth_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_first_name text;
  metadata_name text;
  derived_display_name text;
begin
  metadata_first_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  metadata_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  derived_display_name := coalesce(metadata_name, split_part(coalesce(new.email, ''), '@', 1));

  insert into user_profiles (user_id, email, display_name, first_name, updated_at)
  values (
    new.id::text,
    new.email,
    derived_display_name,
    coalesce(metadata_first_name, nullif(split_part(derived_display_name, ' ', 1), '')),
    now()
  )
  on conflict (user_id)
  do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, user_profiles.display_name),
    first_name = coalesce(excluded.first_name, user_profiles.first_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update on auth.users
for each row execute function sync_user_profile_from_auth_users();
