// Server-side, evidence-grounded Universal AI Gateway with automatic multi-provider failover.
// Provider keys never reach the browser. Supports OpenRouter, Gemini, Groq, OpenAI, DeepSeek, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Pool, type PoolClient } from '@db/postgres'

type GatewayRequest = { workspaceId: string; operation: 'brief' | 'chat' | 'recommendation'; prompt: string }
type Evidence = { id: string; title: string; source_url: string | null; published_at: string | Date | null; content: string }

interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  model: string
  extraHeaders?: Record<string, string>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

let pool: Pool | undefined

function keyFromMap(variableName: string) {
  const raw = Deno.env.get(variableName)
  if (!raw) return undefined
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>
    return typeof keys.default === 'string' ? keys.default : undefined
  } catch {
    return undefined
  }
}

function getPublishableKey() {
  return keyFromMap('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY')
}

function getPool() {
  const url = Deno.env.get('SUPABASE_DB_URL')
  if (!url) return null
  if (!pool) pool = new Pool(url, 1)
  return pool
}

/**
 * Builds an ordered list of candidate AI providers and models based on configured environment variables.
 * Enables automatic failover across multiple free & paid provider keys (OpenRouter, Gemini, Groq, DeepSeek, OpenAI).
 */
function getProviderCandidates(): ProviderConfig[] {
  const candidates: ProviderConfig[] = []

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('AI_API_KEY')
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const groqKey = Deno.env.get('GROQ_API_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')
  const customModel = Deno.env.get('AI_MODEL')

  // 1. OpenRouter Free Tier Model (Highest reliability, free)
  if (openRouterKey) {
    if (customModel && !customModel.includes('gpt-4.1')) {
      candidates.push({
        name: 'openrouter-custom',
        baseUrl: (Deno.env.get('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
        apiKey: openRouterKey,
        model: customModel,
        extraHeaders: { 'HTTP-Referer': 'https://trendsagent.os', 'X-Title': 'TrendsAgent OS' },
      })
    }
    candidates.push({
      name: 'openrouter-gemini-free',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      model: 'google/gemini-2.0-flash-lite-001:free',
      extraHeaders: { 'HTTP-Referer': 'https://trendsagent.os', 'X-Title': 'TrendsAgent OS' },
    })
    candidates.push({
      name: 'openrouter-llama-free',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      extraHeaders: { 'HTTP-Referer': 'https://trendsagent.os', 'X-Title': 'TrendsAgent OS' },
    })
    candidates.push({
      name: 'openrouter-gpt4o-mini',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      model: 'openai/gpt-4o-mini',
      extraHeaders: { 'HTTP-Referer': 'https://trendsagent.os', 'X-Title': 'TrendsAgent OS' },
    })
  }

  // 2. Google Gemini API (Direct free tier from Google AI Studio)
  if (geminiKey) {
    candidates.push({
      name: 'gemini-direct',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: geminiKey,
      model: 'gemini-2.0-flash',
    })
  }

  // 3. Groq API (Direct ultra-fast free tier)
  if (groqKey) {
    candidates.push({
      name: 'groq-direct',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      model: 'llama-3.3-70b-versatile',
    })
  }

  // 4. OpenAI Direct API
  if (openAiKey) {
    candidates.push({
      name: 'openai-direct',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: openAiKey,
      model: 'gpt-4o-mini',
    })
  }

  // 5. DeepSeek Direct API
  if (deepseekKey) {
    candidates.push({
      name: 'deepseek-direct',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: deepseekKey,
      model: 'deepseek-chat',
    })
  }

  return candidates
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = getPublishableKey()

  if (!authorization) {
    return json({ error: 'Authentication is required. Missing authorization header.', code: 'UNAUTHORIZED_NO_AUTH_HEADER' }, 401)
  }
  if (!supabaseUrl || !publishableKey) {
    return json({ error: 'Server authentication configuration is unavailable.' }, 500)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Your session is invalid. Please sign in again.', code: 'INVALID_SESSION' }, 401)
  }

  let body: GatewayRequest
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request must be valid JSON.' }, 400)
  }
  if (!body.workspaceId || !body.prompt?.trim() || !['brief', 'chat', 'recommendation'].includes(body.operation)) {
    return json({ error: 'workspaceId, operation, and prompt are required.' }, 400)
  }

  const database = getPool()
  if (!database) return json({ error: 'Server database connection is unavailable.' }, 500)
  let connection: PoolClient | undefined

  try {
    connection = await database.connect()
    const membership = await connection.queryObject<{ workspace_id: string }>`select workspace_id from public.workspace_members where workspace_id = ${body.workspaceId}::uuid and user_id = ${user.id}::uuid limit 1`
    if (!membership.rows.length) return json({ error: 'You do not have access to this workspace.' }, 403)

    const evidenceResult = await connection.queryObject<Evidence>`select id, title, source_url, published_at, content from public.source_documents where workspace_id = ${body.workspaceId}::uuid order by retrieved_at desc limit 8`
    const evidence = evidenceResult.rows
    if (!evidence.length) {
      await logRun(connection, body, user.id, 'rejected', 0, 'NO_EVIDENCE')
      return json({ error: 'No verified sources exist for this workspace yet. Add approved sources before requesting AI analysis.', code: 'NO_EVIDENCE' }, 422)
    }

    const profileResult = await connection.queryObject<{ business_name: string; industry: string | null; description: string | null; target_audience: string | null; brand_voice: string | null; marketing_goals: string[] }>`select business_name, industry, description, target_audience, brand_voice, marketing_goals from public.business_profiles where workspace_id = ${body.workspaceId}::uuid limit 1`
    const profile = profileResult.rows[0]

    const competitorResult = await connection.queryObject<{ name: string; website_url: string | null }>`select name, website_url from public.competitors where workspace_id = ${body.workspaceId}::uuid limit 10`
    const competitors = competitorResult.rows

    const providers = getProviderCandidates()
    if (providers.length === 0) {
      return json({
        error: 'No AI provider keys have been configured. Add OPENROUTER_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or AI_API_KEY in Supabase Edge Function Secrets.',
        code: 'AI_NOT_CONFIGURED',
      }, 503)
    }

    const sourceText = evidence
      .map((item, index) => `[${index + 1}] ${item.title}\nURL: ${item.source_url ?? 'Internal workspace source'}\nDate: ${item.published_at ? new Date(item.published_at).toISOString() : 'Unknown'}\n${item.content.slice(0, 3000)}`)
      .join('\n\n')

    const system = `You are TrendsAgent OS, an enterprise content intelligence operating system.
You are generating evidence-backed marketing strategy and trend analysis specifically for the following business:
- Business Name: ${profile?.business_name || 'My Business'}
- Industry: ${profile?.industry || 'General Industry'}
- Description: ${profile?.description || 'N/A'}
- Target Audience: ${profile?.target_audience || 'N/A'}
- Brand Voice: ${profile?.brand_voice || 'Professional'}
- Marketing Goals: ${profile?.marketing_goals?.join(', ') || 'Growth'}
- Tracked Competitors: ${competitors.map(c => c.name).join(', ') || 'None specified'}

Follow strict evidence grounding guidelines:
1. Business Context Grounding: Tailor your insights specifically for ${profile?.business_name || 'this business'} in the ${profile?.industry || 'their'} industry. Connect market evidence directly to their business goals and competitors.
2. Grounding: Use ONLY the supplied evidence. Never invent fake metrics or hallucinate.
3. Multi-Language Translation: If evidence topics or search keywords are in non-English scripts (e.g. Malayalam, Tamil, Telugu, Hindi, etc.), ALWAYS translate them into clear English in parentheses next to the original script (for example: "ലാമിന് യമാല് (Lamine Yamal)", "வெள்ளி (Silver)", "కരോనా వైరస్ (Coronavirus)").
4. Citation: Cite every factual claim using [source-number] corresponding strictly to the verified evidence provided.
5. Structure: Provide clean headings without raw markdown clutter. Include:
   - Supported Observations for ${profile?.business_name || 'the Business'} (with English translations)
   - Industry & Competitor Intelligence (Analyzing ${profile?.industry || 'the market'})
   - Actionable Content & Campaign Recommendations
   - Important Uncertainty & Context Limitations
6. Tone: Professional, analytical, and executive.`

    await logRun(connection, body, user.id, 'started', evidence.length)

    let lastErrorDetail = ''
    let successfulOutput: string | null = null
    let successfulProvider = ''
    let successfulModel = ''

    // Failover Loop across candidate providers and models
    for (const provider of providers) {
      try {
        console.log(`Attempting AI generation with provider: ${provider.name} (${provider.model})`)
        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
            ...(provider.extraHeaders || {}),
          },
          body: JSON.stringify({
            model: provider.model,
            temperature: 0.2,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: `User request:\n${body.prompt}\n\nVerified evidence:\n${sourceText}` },
            ],
          }),
        })

        if (!response.ok) {
          const errBody = await response.text().catch(() => '')
          lastErrorDetail = `[${provider.name}] HTTP ${response.status}: ${errBody.slice(0, 150)}`
          console.warn(lastErrorDetail)
          continue
        }

        const payload = await response.json()
        const output = payload.choices?.[0]?.message?.content
        if (output && typeof output === 'string' && output.trim().length > 0) {
          successfulOutput = output
          successfulProvider = provider.name
          successfulModel = provider.model
          break
        }
      } catch (err) {
        lastErrorDetail = `[${provider.name}] fetch exception: ${err instanceof Error ? err.message : String(err)}`
        console.warn(lastErrorDetail)
      }
    }

    if (!successfulOutput) {
      await logRun(connection, body, user.id, 'failed', evidence.length, 'ALL_PROVIDERS_FAILED')
      return json({
        error: `All configured AI providers failed. Last attempt error: ${lastErrorDetail}. Please verify your API key credits or provider setup in Supabase secrets.`,
        code: 'AI_PROVIDERS_EXHAUSTED',
      }, 502)
    }

    await logRun(connection, body, user.id, 'completed', evidence.length, undefined, successfulOutput.slice(0, 500))

    return json({
      output: successfulOutput,
      provider: successfulProvider,
      model: successfulModel,
      evidence: evidence.map(({ id, title, source_url, published_at }) => ({
        id,
        title,
        sourceUrl: source_url,
        publishedAt: published_at,
      })),
    })
  } catch (error) {
    if (connection) await logRun(connection, body, user.id, 'failed', 0, 'PROVIDER_OR_DATABASE_ERROR')
    return json({
      error: 'The AI gateway could not complete this request. ' + (error instanceof Error ? error.message : 'Unknown server error.'),
      code: 'AI_GATEWAY_ERROR',
    }, 502)
  } finally {
    connection?.release()
  }
})

async function logRun(
  connection: PoolClient,
  body: GatewayRequest,
  userId: string,
  status: 'started' | 'completed' | 'failed' | 'rejected',
  evidenceCount: number,
  errorCode?: string,
  outputSummary?: string
) {
  try {
    await connection.queryArray`insert into public.ai_runs (workspace_id, requested_by, operation, provider, model, status, input_summary, output_summary, evidence_count, error_code, completed_at) values (${body.workspaceId}::uuid, ${userId}::uuid, ${body.operation}, ${Deno.env.get('AI_PROVIDER') ?? 'universal_gateway'}, ${Deno.env.get('AI_MODEL') ?? 'auto_failover'}, ${status}, ${body.prompt.slice(0, 500)}, ${outputSummary ?? null}, ${evidenceCount}, ${errorCode ?? null}, ${status === 'started' ? null : new Date().toISOString()})`
  } catch (error) {
    console.warn('AI run could not be logged:', error instanceof Error ? error.message : error)
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
