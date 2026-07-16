import { supabase } from './supabase'

export type AiResult = { output: string; provider: string; model: string; evidence: Array<{ id: string; title: string; sourceUrl: string | null; publishedAt: string | null }> }

export async function createEvidenceBrief(workspaceId: string, prompt: string): Promise<AiResult> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('ai-gateway', { body: { workspaceId, operation: 'brief', prompt } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as AiResult
}
