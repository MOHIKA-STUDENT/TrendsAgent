import { supabase } from './supabase'
import type { Workspace } from './auth'

export type DashboardData = {
  competitorCount: number
  savedRecommendationCount: number
  trendCount: number
  recommendations: Array<{ id: string; title: string; description: string; priority: 'low' | 'medium' | 'high'; status: string; uncertainty: string | null }>
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getDashboardData(workspace: Workspace): Promise<DashboardData> {
  const database = client()
  const [competitors, trends, recommendations] = await Promise.all([
    database.from('competitors').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    database.from('trend_signals').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    database.from('recommendations').select('id, title, description, priority, status, uncertainty').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
  ])
  if (competitors.error) throw competitors.error
  if (trends.error) throw trends.error
  if (recommendations.error) throw recommendations.error
  return { competitorCount: competitors.count ?? 0, trendCount: trends.count ?? 0, savedRecommendationCount: recommendations.data.length, recommendations: recommendations.data }
}

export async function saveDraftRecommendation(workspace: Workspace) {
  const { error } = await client().from('recommendations').insert({
    workspace_id: workspace.id,
    title: 'Launch a customer-story content series',
    description: 'Create three 30-second customer stories that show a clear before-and-after transformation. Publish one per week across Instagram and LinkedIn.',
    priority: 'high',
    status: 'saved',
    uncertainty: 'This is a planning draft. It has not yet been verified against collected market evidence.',
  })
  if (error) throw error
}
