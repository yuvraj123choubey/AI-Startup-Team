# AI Startup Team

A control center for a one-person startup, run by five specialized AI roles.

The founder writes a **Company Brief** once and then gives the team work in one of two modes:

- **Analyze**: the same task is examined by five roles in order. Each role receives the brief and the relevant earlier outputs. The Operations Lead turns everything into a founder brief, conflicts between roles stay visible, and the founder records the final decision.
- **Build Project**: the team creates a **new, separate React + Vite project** in `workspace-projects/<project-id>/`. The Developer writes and builds the code, the Security Reviewer inspects it, the Developer fixes the findings (at most 3 rounds), Finance and Legal review costs and privacy questions, and Operations reports *Project complete* or *Founder review required*.

Both modes work **without an API key** (Simulated mode) and with **real OpenAI responses** (Live AI mode) through a secure backend.

> This is a student prototype. AI output is research support. The founder makes every decision.

---

## The five AI roles

Defined in `src/data/aiRoles.js`. Each role has its own `id`, `name`, `description`, `responsibilities`, an Analyze-mode `systemPrompt`, and a separate Build-mode `buildPrompt`. The roles are never merged into one generic prompt.

| # | Role | Analyze mode | Build mode |
|---|------|--------------|------------|
| 1 | **Software Developer** | Architecture, implementation plan, APIs, database | Writes the project's source files and fixes build errors and security findings |
| 2 | **Cybersecurity Reviewer** | Reviews the Developer's plan | Reviews the actual code: passwords, auth, authorization, input validation, sessions, secrets, XSS |
| 3 | **Finance Research Assistant** | Cost estimates and budget check | Running-cost estimates (hosting, database, auth, email, APIs). Never edits code |
| 4 | **Legal Research Assistant** | Privacy and compliance questions | Privacy policy, personal data, cookies, terms, retention questions. Never edits code |
| 5 | **Business & Operations Lead** | Prioritizes, finds conflicts, writes the founder brief | Coordinates the project and reports its final status |

## Architecture

```
                   AI STARTUP TEAM (React, Vite)  ← control center in the browser
                          │  /api/*  (no API keys in the browser)
                          ▼
                   Backend (Node.js + Express, server/)
                   ├── Analyze mode ── POST /api/ai/role ── openaiService ── OpenAI
                   └── Build mode ──── projectManager
                                        │
                                        ▼
                         workspace-projects/<project-id>/   (one folder per project)
                                        │
            Developer → npm install / npm run build → Security review
                 ▲                                         │
                 └──── fix → build → re-check (max 3) ─────┘
                                        │
                              Finance → Legal → Operations → Founder
```

**Analyze workflow:** Company Brief + Founder task → Developer → Security (gets the Developer's plan) → Finance (gets the Developer's plan) → Legal (gets the Developer and Security output) → Operations (gets all four) → Final founder brief → Human decision.

**Structured responses:** every role returns JSON (`summary`, `sections`, `recommendations`, `assumptions`, `risks`, `positions`; Operations adds `highPriority`, `mediumPriority`, `lowPriority`, `professionalReview`, `conflicts`, `founderSummary`). The backend validates and normalizes each reply (`src/services/responseSchema.js`). An invalid reply is retried once, then reported as a failure. It is never replaced with made-up text.

