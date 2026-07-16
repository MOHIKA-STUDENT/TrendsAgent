# TrendsAgent n8n collector

This is a self-hosted, free starting point for collecting approved public trend signals. It is an **evidence collector**, not an autonomous web scraper: it saves source records to your workspace and the AI gateway later decides whether the evidence is sufficient to answer a question.

## What is ready

`workflows/google-trends-rss.json` is an importable n8n workflow. Every six hours it:

1. fetches Google Trends “Trending Now” RSS for India;
2. normalizes up to ten trend items;
3. sends them to the protected `automation-ingest` Supabase Edge Function;
4. rejects duplicate URLs and records each result in `automation_runs`.

The workflow begins **inactive**. Test it manually before activating its schedule.

## One-time setup

### 1. Prepare Supabase

1. Run [the automation migration](../supabase/migrations/202607160002_automation_runs.sql) in Supabase SQL Editor.
2. In Supabase Dashboard → Edge Functions → Secrets, add a new random `AUTOMATION_INGEST_SECRET`.
3. From the project root, deploy the ingestion function:

   ```powershell
   npx supabase login
   npx supabase functions deploy automation-ingest --project-ref wguazpvpelerzoqglyst
   ```

Do not use the Supabase service-role key in n8n. The Edge Function stores it server-side; n8n only receives the dedicated automation secret.

### 2. Start n8n locally

Install and start Docker Desktop first. Then run from this `n8n` folder:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Edit `.env` with:

- `N8N_ENCRYPTION_KEY`: a long, random value kept private;
- `TARGET_WORKSPACE_ID`: copy the `id` from your Supabase `workspaces` table;
- `SUPABASE_URL` and public `SUPABASE_ANON_KEY` from your project;
- `AUTOMATION_INGEST_SECRET`: exactly the same secret you set in Supabase.

After editing, restart n8n:

```powershell
docker compose down
docker compose up -d
```

Open `http://localhost:5678`, create the n8n owner account, then import `workflows/google-trends-rss.json`.

## Test before activating

1. Open the imported workflow in n8n.
2. Select **Execute workflow**.
3. Check the final node reports `accepted` or `duplicate` for each item.
4. Open TrendsAgent → Knowledge base and verify that trend evidence appeared.
5. Only then toggle the workflow **Active**.

If an item is not relevant to your business, delete it in Knowledge base. It will not be presented to the AI after deletion.

## Free-source roadmap

Start small—one source, then add another only when you can review its quality.

| Source | Use it for | Start now? |
| --- | --- | --- |
| Google Trends RSS | fast-rising public search topics | Yes; included workflow |
| Google Trends API | keyword and regional interest history | Apply for alpha access; do not rely on unofficial scrapers |
| GDELT DOC API | global news coverage of business topics and competitors | Add second |
| Wikimedia Pageviews | attention changes around known products, brands, or topics | Add after choosing tracked terms |
| Hacker News API | technology/startup conversations | Add only if relevant to the business |
| Official company RSS/blog feeds | direct competitor announcements | Add only with your approved competitor list |

Avoid Reddit as a default commercial source: its API/data access rules are not a safe “free forever” assumption for a SaaS product. Also avoid scraping social networks or sites that prohibit automated access.
