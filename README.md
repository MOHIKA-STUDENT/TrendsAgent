# TrendsAgent OS

TrendsAgent OS is an evidence-first marketing intelligence workspace for small businesses. It brings together business context, approved research sources, automated trend collection, and AI-assisted planning—without presenting unsupported AI output as fact.

## What it does

- Creates private workspaces with Supabase authentication and Row-Level Security.
- Stores a business profile, goals, brand voice, and competitors.
- Collects approved evidence manually or through n8n automation.
- Keeps sources visible, workspace-specific, and removable.
- Provides a server-side AI gateway that refuses evidence-free market claims.
- Saves planning drafts separately from verified recommendations.

## Architecture

```text
React dashboard → Supabase Auth + PostgreSQL
                         ↑
n8n source collector → secure ingestion function → Evidence Library
                                                     ↓
                                             server-side AI gateway
                                                     ↓
                                      cited analysis and recommendations
```

## Technology

- React, TypeScript, Vite
- Supabase Auth, PostgreSQL, Row-Level Security, Edge Functions
- n8n + Docker for scheduled source collection
- OpenRouter-compatible server-side AI gateway

## Development phases

| Phase | Purpose | Status |
| --- | --- | --- |
| 0–1 | Product definition, interface, and local React foundation | Complete |
| 2–3 | Supabase connection, authentication, workspaces, and data isolation | Complete |
| 4–5 | Business profile, competitors, evidence records, and saved drafts | Complete |
| 6 | Server-side AI gateway with evidence-only guardrails and audit logs | Foundation complete |
| 7 | Evidence Library with user-controlled source deletion | Complete |
| 8 | n8n scheduled collector and secure source-ingestion function | In validation |
| 9 | Dashboard trend signals, reports, and evidence-backed analysis UI | Next |
| 10–12 | Source integrations, automated testing, monitoring, and production deployment | Planned |

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL shown in the terminal, normally `http://localhost:5173`.

To verify a production build:

```powershell
npm.cmd run build
```

For the optional local n8n collector:

```powershell
cd n8n
docker compose up -d
```

Open `http://localhost:5678` to use n8n. See [n8n/README.md](n8n/README.md) for its secure setup and testing steps.

## Use this project for your own workspace

1. Fork or clone the repository.
2. Create your own Supabase project; do not reuse another team’s credentials.
3. Copy `.env.example` to `.env` and add only your project URL and public anon key.
4. Run the SQL migrations in `supabase/migrations/` in order.
5. Deploy the Edge Functions and configure their server-side secrets in Supabase Dashboard.
6. Set up a separate `n8n/.env` and import the workflow only after configuring your own workspace ID and automation secret.
7. Start with one approved source, manually test it, and review the Evidence Library before enabling a schedule.

Every team member should have their own local `.env` files. Never copy a teammate’s secret files into GitHub or chat.

## Repository guides

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Local command runbook](docs/LOCAL_RUNBOOK.md)
- [n8n collector guide](n8n/README.md)
- [Free-source strategy](docs/FREE_SOURCE_STRATEGY.md)
- [Contributing and security rules](CONTRIBUTING.md)
- [Engineering phase plan](docs/PHASE_PLAN.md)
- [Production deployment checklist](docs/PRODUCTION_DEPLOYMENT.md)

## Security

Never commit `.env`, `n8n/.env`, AI provider keys, Supabase service-role keys, access tokens, or private customer evidence. Copy `.env.example` for local setup and use Supabase Edge Function secrets for server-only credentials.

## Status

The project includes secure workspace onboarding, business profiles, evidence management, an AI gateway foundation, and a Google Trends RSS n8n collector. The next phase is to display collected evidence as ranked trend signals and produce evidence-backed analysis.