**Conflict detection:** each role states *positions* on a fixed list of decision topics (for example `releaseSpeed: fast | careful`). `src/services/conflictDetector.js` compares them, so a conflict appears only when two roles actually disagree. The UI shows which roles disagree, what each is optimizing for (taken from the role's own answer), why it matters, and the question the founder has to decide.

### Project layout

```
src/                         React app (the control center)
  data/aiRoles.js            the five roles and their two prompts (also used by the backend)
  services/aiService.js      runs Analyze mode (Simulated or Live AI)
  services/promptBuilder.js  each role's exact prompt + which earlier outputs it receives
  services/responseSchema.js validates structured JSON responses
  services/conflictDetector.js
  services/mockResponses.js  simulated Analyze answers
  services/apiClient.js      fetch wrapper with clear error codes
  services/projectService.js Build mode API calls
  pages/                     Dashboard, Company Brief, AI Team, New Task, Results,
                             Projects, Project detail, Troubleshooting, About
server/                      Express backend
  index.js                   entry point, /api/health
  config.js                  reads .env (server only)
  routes/ai.js               Analyze mode: one role per request
  routes/projects.js         Build mode: projects, files, preview, approvals, delete
  services/openaiService.js  the only code that calls OpenAI
  services/aiOrchestrator.js Build pipeline + repair loop
  services/projectManager.js project ids, metadata, activity log
  services/projectFiles.js   path validation: nothing is written outside the project folder
  services/projectExecutor.js allowlisted commands + local preview server
  services/projectTemplates.js React + Vite template
  services/securityScanner.js automated security checks on generated code
  services/agents/           mockAgents.js (simulated) and openaiAgents.js (live)
  services/mock/             simulated Developer that writes real, buildable code
workspace-projects/          generated projects (git-ignored)
```

## Installation

Requires **Node.js 20.12 or newer** (tested with Node 24).

```bash
cd C:\ai-startup-team
npm install
```

## Environment variables

Copy the example file and edit it:

```bash
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

| Variable | Read by | Meaning |
|----------|---------|---------|
| `AI_MODE` | backend | `mock` (default, simulated) or `openai` (real OpenAI calls) |
| `OPENAI_API_KEY` | backend | Your OpenAI key. **Put it only in `.env`.** |
| `OPENAI_MODEL` | backend | Optional, default `gpt-4.1-mini` |
| `OPENAI_TIMEOUT_MS` | backend | Optional, default `120000` |
| `PORT` | backend | Backend port, default `3001` |
| `VITE_API_URL` | frontend | Backend URL, e.g. `http://localhost:3001`. If omitted, the Vite dev server proxies `/api` to port 3001 |

The key is never sent to the browser. Vite only exposes variables that start with `VITE_`, and the only one is the backend URL. There is no `VITE_OPENAI_API_KEY`.

## Running

Two terminals:

```bash
# Terminal 1: backend (Express, http://localhost:3001)
npm run server

# Terminal 2: frontend (Vite, http://localhost:5173)
npm run dev
```

Or both in one terminal:

```bash
npm run dev:all
```

Open **http://localhost:5173**.

Analyze mode in Simulated mode also works with only `npm run dev` (no backend). Build Project and Live AI need the backend.

### Build for production

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ (keep the backend running for Build mode / Live AI)
npm run lint
```

## Putting it on the web

The frontend is published to **GitHub Pages** by `.github/workflows/deploy.yml` on every push:
https://yuvraj123choubey.github.io/AI-Startup-Team/

Pages only hosts static files, so the backend runs on **Render** (free tier) using `render.yaml`:

1. Sign in at https://render.com with GitHub → **New → Blueprint** → choose this repository → **Apply**.
2. Render asks for two secret values:
   - `ACCESS_CODE`: a long, private code. Live AI and Build Project only work after it is entered on the New Task page. Visitors without it can use Simulated Analyze.
   - `OPENAI_API_KEY`: optional; leave empty to use Simulated mode only.
3. When the service is live, copy its URL (for example `https://ai-startup-team-api.onrender.com`).
4. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**: name `BACKEND_URL`, value = that URL (no trailing slash).
5. **Actions → Deploy to GitHub Pages → Run workflow** (or push any commit). The site now talks to the backend.

To make Live AI the default engine, set `AI_MODE=openai` in Render's environment settings.

Safeguards on the hosted backend: the access code (checked in constant time, with wrong-code attempts rate-limited), per-visitor rate limits for AI requests and builds, a cap on the number of projects (`MAX_PROJECTS`), and CORS limited to the GitHub Pages origin. **Run project** publishes the built project at `<backend>/preview/<id>/` until you click **Stop**.

Free-tier caveats: the service sleeps after about 15 minutes without traffic, so the first visit can take up to a minute while it wakes. Its disk is temporary, so generated projects disappear when the service restarts or redeploys. Download anything you want to keep from **View files**.

## Mock mode vs. real AI mode

**Simulated (mock) mode** (`AI_MODE=mock`, the default) needs no API key.
- Analyze: answers are generated from the brief and the task by rule-based generators (`src/services/mockResponses.js`).
- Build: the simulated Developer writes a **real** React project chosen from the task (login system, dashboard, admin panel, landing page with waitlist, portfolio, API frontend, phishing-check tool, contact form). The project is really installed, built, scanned and previewed. Like a quick first draft, version 1 contains a few common prototype mistakes (for example plain-text passwords). The real security scanner finds them in the code, and the fix step regenerates the files with the fix applied. Only the "thinking" is simulated.

**Live AI mode** (`AI_MODE=openai` plus `OPENAI_API_KEY`) sends each role's own prompt to OpenAI through the backend, requests JSON (`response_format: json_object`), and validates the answer. In Build mode, the model writes the files. Its paths are validated, it can only write inside `src/`, `public/`, `index.html` and `README.md`, and the security review combines the automated scanner with the model's review.

### Switching modes

- **Default for everyone:** set `AI_MODE=mock` or `AI_MODE=openai` in `.env` and restart the backend.
- **In the UI:** the **AI engine** switch on the New Task page (Simulated / Live AI) overrides the default for this browser. Live AI is disabled while the backend is offline or no key is set.
- If a live request fails (missing key, rejected key, quota, timeout, invalid reply, backend offline), the app says so clearly and offers **Switch to Simulated mode**. It never silently substitutes simulated answers.

## Testing Build Project mode

1. Start the backend and the frontend (see *Running*).
2. Open http://localhost:5173 → **New Task** → Mode **Build Project**.
3. Project name: `Secure Login Demo`. Task: `Create a React website with registration, login, logout, password validation, and a protected dashboard.`
4. Click **Start project**. The project page opens and shows the live activity log (about 20–60 seconds in Simulated mode; the first npm install takes longest).
5. When it shows **Project complete**: **Run project** starts a local preview on a free port (shown as a link), **View files** opens the file browser, **Open project** opens the folder in VS Code, and the approval list records your decisions.
6. The generated project is a normal Vite app:

```bash
cd workspace-projects\secure-login-demo-001
npm run build
npm run dev
```

## Safety and the human-decision model

```
AI OUTPUT → VERIFY → COMPARE → HUMAN DECISION
```

- AI recommendations are **research and support**. Legal output is **not professional legal advice**. Financial output is **not professional financial advice**, and every number is an estimate.
- Important factual claims should be verified. High-impact security, legal, financial, regulatory or customer-data decisions may require **qualified professional review**.
- Analyze results are only complete after the founder confirms the review and records **Approve**, **Approve with changes**, or **Reject / reconsider** (or asks the team for more).
- Build mode never deploys, purchases services, creates paid infrastructure, uses production credentials, modifies external accounts, or handles real customer data. These appear as **approval requests**, and recording an approval does not execute anything. Deleting a project requires typing its id.

**Build-mode safeguards**
- Every AI-generated path is validated: no `..`, no absolute paths, no hidden files, no `package.json`/`vite.config.js`, only source file types, only inside `workspace-projects/<id>/`. Rejected paths are logged in the activity feed.
- Only allowlisted commands run: `npm install --ignore-scripts` and `npm run build`, plus `npm run preview` bound to `127.0.0.1` for **Run project**. Model text never becomes a shell command, the template's npm scripts are verified before every run, and API keys are removed from the environment of these commands.
- The repair loop is capped at **3 rounds** (build-error fixes at 2 attempts). Anything still open is marked **Founder review required**.

## Limitations

- Build mode supports one template (React + Vite) and small, browser-only apps without a backend. Generated login systems store accounts in the browser (localStorage, hashed after the security fix). That is a demo of the user flow, **not production authentication**, and the security review says so.
- The automated security checks are simple pattern rules, not a professional audit.
- Simulated answers are rule-based; tasks outside login, payments, data/analytics and general product work get generic Analyze answers.
- Live AI quality depends on the model, and every call costs money on your OpenAI account. A live Build run makes roughly 6–12 model calls.
- On the free hosted backend, projects are temporary (lost on restart) and the first request after idle is slow.
- Projects are built one at a time (later ones wait as *Queued*). A build interrupted by stopping the backend is marked *Failed* and can be retried.
- Analyses and the Company Brief are stored in this browser (localStorage). Projects are stored in `workspace-projects/` on this computer.
