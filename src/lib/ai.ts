import { supabase } from './supabase'

export type EvidenceBrief = {
  output: string
  provider: string
  model: string
  evidence: Array<{ id: string; title: string; sourceUrl: string | null; publishedAt: string | null }>
}

export async function generateEvidenceBrief(workspaceId: string): Promise<EvidenceBrief> {
  if (!supabase) throw new Error('Supabase is not configured.')
  
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  if (!session) {
    throw new Error('Authentication is required. Please sign in to generate AI evidence briefs.')
  }

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
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

export async function sendAIChatMessage(workspaceId: string, prompt: string): Promise<EvidenceBrief> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  if (!session) {
    throw new Error('Authentication is required. Please sign in to chat with TrendsAgent.')
  }

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { workspaceId, operation: 'chat', prompt },
  })
  if (error) {
    const response = (error as { context?: Response }).context
    const payload = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null
    throw new Error(payload?.error ?? data?.error ?? error.message)
  }
  if (!data?.output) throw new Error(data?.error ?? 'The AI gateway returned no response.')
  return data as EvidenceBrief
}

export async function generateStrategyRecommendation(workspaceId: string, prompt: string): Promise<EvidenceBrief> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  if (!session) throw new Error('Authentication is required.')

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { workspaceId, operation: 'recommendation', prompt },
  })
  if (error) {
    const response = (error as { context?: Response }).context
    const payload = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null
    throw new Error(payload?.error ?? data?.error ?? error.message)
  }
  if (!data?.output) throw new Error(data?.error ?? 'The AI gateway returned no recommendation.')
  return data as EvidenceBrief
}

