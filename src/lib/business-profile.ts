import { supabase } from './supabase'
import type { Workspace } from './auth'

export type BusinessProfile = {
  business_name: string
  industry: string | null
  description: string | null
  target_audience: string | null
  brand_voice: string | null
  marketing_goals: string[]
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getBusinessProfile(workspaceId: string): Promise<BusinessProfile | null> {
  const { data, error } = await client().from('business_profiles').select('business_name, industry, description, target_audience, brand_voice, marketing_goals').eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveBusinessProfile(workspace: Workspace, profile: BusinessProfile, competitors: string[]) {
  const database = client()
  const { error: profileError } = await database.from('business_profiles').upsert({ workspace_id: workspace.id, ...profile }, { onConflict: 'workspace_id' })
  if (profileError) throw profileError

  const rows = competitors.map((name) => name.trim()).filter(Boolean).map((name) => ({ workspace_id: workspace.id, name }))
  if (rows.length) {
    const { error: competitorError } = await database.from('competitors').upsert(rows, { onConflict: 'workspace_id,name', ignoreDuplicates: true })
    if (competitorError) throw competitorError
  }
}
