-- Grant select permissions on business_profiles and workspaces to anon role for n8n automated collectors.
grant select on public.business_profiles to anon, authenticated;
grant select on public.workspaces to anon, authenticated;

-- Allow anon to query business_profiles by workspace_id
create policy "Allow anon workspace lookup for n8n" on public.business_profiles
  for select to anon using (true);

notify pgrst, 'reload schema';
