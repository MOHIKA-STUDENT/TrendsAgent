# TrendsAgent OS

TrendsAgent OS is an AI-powered content intelligence workspace for small businesses. It will turn business information, market signals, and competitor research into practical marketing recommendations with evidence attached.

For a teammate-friendly product explanation and the full data flow, read [Project overview](C:\Users\MOHIKA\Downloads\TrendsAgent\docs\PROJECT_OVERVIEW.md). For contribution and security rules, read [CONTRIBUTING.md](C:\Users\MOHIKA\Downloads\TrendsAgent\CONTRIBUTING.md).

## What is built now (Phase 0–1)

This repository contains a polished, responsive **dashboard prototype**. It is the visual starting point for the product—not yet a live AI service.

- **Overview dashboard:** shows an opportunity score, trend signals, and recommended actions.
- **Trend signal cards:** demonstrate how rising topics will be ranked and explained.
- **Evidence language:** each recommendation is designed to show *why* it exists, rather than presenting unexplained AI output.
- **Create brief modal:** demonstrates the future AI brief workflow locally, without sending any data anywhere.
- **Responsive design:** works on desktop and mobile widths.

The numbers and recommendations are safe demo content. There is no database, login, real web research, or AI call connected yet. That distinction matters: we should never present generated demo content as verified market intelligence.

## Beginner-friendly setup guide

### 1. Install Node.js

Install the current Node.js LTS release from [nodejs.org](https://nodejs.org/). Then close and reopen PowerShell.

### 2. Open this project folder in a terminal

```powershell
cd C:\Users\MOHIKA\Downloads\TrendsAgent
```

### 3. Install the project packages

Your PowerShell may block the `npm` shortcut. This is common on Windows, so use:

```powershell
npm.cmd install
```

### 4. Run the website locally

```powershell
npm.cmd run dev
```

Open the local address Vite prints (normally `http://localhost:5173`) in your browser. To stop it later, press `Ctrl + C` in that terminal.

### 5. Check a production build

Before publishing, run:

```powershell
npm.cmd run build
```

This creates a `dist` folder containing the deployable website.

## Project map

```text
TrendsAgent/
├── src/
│   ├── main.tsx       # The dashboard screen and small demo interactions
│   └── styles.css     # All visual styling and mobile layout rules
├── .env.example       # Names of future configuration values; no secrets
├── index.html         # Web page entry point
├── package.json       # Dependencies and commands
└── README.md          # This guide and the build roadmap
```

## Development roadmap

We will build this in small, testable phases. Do not add AI keys to the browser or skip the security phases.

| Phase | Outcome | What you will need to do |
| --- | --- | --- |
| 0–1 (complete) | Product foundation and interactive visual prototype | Run the app and give feedback on the dashboard/design. |
| 2 | Supabase project, environment configuration, database migration plan | Create a Supabase account/project; keep its credentials private. |
| 3 | Secure authentication and workspace membership | Decide whether users sign in with email/password, Google, or both. |
| 4 | Business profile and data model | Enter a sample business, audience, brand voice, goals, and competitors. |
| 5 | Secure backend APIs and validation | Create server-side functions; no provider keys in the UI. |
| 6 | AI gateway and evidence-based chat | Provide approved AI provider credentials; choose a starting provider/budget. |
| 7 | Trend, competitor, strategy, content, and reviewer agent workflows | Approve the data sources and review the output rules. |
| 8 | Scheduled research and reports | Choose frequency, notification channels, and the automation host. |
| 9–12 | Integration, tests, deployment, monitoring | Create Vercel/GitHub accounts and test with real users. |

## Phase 2: your one required Supabase step

I have connected the local app to your Supabase project using its **public anon key**. The key lives only in your local `.env` file, which Git ignores. The database itself must now be created in Supabase:

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/wguazpvpelerzoqglyst/sql/new).
2. Click **New query**.
3. Open [the initial database migration](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\migrations\202607150001_initial_schema.sql) in this project.
4. Copy all of its contents into Supabase, then click **Run**.
5. Return here and run `npm.cmd run dev`. The top-right status should change to **Backend ready**.

What that SQL does, in simple terms:

