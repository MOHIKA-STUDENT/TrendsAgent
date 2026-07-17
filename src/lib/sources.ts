import { supabase } from './supabase'
import type { Workspace } from './auth'

export type SourceDocument = { id: string; title: string; source_url: string | null; source_type: string; published_at: string | null; retrieved_at: string }

function client() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export async function getSources(workspace: Workspace): Promise<SourceDocument[]> {
  const { data, error } = await client().from('source_documents').select('id, title, source_url, source_type, published_at, retrieved_at').eq('workspace_id', workspace.id).order('retrieved_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addSource(workspace: Workspace, input: { title: string; sourceUrl: string; publishedAt: string; content: string }) {
  const { error } = await client().from('source_documents').insert({ workspace_id: workspace.id, title: input.title, source_url: input.sourceUrl || null, published_at: input.publishedAt || null, source_type: 'manual', content: input.content })
  if (error) throw error
}

export async function deleteSource(workspace: Workspace, sourceId: string) {
  const { error } = await client().from('source_documents').delete().eq('workspace_id', workspace.id).eq('id', sourceId)
  if (error) throw error
}

export async function deleteMultipleSources(workspace: Workspace, sourceIds: string[]) {
  if (!sourceIds.length) return
  const { error } = await client().from('source_documents').delete().eq('workspace_id', workspace.id).in('id', sourceIds)
  if (error) throw error
}

