-- TrendsAgent OS — Phase 2 database foundation
-- Run this entire file in Supabase Dashboard → SQL Editor → New query.
-- It creates workspace-isolated tables and their Row-Level Security policies.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.workspace_role as enum ('owner', 'admin', 'member');

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 160),
  industry text,
  description text,
  target_audience text,
  brand_voice text,
  marketing_goals text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  website_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_url text,
  title text not null,
  source_type text not null check (source_type in ('business_profile', 'competitor', 'trend', 'report', 'manual')),
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  content text not null,
  content_hash text,
  created_at timestamptz not null default now()
);

create table public.trend_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic text not null,
  signal_score numeric(5,2) not null check (signal_score >= 0 and signal_score <= 100),
  change_percent numeric(7,2),
  summary text not null,
  evidence_document_ids uuid[] not null default '{}',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  confidence numeric(5,2) check (confidence >= 0 and confidence <= 100),
  evidence_document_ids uuid[] not null default '{}',
  uncertainty text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'saved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competitors_workspace_id_idx on public.competitors(workspace_id);
create index source_documents_workspace_id_idx on public.source_documents(workspace_id);
create index trend_signals_workspace_observed_at_idx on public.trend_signals(workspace_id, observed_at desc);
create index recommendations_workspace_status_idx on public.recommendations(workspace_id, status);

-- Security helper: true only if the current signed-in user belongs to this workspace.
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.business_profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.source_documents enable row level security;
alter table public.trend_signals enable row level security;
alter table public.recommendations enable row level security;

create policy "Users view own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Members view workspaces" on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy "Members view workspace membership" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));

create policy "Members manage business profile" on public.business_profiles for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "Members manage competitors" on public.competitors for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "Members view source documents" on public.source_documents for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "Members manage trend signals" on public.trend_signals for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "Members manage recommendations" on public.recommendations for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- The following trigger makes a profile automatically when a person signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
