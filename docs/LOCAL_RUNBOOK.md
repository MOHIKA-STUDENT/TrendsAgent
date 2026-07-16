# Local runbook: commands you use day to day

## First-time setup only

Run these once after cloning the project:

```powershell
cd C:\Users\MOHIKA\Downloads\TrendsAgent
npm.cmd install
```

Create the frontend configuration file by copying `.env.example` to `.env`, then add your Supabase URL and **anon** key. Do not put an AI key or Supabase service-role key in this file.

For n8n, complete the separate setup in [n8n/README.md](../n8n/README.md). It also needs Docker Desktop running.

## Normal start: website only

Use this whenever you want to work on the React website:

```powershell
cd C:\Users\MOHIKA\Downloads\TrendsAgent
npm.cmd run dev
```

What it does: starts the local website. It does **not** start n8n or run scheduled collection.

Stop it: press `Ctrl + C` in that terminal.

## Normal start: n8n automation

Open a second PowerShell window:

```powershell
cd C:\Users\MOHIKA\Downloads\TrendsAgent\n8n
docker compose up -d
```

What it does: starts n8n in the background. Open `http://localhost:5678`.

Check whether it is running:

```powershell
docker compose ps
```

See recent n8n errors:

```powershell
docker compose logs --tail 100 n8n
```

Stop n8n:

```powershell
docker compose down
```

Important: Docker commands for n8n must be run from the `TrendsAgent\n8n` folder because that is where `docker-compose.yml` is stored. Running `docker compose down` from the project root produces “no configuration file provided,” but it does not damage the project.

## Test the Google Trends workflow

1. Ensure n8n is running.
2. Go to `http://localhost:5678`.
3. Open **TrendsAgent — Google Trends RSS Collector**.
4. Open **Save approved trend evidence** and verify its URL is:

   ```text
   https://wguazpvpelerzoqglyst.supabase.co/functions/v1/automation-ingest
   ```

5. Click **Execute workflow**.
6. All nodes should turn green.
7. Refresh TrendsAgent → **Knowledge base**. New Google Trends sources should appear.
8. After the manual test succeeds, turn the workflow **Active** to run every six hours.

## Safe GitHub update

Use this after modifying code or documentation:

```powershell
cd C:\Users\MOHIKA\Downloads\TrendsAgent
git status
git add -A
git commit -m "Describe your change here"
git push origin main
```

Before pushing, check `git status`. If you ever see `.env`, `n8n/.env`, or a file containing a key, stop and do not commit it. Those files should be ignored automatically.

## Verify the project before sharing

```powershell
npm.cmd run build
```

What it does: checks TypeScript and builds the production website. A successful build ends with `built in ...`.
