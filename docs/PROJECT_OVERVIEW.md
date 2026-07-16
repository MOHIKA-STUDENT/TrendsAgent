# TrendsAgent OS: how the project works

## Purpose

TrendsAgent helps a business turn trusted information into useful marketing decisions. It is designed to avoid a common AI mistake: presenting guesses as researched facts.

## Main parts

```text
Business owner
  ├─ creates a secure account and workspace
  ├─ saves business context and competitors
  └─ reviews/deletes evidence
          ↓
n8n collector (optional, scheduled)
  └─ collects from an approved public source such as Google Trends RSS
          ↓
Supabase
  ├─ stores workspace-isolated evidence
  ├─ applies Row-Level Security
  └─ records automation and AI runs
          ↓
AI gateway (server-side only)
  ├─ checks workspace access
  ├─ retrieves saved evidence
  ├─ refuses requests with no evidence
  └─ asks the model for cited, uncertainty-aware output
          ↓
TrendsAgent dashboard
  └─ shows sources, drafts, signals, and recommendations
```

## What each feature does

| Feature | What it does now | What it never does |
| --- | --- | --- |
| Authentication | Gives each user a signed-in session. | Expose user passwords to the app database. |
| Workspace | Separates one business/team’s data from another’s. | Allow one workspace to read another workspace’s rows. |
| Business profile | Stores the business, audience, tone, and goals. | Claim it is market evidence. |
| Evidence Library | Saves approved source text and lets the user delete it. | Treat deleted sources as AI context. |
| n8n collector | Fetches an approved source on a schedule and sends validated records to Supabase. | Use your AI key or Supabase service-role key. |
| AI gateway | Uses server-only provider secrets and cites saved evidence. | Generate a market claim with no evidence. |
| Draft recommendations | Saves planning ideas to a workspace. | Present an unverified draft as a researched fact. |

## Current build status

The secure workspace, profile, evidence library, AI gateway, and first Google Trends n8n collector are implemented. The next phase begins only after the collector passes its manual test, so that later AI agents operate on real evidence rather than an empty database.
