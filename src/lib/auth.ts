import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Workspace = { id: string; name: string; slug: string }

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Check your local .env file.')
  return supabase
}

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(fullName: string, email: string, password: string) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  const { error } = await client().auth.signOut()
  if (error) throw error
}

export async function getWorkspaces(user: User): Promise<Workspace[]> {
  void user
  const { data, error } = await client().from('workspaces').select('id, name, slug').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function workspaceSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-workspace'
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const { data, error } = await client().rpc('create_workspace', { workspace_name: name, workspace_slug: workspaceSlug(name) })
  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('create_workspace')) {
      throw new Error('Supabase cannot find the workspace function. Run the Phase 3 workspace-creation SQL in Supabase SQL Editor, then refresh this page.')
    }
    throw error
  }
  return data as Workspace
}

export async function deleteWorkspace(workspaceId: string) {
  const { error } = await client().from('workspaces').delete().eq('id', workspaceId)
  if (error) throw error
}

