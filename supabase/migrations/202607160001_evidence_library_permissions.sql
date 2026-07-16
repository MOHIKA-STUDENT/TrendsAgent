-- Phase 7: allow workspace members to add and manage approved evidence.
-- Run this once in Supabase SQL Editor.

create policy "Members manage source documents" on public.source_documents
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

notify pgrst, 'reload schema';
