# Production deployment checklist

This project can be developed locally, but scheduled research is only reliable when the n8n service stays online. A laptop running Docker is suitable for development and demos; use a managed n8n deployment or an always-on server before relying on schedules in production.

## 1. Frontend

Deploy the React application to your chosen static host. Configure only these build-time variables there:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

These are public browser configuration values. Never add a service-role key, database URL, automation secret, or AI provider key to a `VITE_` variable.

## 2. Supabase Edge Functions

Deploy `automation-ingest` and `ai-gateway`. In Supabase Dashboard → Edge Functions → Secrets, configure:

```text
AUTOMATION_INGEST_SECRET=long-random-private-value
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=provider-private-key
AI_MODEL=your-approved-model
```

Supabase supplies its own server-only database connection to the functions. Do not manually copy database credentials into the frontend or n8n.

## 3. n8n

Import only the workflows you need, then edit their placeholder values locally in n8n:

- `workspaceId`: the workspace that should receive the evidence.
- `researchQuery`: a precise industry, competitor, or product query for GDELT.
- `articleTitle`: a relevant Wikipedia topic for the Wikimedia attention proxy.
- `x-automation-secret`: the same secret stored in Supabase.

Use n8n Credentials or environment variables in a managed deployment where possible. Do not commit a configured workflow export containing real headers.

Run each workflow manually and review the evidence in Knowledge Base before activating its schedule. Google Trends is a search-attention signal, GDELT is news metadata, and Wikimedia is an information-attention proxy. None alone proves demand or predicts sales.

## 4. Release gate

Before launch, confirm:

- `npm run build` passes.
- A user in one workspace cannot read another workspace’s sources.
- Each workflow returns `accepted` or `duplicate`.
- The AI evidence brief displays sources and uncertainty.
- Git history contains no `.env`, header values, provider keys, or database URLs.
- You have rotated any credential ever exposed in a screenshot or chat.

## 5. Operations

Keep an owner responsible for reviewing sources, rate limits, failed workflow runs, provider billing, and monthly secret rotation. Add YouTube only through the official YouTube Data API and keep its API key in n8n/server-side credentials with quota restrictions.
