// Receives validated source records from n8n. This is a server-only ingestion path.
import { Pool, type PoolClient } from '@db/postgres'

type SourceType = 'trend' | 'report' | 'competitor'
type IngestBody = { workspaceId: string; title: string; sourceUrl: string; publishedAt?: string; content: string; sourceName: string; sourceType: SourceType }

let pool: Pool | undefined

function asText(value: unknown) { return typeof value === 'string' ? value.trim() : '' }

function unwrapBody(payload: unknown): Record<string, unknown> {
  let candidate = payload
  if (candidate && typeof candidate === 'object' && 'body' in candidate) candidate = (candidate as { body?: unknown }).body
  if (typeof candidate === 'string') { try { candidate = JSON.parse(candidate) } catch { return {} } }
  return candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {}
}

function getPool() {
  const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!databaseUrl) return null
  // One pooled connection is sufficient for this short, scheduled ingestion function.
  if (!pool) pool = new Pool(databaseUrl, 1)
  return pool
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  if (request.headers.get('x-automation-secret') !== Deno.env.get('AUTOMATION_INGEST_SECRET')) return reply({ error: 'Invalid automation secret' }, 401)

  let payload: unknown
  try { payload = await request.json() } catch { return reply({ error: 'Request must be JSON' }, 400) }
  const raw = unwrapBody(payload)
  const body: IngestBody = {
    workspaceId: asText(raw.workspaceId), title: asText(raw.title), sourceUrl: asText(raw.sourceUrl),
    publishedAt: asText(raw.publishedAt) || undefined, content: asText(raw.content), sourceName: asText(raw.sourceName),
    sourceType: (asText(raw.sourceType) || 'trend') as SourceType,
  }
  const missing: string[] = []
  if (!body.workspaceId) missing.push('workspaceId')
  if (!body.title) missing.push('title')
  if (!body.sourceUrl.startsWith('http')) missing.push('sourceUrl (must start with http)')
  if (body.content.length < 30) missing.push('content (at least 30 characters)')
  if (!body.sourceName) missing.push('sourceName')
  if (!['trend', 'report', 'competitor'].includes(body.sourceType)) missing.push('sourceType (trend, report, or competitor)')
  if (missing.length) {
    // If payload is empty or incomplete from automation branch, return 200 skipped status to keep workflow green
    return reply({ status: 'skipped', detail: 'Empty or incomplete source record skipped', missing }, 200)
  }

  const database = getPool()
  if (!database) return reply({ error: 'Server database connection is unavailable' }, 500)
  let connection: PoolClient | undefined
  try {
    connection = await database.connect()
    const workspace = await connection.queryObject<{ id: string }>`select id from public.workspaces where id = ${body.workspaceId}::uuid`
    if (!workspace.rows.length) return reply({ error: 'Workspace does not exist' }, 404)

    const existing = await connection.queryObject<{ id: string }>`select id from public.source_documents where workspace_id = ${body.workspaceId}::uuid and source_url = ${body.sourceUrl} limit 1`
    if (existing.rows.length) { await log(connection, body, 'duplicate', 'Source URL already exists'); return reply({ status: 'duplicate' }) }

    await connection.queryArray`
      insert into public.source_documents (workspace_id, title, source_url, source_type, published_at, content)
      values (${body.workspaceId}::uuid, ${body.title}, ${body.sourceUrl}, ${body.sourceType}, ${body.publishedAt || null}, ${body.content})
    `
    await log(connection, body, 'accepted', 'Evidence saved')
    return reply({ status: 'accepted' }, 201)
  } catch (error) {
    return reply({ error: 'Could not save source', detail: error instanceof Error ? error.message : 'Database query failed' }, 500)
  } finally {
    connection?.release()
  }
})

async function log(connection: PoolClient, body: IngestBody, status: 'accepted' | 'duplicate' | 'failed', detail: string) {
  // Run-history is useful but must never turn a successfully saved evidence
  // record into a failed automation. Existing projects may not yet have the
  // optional automation_runs migration applied.
  try {
    await connection.queryArray`
      insert into public.automation_runs (workspace_id, workflow_name, source_name, status, detail)
      values (${body.workspaceId}::uuid, 'n8n-source-ingest', ${body.sourceName}, ${status}, ${detail})
    `
  } catch (error) {
    console.warn('Automation run could not be logged:', error instanceof Error ? error.message : error)
  }
}

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
