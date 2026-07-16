// TrendsAgent's server-side AI gateway.
// Deploy with Supabase CLI only after setting the required secrets listed in README.md.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type GatewayRequest = { workspaceId: string; operation: 'brief' | 'chat' | 'recommendation'; prompt: string }
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Authentication is required.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Your session is invalid. Please sign in again.' }, 401)

  let body: GatewayRequest
  try { body = await request.json() } catch { return json({ error: 'Request must be valid JSON.' }, 400) }
  if (!body.workspaceId || !body.prompt?.trim() || !['brief', 'chat', 'recommendation'].includes(body.operation)) return json({ error: 'workspaceId, operation, and prompt are required.' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: membership } = await admin.from('workspace_members').select('workspace_id').eq('workspace_id', body.workspaceId).eq('user_id', user.id).maybeSingle()
  if (!membership) return json({ error: 'You do not have access to this workspace.' }, 403)

  // Evidence is mandatory. The gateway refuses to generate factual market claims without sources.
  const { data: evidence, error: evidenceError } = await admin.from('source_documents').select('id, title, source_url, published_at, content').eq('workspace_id', body.workspaceId).order('retrieved_at', { ascending: false }).limit(8)
  if (evidenceError) return json({ error: 'Could not retrieve evidence.' }, 500)
  if (!evidence?.length) {
    await logRun(admin, body, user.id, 'rejected', 0, 'NO_EVIDENCE')
    return json({ error: 'No verified sources exist for this workspace yet. Add approved sources before requesting AI analysis.', code: 'NO_EVIDENCE' }, 422)
  }

  const provider = Deno.env.get('AI_PROVIDER') ?? 'openrouter'
  const baseUrl = Deno.env.get('AI_BASE_URL') ?? 'https://openrouter.ai/api/v1'
  const apiKey = Deno.env.get('AI_API_KEY')
  const model = Deno.env.get('AI_MODEL') ?? 'openai/gpt-4.1-mini'
  if (!apiKey) return json({ error: 'The AI gateway has not been configured by the project owner.', code: 'AI_NOT_CONFIGURED' }, 503)

  const sourceText = evidence.map((item, index) => `[${index + 1}] ${item.title}\nURL: ${item.source_url ?? 'Internal workspace source'}\nDate: ${item.published_at ?? 'Unknown'}\n${item.content.slice(0, 3000)}`).join('\n\n')
  const system = 'You are TrendsAgent. Use only the supplied evidence. Do not invent facts. If evidence is insufficient, say so. Cite every factual claim with [source-number]. Clearly label recommendations as interpretations. Return concise Markdown.'
  await logRun(admin, body, user.id, 'started', evidence.length)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: `User request:\n${body.prompt}\n\nVerified evidence:\n${sourceText}` }] }),
    })
    if (!response.ok) throw new Error(`Provider returned ${response.status}`)
    const payload = await response.json()
    const output = payload.choices?.[0]?.message?.content
    if (!output) throw new Error('Provider returned no usable content')
    await logRun(admin, body, user.id, 'completed', evidence.length, undefined, output.slice(0, 500))
    return json({ output, provider, model, evidence: evidence.map(({ id, title, source_url, published_at }) => ({ id, title, sourceUrl: source_url, publishedAt: published_at })) })
  } catch (error) {
    await logRun(admin, body, user.id, 'failed', evidence.length, 'PROVIDER_ERROR')
    return json({ error: 'The AI provider could not complete this request. No recommendation was saved.', detail: error instanceof Error ? error.message : undefined }, 502)
  }
})

async function logRun(admin: ReturnType<typeof createClient>, body: GatewayRequest, userId: string, status: 'started' | 'completed' | 'failed' | 'rejected', evidenceCount: number, errorCode?: string, outputSummary?: string) {
  await admin.from('ai_runs').insert({ workspace_id: body.workspaceId, requested_by: userId, operation: body.operation, provider: Deno.env.get('AI_PROVIDER') ?? 'openrouter', model: Deno.env.get('AI_MODEL') ?? 'openai/gpt-4.1-mini', status, input_summary: body.prompt.slice(0, 500), output_summary: outputSummary, evidence_count: evidenceCount, error_code: errorCode, completed_at: status === 'started' ? null : new Date().toISOString() })
}

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
