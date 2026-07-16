# Contributing to TrendsAgent

## Before you start

1. Copy `.env.example` to `.env`; never commit the real `.env`.
2. Run `npm.cmd install` and `npm.cmd run dev`.
3. Use a feature branch and open a pull request for review.

## Security rules

- Never commit AI provider keys, Supabase service-role keys, n8n `.env`, access tokens, or customer evidence.
- Use Supabase migrations for schema/security changes. Do not modify production tables manually without recording the change in `supabase/migrations/`.
- AI features must cite evidence or state that evidence is insufficient.

## Before opening a pull request

```powershell
npm.cmd run build
```

Briefly explain the feature, how you tested it, and any Supabase migration or n8n configuration it requires.
