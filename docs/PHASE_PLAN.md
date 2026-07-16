# TrendsAgent OS: Engineering Phase Plan

## Product boundary for the first release

The first usable release should help one small-business workspace define its profile, save competitors, review sourced trend signals, ask evidence-grounded questions, and turn accepted recommendations into a simple content plan. Multi-provider failover, full autonomous research, and advanced analytics are later iterations—not shortcuts to skip validation.

## Phase 2: Infrastructure decision record

**Goal:** provision a safe development backend without exposing secrets.

- Create a Supabase development project.
- Add local `.env` configuration from `.env.example`.
- Install Supabase client and configure a typed browser client using only the anon key.
- Add GitHub repository and CI after the starter application is approved.
- Create separate development and production environments before deployment.

**Success check:** the app can read a public health-check from the project; service-role credentials never reach the browser.

## Phase 3–4: Identity and core data

Core tables: `workspaces`, `workspace_members`, `business_profiles`, `competitors`, `source_documents`, `trend_signals`, `recommendations`, `reports`, and `audit_logs`.

Every row includes `workspace_id`. Row-Level Security policies require the signed-in user to be a member of that workspace. This is the main protection against one customer seeing another customer’s data.

## Phase 5–7: Intelligence architecture

1. A server-side function validates the request and resolves the workspace.
2. It retrieves evidence whose source and freshness are known.
3. An AI gateway selects an approved provider, times out/retries safely, and records cost and model metadata.
4. The model returns JSON with claims, supporting source IDs, confidence, and uncertainty.
5. A reviewer validates the shape and rejects unsupported claims before saving.

## Phase 8–12: Operations

Scheduled collection starts with a small, approved source list and clear rate limits. We then add report scheduling, tests, error monitoring, backups, user acceptance testing, and production deployment.