- creates spaces for users, workspaces, business profiles, competitors, evidence, trend signals, and recommendations;
- gives every customer’s records a `workspace_id`;
- turns on **Row-Level Security** so a signed-in person can access only their own workspace;
- sets up a profile automatically when a user signs up;
- adds database indexes so common dashboard queries stay fast.

You may see **Setup needed** until you run this SQL. That is expected; it means the website has your connection details but the secure tables have not yet been created.

## Phase 3: authentication and private workspaces

The app now has real email/password authentication. It starts on a sign-up screen, creates a signed-in session through Supabase, and does not show the dashboard to visitors who have not signed in.

One small migration is required before the first new user can create their workspace:

1. In the same Supabase SQL Editor, open [the workspace-creation migration](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\migrations\202607150002_workspace_creation.sql).
2. Copy all the SQL, run it, and then refresh the local app.
3. Create an account with your email and a password of at least eight characters.
4. If Supabase asks for email confirmation, open its email, confirm the account, then return and sign in.
5. Give your first workspace a name.

The workspace-creation SQL is deliberately a protected database function. The browser can request a workspace for the currently signed-in person, but it cannot choose another user, forge ownership, or bypass the membership rules.

### If workspace creation shows a 404 error

A `404` request to `rpc/create_workspace` means Supabase cannot see the function yet. Open the Phase 3 SQL file above, copy the entire file again (including the final `notify pgrst, 'reload schema';` line), run it in the SQL Editor, wait a few seconds, and refresh your local page. Make sure the URL at the top of the Supabase dashboard contains project reference `wguazpvpelerzoqglyst`.

## Phase 4: business-profile onboarding

Once your workspace exists, TrendsAgent now guides you through a short business profile form. It saves:

- your business name and industry;
- what you offer;
- your target audience;
- your preferred brand voice;
- marketing goals; and
- up to three competitors to watch.

This is not “training an AI model.” It is your private business context. Later, the research and AI features will retrieve only the relevant parts of this profile while preparing a recommendation. You can leave any optional field blank and improve it later.

## Do I need to run SQL every time?

No. Running `npm.cmd run dev` starts the website; it does not require SQL. You run a SQL migration **once only** when a new project phase introduces new database tables, rules, or secure functions. After it succeeds, it stays in your Supabase database.

If a request to `rest/v1/workspaces` shows `403`, run [the authenticated-table permissions migration](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\migrations\202607150003_authenticated_table_permissions.sql) once in the same Supabase SQL Editor, then refresh the browser. The migration grants signed-in users access to reach the tables; Row-Level Security still makes sure they can only see their own workspace data.

## Phase 6: secure AI gateway and evidence rules

The AI gateway is now prepared in [the server-side function](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\functions\ai-gateway\index.ts). The browser sends a request only to this server function; it never receives your AI provider key.

The gateway follows these safety rules:

- checks that the signed-in user belongs to the requested workspace;
- retrieves only sources saved inside that workspace;
- refuses a request when there are no verified sources;
- instructs the model to cite each factual claim using the supplied source number;
- logs request status, provider, model, evidence count, and errors in `ai_runs`—but never logs a provider key.

### One-time database step for Phase 6

Run [the AI gateway migration](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\migrations\202607150004_ai_gateway_foundation.sql) once in Supabase SQL Editor. This adds the protected `ai_runs` audit table.

### Before AI can be switched on

You need an AI provider account and key. The default gateway is configured for OpenRouter because it can route to multiple models through one OpenAI-compatible endpoint. In Supabase Dashboard → **Edge Functions** → **Secrets**, add:

```text
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=your-provider-key
AI_MODEL=openai/gpt-4.1-mini
```

Then deploy `supabase/functions/ai-gateway/index.ts` using the Supabase CLI. Do not put `AI_API_KEY` in `.env`, a `VITE_` variable, Git, or this chat.

Until approved sources are collected in Phase 7, the gateway will correctly refuse market-analysis requests. That is intentional: an AI should not claim it researched a market when it has no evidence.

### Deploying the gateway after your secrets are added

Secrets alone do not publish the function. From this project folder, run these commands once:

