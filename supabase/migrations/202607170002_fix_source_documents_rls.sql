-- Fix RLS policy on source_documents to guarantee workspace creators & members can view evidence.
drop policy if exists "Members view source documents" on public.source_documents;

create policy "Members view source documents" on public.source_documents
  for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or exists (
      select 1 from public.workspaces
      where id = workspace_id and created_by = auth.uid()
    )
  );

grant select on public.source_documents to authenticated;
notify pgrst, 'reload schema';
