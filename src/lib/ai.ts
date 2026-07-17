import { supabase } from './supabase'

export type EvidenceBrief = {
  output: string
  provider: string
  model: string
  evidence: Array<{ id: string; title: string; sourceUrl: string | null; publishedAt: string | null }>
}

export async function generateEvidenceBrief(workspaceId: string): Promise<EvidenceBrief> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    body: {
      workspaceId,
      operation: 'brief',
      prompt: 'Summarize the most recent saved evidence. List only supported observations, explain important uncertainty, and suggest one cautious marketing question to investigate next.',
    },
  })
  if (error) {
    const response = (error as { context?: Response }).context
    const payload = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null
    throw new Error(payload?.error ?? data?.error ?? error.message)
  }
  if (!data?.output) throw new Error(data?.error ?? 'The AI gateway returned no brief.')
  return data as EvidenceBrief
}
