-- Phase 3: safe workspace creation
-- Run this file after the initial schema migration in Supabase SQL Editor.
-- The browser can call this function, but cannot directly create workspaces or memberships.

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  created_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a workspace';
  end if;

  if char_length(trim(workspace_name)) < 1 or char_length(trim(workspace_name)) > 120 then
    raise exception 'Workspace name must be between 1 and 120 characters';
  end if;

  if workspace_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Workspace slug must use lowercase letters, numbers, and hyphens only';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(workspace_name), workspace_slug, auth.uid())
  returning * into created_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace.id, auth.uid(), 'owner');

  return created_workspace;
end;
$$;

grant execute on function public.create_workspace(text, text) to authenticated;

-- Refresh the REST API schema cache so the browser can call the new function immediately.
notify pgrst, 'reload schema';
