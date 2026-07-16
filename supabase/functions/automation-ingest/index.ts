// Receives validated source records from n8n. This function is intentionally separate from the AI gateway.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type IngestBody = { workspaceId: string; title: string; sourceUrl: string; publishedAt?: string; content: string; sourceName: string }

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function unwrapBody(payload: unknown): Record<string, unknown> {
  let candidate = payload
  // The n8n HTTP Request node can send either an object under `body` or a
  // JSON string under `body`, depending on the node's "Specify body" option.
  if (candidate && typeof candidate === 'object' && 'body' in candidate) {
    candidate = (candidate as { body?: unknown }).body
  }
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate) } catch { return {} }
  }
  return candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {}
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  if (request.headers.get('x-automation-secret') !== Deno.env.get('AUTOMATION_INGEST_SECRET')) return reply({ error: 'Invalid automation secret' }, 401)
  let payload: unknown
  try { payload = await request.json() } catch { return reply({ error: 'Request must be JSON' }, 400) }
  const raw = unwrapBody(payload)
  const body: IngestBody = {
    workspaceId: asText(raw.workspaceId),
    title: asText(raw.title),
    sourceUrl: asText(raw.sourceUrl),
    publishedAt: asText(raw.publishedAt) || undefined,
    content: asText(raw.content),
    sourceName: asText(raw.sourceName),
  }
  const missing: string[] = []
  if (!body.workspaceId) missing.push('workspaceId')
  if (!body.title?.trim()) missing.push('title')
  if (!body.sourceUrl?.startsWith('http')) missing.push('sourceUrl (must start with http)')
  if (!body.content?.trim() || body.content.length < 30) missing.push('content (at least 30 characters)')
  if (!body.sourceName?.trim()) missing.push('sourceName')
  if (missing.length) return reply({ error: 'Invalid or incomplete source record', missing }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return reply({ error: 'Server database credential is unavailable. Check the hosted Edge Function configuration.' }, 500)
  const database = createClient(supabaseUrl, serviceRoleKey)
  const { data: workspace, error: workspaceError } = await database.from('workspaces').select('id').eq('id', body.workspaceId).maybeSingle()
  if (workspaceError) return reply({ error: 'Could not validate workspace', detail: workspaceError.message }, 500)
  if (!workspace) {
    const { count, error: countError } = await database.from('workspaces').select('id', { count: 'exact', head: true })
    return reply({
      error: 'Workspace does not exist',
      workspaceIdReceived: body.workspaceId,
      accessibleWorkspaceCount: countError ? null : count,
      hint: count ? 'Use the exact ID from this project’s workspaces table.' : 'The automation function cannot see any workspace records. Check that the app workspace was created in this Supabase project.',
    }, 404)
  }

  const { data: existing, error: lookupError } = await database.from('source_documents').select('id').eq('workspace_id', body.workspaceId).eq('source_url', body.sourceUrl).maybeSingle()
  if (lookupError) return reply({ error: 'Could not check source duplicates' }, 500)
  if (existing) { await log(database, body, 'duplicate', 'Source URL already exists'); return reply({ status: 'duplicate' }) }

  const { error } = await database.from('source_documents').insert({ workspace_id: body.workspaceId, title: body.title.trim(), source_url: body.sourceUrl, source_type: 'trend', published_at: body.publishedAt || null, content: body.content.trim() })
  if (error) { await log(database, body, 'failed', error.message); return reply({ error: 'Could not save source' }, 500) }
  await log(database, body, 'accepted', 'Evidence saved')
  return reply({ status: 'accepted' }, 201)
})

async function log(database: ReturnType<typeof createClient>, body: IngestBody, status: 'accepted' | 'duplicate' | 'failed', detail: string) {
  await database.from('automation_runs').insert({ workspace_id: body.workspaceId, workflow_name: 'n8n-source-ingest', source_name: body.sourceName, status, detail })
}
function reply(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
