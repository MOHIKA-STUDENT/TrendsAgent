// Server-side, evidence-grounded AI gateway. Provider keys never reach the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Pool, type PoolClient } from 'jsr:@db/postgres@^0'

type GatewayRequest = { workspaceId: string; operation: 'brief' | 'chat' | 'recommendation'; prompt: string }
type Evidence = { id: string; title: string; source_url: string | null; published_at: string | Date | null; content: string }
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
let pool: Pool | undefined

function keyFromMap(variableName: string) {
  const raw = Deno.env.get(variableName)
  if (!raw) return undefined
  try { const keys = JSON.parse(raw) as Record<string, unknown>; return typeof keys.default === 'string' ? keys.default : undefined } catch { return undefined }
}
function getPublishableKey() { return keyFromMap('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY') }
function getPool() {
  const url = Deno.env.get('SUPABASE_DB_URL')
  if (!url) return null
  if (!pool) pool = new Pool(url, 1)
  return pool
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = getPublishableKey()
  if (!authorization) return json({ error: 'Authentication is required.' }, 401)
  if (!supabaseUrl || !publishableKey) return json({ error: 'Server authentication configuration is unavailable.' }, 500)
  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Your session is invalid. Please sign in again.' }, 401)

  let body: GatewayRequest
  try { body = await request.json() } catch { return json({ error: 'Request must be valid JSON.' }, 400) }
  if (!body.workspaceId || !body.prompt?.trim() || !['brief', 'chat', 'recommendation'].includes(body.operation)) return json({ error: 'workspaceId, operation, and prompt are required.' }, 400)

  const database = getPool()
  if (!database) return json({ error: 'Server database connection is unavailable.' }, 500)
  let connection: PoolClient | undefined
  try {
    connection = await database.connect()
    const membership = await connection.queryObject<{ workspace_id: string }>`select workspace_id from public.workspace_members where workspace_id = ${body.workspaceId}::uuid and user_id = ${user.id}::uuid limit 1`
    if (!membership.rows.length) return json({ error: 'You do not have access to this workspace.' }, 403)
    const evidenceResult = await connection.queryObject<Evidence>`select id, title, source_url, published_at, content from public.source_documents where workspace_id = ${body.workspaceId}::uuid order by retrieved_at desc limit 8`
    const evidence = evidenceResult.rows
    if (!evidence.length) { await logRun(connection, body, user.id, 'rejected', 0, 'NO_EVIDENCE'); return json({ error: 'No verified sources exist for this workspace yet. Add approved sources before requesting AI analysis.', code: 'NO_EVIDENCE' }, 422) }

    const provider = Deno.env.get('AI_PROVIDER') ?? 'openrouter'
    const baseUrl = Deno.env.get('AI_BASE_URL') ?? 'https://openrouter.ai/api/v1'
    const apiKey = Deno.env.get('AI_API_KEY')
    const model = Deno.env.get('AI_MODEL') ?? 'openai/gpt-4.1-mini'
    if (!apiKey) return json({ error: 'The AI gateway has not been configured by the project owner.', code: 'AI_NOT_CONFIGURED' }, 503)

    const sourceText = evidence.map((item, index) => `[${index + 1}] ${item.title}\nURL: ${item.source_url ?? 'Internal workspace source'}\nDate: ${item.published_at ? new Date(item.published_at).toISOString() : 'Unknown'}\n${item.content.slice(0, 3000)}`).join('\n\n')
    const system = 'You are TrendsAgent. Use only the supplied evidence. Do not invent facts or claim a trend is relevant to the business unless the evidence supports it. Cite every factual claim with [source-number]. Clearly label interpretations and recommendations. If the evidence is insufficient, say so. Return concise Markdown.'
    await logRun(connection, body, user.id, 'started', evidence.length)
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: `User request:\n${body.prompt}\n\nVerified evidence:\n${sourceText}` }] }) })
    if (!response.ok) throw new Error(`Provider returned ${response.status}`)
    const payload = await response.json()
    const output = payload.choices?.[0]?.message?.content
    if (!output) throw new Error('Provider returned no usable content')
    await logRun(connection, body, user.id, 'completed', evidence.length, undefined, output.slice(0, 500))
    return json({ output, provider, model, evidence: evidence.map(({ id, title, source_url, published_at }) => ({ id, title, sourceUrl: source_url, publishedAt: published_at })) })
  } catch (error) {
    if (connection) await logRun(connection, body, user.id, 'failed', 0, 'PROVIDER_OR_DATABASE_ERROR')
    return json({ error: 'The AI provider could not complete this request. No recommendation was saved.', detail: error instanceof Error ? error.message : undefined }, 502)
  } finally { connection?.release() }
})

async function logRun(connection: PoolClient, body: GatewayRequest, userId: string, status: 'started' | 'completed' | 'failed' | 'rejected', evidenceCount: number, errorCode?: string, outputSummary?: string) {
  try { await connection.queryArray`insert into public.ai_runs (workspace_id, requested_by, operation, provider, model, status, input_summary, output_summary, evidence_count, error_code, completed_at) values (${body.workspaceId}::uuid, ${userId}::uuid, ${body.operation}, ${Deno.env.get('AI_PROVIDER') ?? 'openrouter'}, ${Deno.env.get('AI_MODEL') ?? 'openai/gpt-4.1-mini'}, ${status}, ${body.prompt.slice(0, 500)}, ${outputSummary ?? null}, ${evidenceCount}, ${errorCode ?? null}, ${status === 'started' ? null : new Date().toISOString()})` } catch (error) { console.warn('AI run could not be logged:', error instanceof Error ? error.message : error) }
}
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
