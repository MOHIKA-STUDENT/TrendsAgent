-- Phase 8: records background collection without exposing source content or secrets.
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_name text not null,
  source_name text not null,
  status text not null check (status in ('accepted', 'duplicate', 'rejected', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);

create index automation_runs_workspace_created_at_idx on public.automation_runs(workspace_id, created_at desc);
alter table public.automation_runs enable row level security;
create policy "Members view automation runs" on public.automation_runs for select to authenticated using (public.is_workspace_member(workspace_id));
grant select on public.automation_runs to authenticated;
notify pgrst, 'reload schema';