```powershell
npx supabase login
npx supabase functions deploy ai-gateway --project-ref wguazpvpelerzoqglyst
```

The login command opens a browser so you can approve access to your own Supabase account. Do not paste your access token into source code or chat. After deployment, Supabase Dashboard → Edge Functions should list `ai-gateway` as deployed.

## Phase 7: evidence library

The **Knowledge base** menu item now opens an Evidence Library. Add only material you trust: survey findings, interview notes, product information, public articles you are allowed to use, or your own research notes. Each saved source is private to your workspace.

Before using it, run [the Phase 7 permission migration](C:\Users\MOHIKA\Downloads\TrendsAgent\supabase\migrations\202607160001_evidence_library_permissions.sql) once in Supabase SQL Editor. Then add at least one source with 30 or more characters of relevant text. This gives the deployed AI gateway the evidence it needs to produce cited answers.

## Managing your data

- **Edit business profile:** open **Knowledge base**, then select **Edit business profile**. Update the saved context and click **Save profile changes**. It updates future AI context only; it does not alter evidence already saved.
- **Delete evidence:** in **Knowledge base**, select **Delete** beside a source and confirm. The source is removed from your workspace and can no longer be sent to the AI gateway.
- **Save a planning draft:** on the dashboard, select **Save draft to plan**. This saves a draft recommendation but labels it unverified until evidence supports it.

## How to test each feature

Run the app with `npm.cmd run dev`, then use this checklist:

| Feature | Test steps | Expected result |
| --- | --- | --- |
| Sign up / sign in | Create an account, confirm email if enabled, then sign in. | You reach your private workspace; signing out returns you to the sign-in screen. |
| Workspace | Create a workspace name. | The name appears in the sidebar and survives a browser refresh. |
| Business profile | Complete the onboarding form. Then open Knowledge base → Edit business profile, change the industry, and save. | The dashboard/sidebar show the saved context after returning. |
| Evidence library | Open Knowledge base; add a title and at least 30 characters of source text. | The source appears in Saved evidence and remains after refresh. |
| Evidence deletion | Select Delete beside a test source and confirm. | It disappears immediately and is unavailable to future AI requests. |
| Recommendation draft | Select Save draft to plan on the dashboard. | Saved recommendations count increases after refresh. |
| Security boundary | Sign out and try loading the app again. | Private workspace information is not shown until you sign in. |
| AI guardrail | Invoke the deployed gateway before sources exist. | It rejects the request with `NO_EVIDENCE` instead of inventing research. |

## Phase 8: automation preparation

The [n8n automation guide](C:\Users\MOHIKA\Downloads\TrendsAgent\n8n\README.md) describes the safe workflow boundary. We will connect an actual scheduled workflow only after you choose approved RSS/API sources and their allowed fetch frequency.

## How the future intelligence workflow will work

```text
Business profile + approved sources
              ↓
Collect and validate information
              ↓
Store source, date, workspace, and evidence
              ↓
Retrieve only relevant evidence for a question
              ↓
AI produces structured recommendation with citations
              ↓
Reviewer checks uncertainty and saves the result
```

This workflow prevents a common AI problem: presenting guesses as facts. Every real insight will need a source, date, confidence level, and workspace owner.

## Important safety rules

- Never put OpenAI, Supabase service-role, or other secret keys in `src/` or a `VITE_*` variable.
- Never commit `.env` files. Use `.env.example` only as a public template.
- Recommendations must clearly distinguish verified facts from AI interpretation.
- Users must only access their own workspace data; this will be enforced with Supabase Row-Level Security.

## What I need from you before the next build phase

1. Run the dashboard using the setup commands above.
2. Tell me whether this visual direction feels right, or share a screenshot/style you prefer.
3. Create a free Supabase project when you are ready for Phase 2. Do **not** paste secret keys into chat; we will place them safely in your local `.env` file.
4. Choose your first test business (your own or a fictional one). We will use it to build the Business Profile feature.

## Future deployment

The planned path is Vercel for the frontend and Supabase for data/auth/server functions. Deployment is intentionally postponed until the security, testing, and real-data phases are complete.
