-- Phase 3 repair: allow signed-in users to reach the tables.
-- Row-Level Security still decides WHICH rows each user can see or change.
-- Run this once in Supabase SQL Editor after the earlier migrations.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.business_profiles to authenticated;
grant select, insert, update, delete on public.competitors to authenticated;
grant select, insert, update, delete on public.source_documents to authenticated;
grant select, insert, update, delete on public.trend_signals to authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;

notify pgrst, 'reload schema';
