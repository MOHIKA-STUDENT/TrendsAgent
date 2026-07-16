-- Phase 6: AI request audit trail.
-- Run once in Supabase SQL Editor. This stores metadata, never provider API keys.

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  operation text not null check (operation in ('brief', 'chat', 'recommendation')),
  provider text,
  model text,
  status text not null check (status in ('started', 'completed', 'failed', 'rejected')),
  input_summary text,
  output_summary text,
  evidence_count integer not null default 0,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_runs_workspace_created_at_idx on public.ai_runs(workspace_id, created_at desc);

alter table public.ai_runs enable row level security;
create policy "Members view their workspace AI runs" on public.ai_runs for select to authenticated using (public.is_workspace_member(workspace_id));

grant select on public.ai_runs to authenticated;
notify pgrst, 'reload schema';
