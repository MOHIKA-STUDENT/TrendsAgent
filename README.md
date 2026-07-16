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

## Repository guides

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Local command runbook](docs/LOCAL_RUNBOOK.md)
- [n8n collector guide](n8n/README.md)
- [Free-source strategy](docs/FREE_SOURCE_STRATEGY.md)
- [Contributing and security rules](CONTRIBUTING.md)
- [Engineering phase plan](docs/PHASE_PLAN.md)

## Security

Never commit `.env`, `n8n/.env`, AI provider keys, Supabase service-role keys, access tokens, or private customer evidence. Copy `.env.example` for local setup and use Supabase Edge Function secrets for server-only credentials.

## Status

The project includes secure workspace onboarding, business profiles, evidence management, an AI gateway foundation, and a Google Trends RSS n8n collector. The next phase is to display collected evidence as ranked trend signals and produce evidence-backed analysis.
