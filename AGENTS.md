# LINGUIST — AI Language Tutor PWA

## OVERVIEW

SvelteKit 5 PWA teaching Chinese Mandarin (in Hindi) and Telugu (in Thai) via AI-powered lessons, conversation practice, and spaced repetition. All AI through AI Gateway. Split architecture: Vercel (app) + local OrbStack K8s (AI worker).

## STRUCTURE

```
linguist/
├── src/
│   ├── lib/
│   │   ├── components/    # 15 Svelte 5 components
│   │   ├── server/        # Backend: AI service, SRS, pronunciation, DB, Redis, cost tracking
│   │   │   ├── ai-service/ # AIService interface + LocalAIService + QueueAIService
│   │   │   ├── data/      # Drizzle ORM queries (11 modules, barrel export)
│   │   │   └── prompts/   # AI tutor system prompts (Hindi/Thai)
│   │   ├── stores/        # 6 Svelte 5 rune stores (.svelte.ts)
│   │   ├── types/         # TypeScript types (barrel export)
│   │   ├── data/          # Static data (30+ conversation scenarios)
│   │   └── offline/       # PWA precaching
│   ├── routes/            # 12 pages + 28 API endpoints + admin console
│   ├── hooks.server.ts    # Supabase Auth session + route protection + /admin guard
│   └── service-worker.ts  # Cache strategies (network-first for data, cache-first for static)
├── packages/ai-core/      # Shared monorepo package (schema, constants, types)
├── worker/                # Standalone AI job processor (polls ai_jobs from Supabase)
├── k8s/                   # Kustomize manifests (worker deployment)
├── drizzle/               # SQL migration files
├── scripts/
│   ├── deploy.sh          # Full K8s deploy (build → migrate → deploy)
│   ├── seed.ts            # DB seed (2 learners, 40 vocab, 2 lessons)
│   └── backfill-tts.ts    # Retroactive TTS audio generation for existing vocab
├── docs/research/         # Pedagogy research (ground truth for behavior)
├── Dockerfile             # 3-stage node:22-alpine (main app)
├── worker/Dockerfile      # Worker container
└── docker-compose.yaml    # PostgreSQL 17 + Redis 7 (local dev)
```

## WHERE TO LOOK

| Task                   | Location                                                           | Notes                                                                                     |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Add new page           | `src/routes/{name}/+page.svelte` + `+page.server.ts`               | Add `depends('data:learner')` to server load                                              |
| Add API endpoint       | `src/routes/api/{name}/+server.ts`                                 | Export GET/POST/PATCH, wrap in try/catch, return `json({ error }, { status })` on failure |
| Add component          | `src/lib/components/{Name}.svelte`                                 | Svelte 5 runes only, see components/AGENTS.md                                             |
| Add AI feature         | `src/lib/server/ai-service/`                                       | Use `getAIService()` factory, pass `onUsage` for cost tracking                            |
| Add TTS pre-generation | `src/lib/server/tts-storage.ts`                                    | Dedup + upload public audio to Supabase Storage bucket `tts-audio`                        |
| Add DB table           | `packages/ai-core/src/schema.ts` → `src/lib/server/data/{name}.ts` | Schema lives in shared package, run migration after                                       |
| Add store              | `src/lib/stores/{name}.svelte.ts`                                  | Must use `.svelte.ts` extension for runes                                                 |
| Add test               | Colocate as `*.test.ts`                                            | BDD in `bdd.integration.test.ts`, regression in `regression.integration.test.ts`          |
| Add admin feature      | `src/routes/(admin)/admin/`                                        | Protected by Supabase auth guard, dark theme layout                                       |
| Add data module        | `src/lib/server/data/{name}.ts` → re-export in `data/index.ts`     | See `data/AGENTS.md` for all modules and patterns                                         |
| Add worker job         | `worker/src/processor.ts` + `local-ai-service.ts`                  | See `worker/AGENTS.md` for job types and flow                                             |
| Deploy                 | `npm run k8s:deploy`                                               | First time: `npm run k8s:deploy:seed`                                                     |

## CONVENTIONS

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. NEVER `$:` or `writable/readable`
- **Lesson language, not English** — All AI output in Hindi (zh learner) or Thai (te learner). NEVER English
- **Tabs, single quotes** — Prettier enforced
- **`$lib` alias** — All internal imports use `$lib/...`
- **Barrel exports** — `types/index.ts` and `server/data/index.ts`
- **AIError class** — `chatJSON` throws `AIError` on failure. Callers must catch and surface to user
- **Toast for errors** — `showToast(msg, 'error')` from `stores/toast.svelte.ts`. No silent catches
- **depends('data:learner')** — All page server loads that use learnerId must call this
- **Cost tracking** — Every AI call must pass `onUsage` callback for cost tracking

## ANTI-PATTERNS

- `as any`, `@ts-ignore`, `@ts-expect-error` — NEVER
- `$:` reactive syntax — NEVER (Svelte 5 only)
- `.catch(() => {})` or `.catch(() => [])` — NEVER silently swallow errors
- `catch { }` (empty catch block) — NEVER. Every catch must log or surface the error
- `return {} as T` — NEVER return empty object as typed result. Throw `AIError` instead
- AI-generated lesson content in wrong language — NEVER. All learner-facing AI output (lesson explanations, feedback, cultural notes, quiz prompts, scene descriptions, error corrections) must be in the learner's configured `lessonLanguage`. If the learner's lesson language is Hindi, output Hindi. If it's English, output English. The `lessonLanguage` field on the learner profile is the single source of truth — never hardcode a language assumption
- Red X marks in quiz feedback — violates affective filter (use amber 💡)
- `document.cookie` for learnerId — NEVER (learnerId derived from Supabase session in hooks.server.ts)
- `response_format: { type: 'json_object' }` with Claude — doesn't work reliably via gateway
- Looking up review words in `vocabulary_targets` — NEVER. Look up from `allVocab` (full learner vocabulary)
- Fetching vocab from API inside components — NEVER. Pass `allVocab` from server load as a prop
- PIN-based auth or password/PIN uniqueness checks — NEVER. Auth is Supabase email/password only
- Defining schema tables in app or worker directly — NEVER. Schema lives in `packages/ai-core/src/schema.ts` only. App and worker re-export from `@linguist/ai-core/schema`
- Empty string defaults for missing data (`?? ''`) — NEVER for required fields
- Optional chaining (`?.`) as a lazy null guard — NEVER use to silently swallow what should be an error. Only permitted when the value is GENUINELY optional by design (e.g., optional function params, browser APIs, OpenAI SDK arrays). If the value SHOULD exist, access it directly and let the error surface
- Hand-rolled code for common tasks — NEVER. Use battle-tested libraries (e.g., `magic-bytes.js` for file detection, `prom-client` for metrics)
- Eager DB connection at module scope — NEVER. The `db` export in `src/lib/server/db.ts` uses a Proxy for lazy init. Never replace it with a direct `const db = drizzle(postgres(...))` at module level — this causes cold-start timeouts on Vercel serverless
- Modifying `db.ts` without verifying Vercel serverless compatibility — NEVER. Any change to `db.ts` must preserve: (1) lazy connection via Proxy, (2) `prepare: false` for Supabase pooler, (3) `ssl: 'require'` for Supabase, (4) `connect_timeout: 30`, (5) `max: 1` for serverless
- Modifying `svelte.config.js` adapter `maxDuration` below 60 — NEVER. Supabase pooler cold-start + SSL handshake needs this headroom
- Creating new DB/Redis/external service clients at module scope — NEVER on Vercel. All external connections must be lazy-initialized (created on first use, not on import). Module-scope initialization runs during cold start and competes with Vercel's function timeout
- `db.execute(sql\`...\`)`with parameters on Vercel — NEVER. Drizzle's`execute()`with parameterized tagged template literals fails when`prepare: false` (required for Supabase pooler). Use Drizzle query builder (`db.select()`, `db.update()`, etc.) instead. Parameter-free queries like `SELECT 1`are safe. The`claimNextJob` CTE in ai-jobs.ts is an exception (worker-only, not on Vercel)

## ZERO TOLERANCE: NO SILENT FAILURES (ABSOLUTE RULE)

**Every failure must be VISIBLE to the user — via toast, error state, or inline message. Never swallow errors via empty catches, optional chaining defaults, or fallback data that hides the problem.**

The app must ALWAYS render — but with a clear error state when something fails. A blank/crashed page is NOT acceptable. A page that renders with a toast saying "Failed to load stats" IS acceptable. A page that silently shows 0 for everything IS NOT acceptable.

| Location               | Error Handling Required                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| Client catch block     | `showToast('What failed', 'error')` — ALWAYS                                   |
| Server catch block     | `console.error('Context:', e)` + return `json({ error }, { status })` — ALWAYS |
| Server fire-and-forget | `.catch((e) => console.error('Context:', e))` — ALWAYS log                     |
| Component data missing | Show error state or toast — NEVER render empty/blank                           |
| API response not ok    | Extract error message, show to user — NEVER ignore                             |

**Grep audit (must return ZERO results):**

```bash
grep -rn "catch {}\|catch()\|\.catch(() => {})\|\.catch(() => \[\])" src/ --include="*.ts" --include="*.svelte" | grep -v test | grep -v node_modules
```

## MANDATORY GUARDRAILS (enforced by review)

1. **Every `catch` block must surface the error** — `showToast()` on client, `json({ error }, { status })` on server
2. **Every button/link must have a handler** — dead buttons are bugs
3. **Every data lookup must handle "not found"** — show error, never render empty
4. **Every server load must `depends('data:learner')`** if it uses learnerId
5. **Every new feature must have BDD tests for BOTH language pairs** (zh/hi + te/th)
6. **Every SRS update must include `modality`** — listening, speaking, or contextual
7. **Every AI-generated content must be verified for lesson language** — check that output is in the learner's `lessonLanguage`, not defaulting to English or any other language
8. **Every new AI call must include `onUsage`** for cost tracking
9. **Every page server load must handle query failures** — log + show error state, NOT empty data
10. **Every new vocab from lessons must be persisted** — `upsertVocab()` on lesson generation AND completion
11. **Every modification to `db.ts` must preserve lazy Proxy pattern** — verify `connect_timeout`, `prepare`, `ssl`, `max` settings survive the change
12. **Every new external service client must be lazy-initialized** — no module-scope `new Client()` or `createClient()` calls that run on import

## COMMANDS

```bash
# Development
npm run docker:up          # Start local PostgreSQL + Redis
npm run db:push            # Apply Drizzle schema
npm run db:seed            # Seed (first time only — truncates data)
npm run dev                # Dev server (localhost:5173)
npm run check              # TypeScript + Svelte check
npm run test -- --run      # All tests (134 unit + integration + BDD + regression)
npm run build              # Production build (adapter-vercel on Vercel, adapter-node locally)

# Production (OrbStack K8s)
npm run k8s:deploy         # Build + migrate + deploy (preserves data)
npm run k8s:deploy:seed    # Same + seed (first time only)
npm run k8s:logs           # Tail app logs

# Stop services
pkill -f "kubectl port-forward.*linguist-app.*30000" 2>/dev/null  # Stop LAN forward
kubectl scale deployment/linguist-app -n linguist --replicas=0    # Stop app (preserves data)
kubectl scale deployment/redis -n linguist --replicas=0           # Stop Redis

# Restart services
kubectl scale deployment/linguist-app -n linguist --replicas=1
kubectl scale deployment/redis -n linguist --replicas=1
kubectl port-forward -n linguist svc/linguist-app --address 0.0.0.0 30000:3000 &
```

## DEPLOYMENT

- **Vercel** (production): Main app deployed to Vercel free tier, auto-deploys on push
- **Local K8s** (AI worker): OrbStack cluster, polls `ai_jobs` table from Supabase
- **Supabase**: PostgreSQL (DB) + Auth (email/password + hCaptcha) + Storage (TTS audio CDN)
- **Health check**: `GET /api/health` — checks PostgreSQL + optional Redis + ai_jobs queue depth
- **Admin console**: `/admin` (Supabase login at `/login`, restricted by `ADMIN_SUPABASE_USER_ID`)
- **AI_MODE**: `local` (direct AI calls) or `queue` (via ai_jobs table to worker)
- **Env files**: `.env.local` (local dev, gitignored), `.env.vercel` (Vercel reference template)

## PEDAGOGY RULES (from docs/research/)

- **i+1 principle** — 90% known vocab, 10% new per lesson
- **TPR** — Vocab via scene descriptions + audio, NOT translations
- **SM-2 multi-modal** — listening=3, speaking=4, contextual=5
- **Max vocab** — A1:5, A2:7, B1:10, B2:12 words per session
- **Error correction** — Max 1 per turn, 80% recast, 20% explicit
- **Code-switching** — Never penalize, track gap-fillers, auto-promote after 3 uses
- **Affective filter** — No red X, no harsh scoring, gentle amber 💡 feedback
- **CEFR-adaptive quizzes** — A1: audio-first, A2: read+listen, B1+: active recall

## AI MODELS (AI Gateway)

| Task                   | Model                            | Notes                                        |
| ---------------------- | -------------------------------- | -------------------------------------------- |
| Lesson generation      | DB route (`model_routing`)       | Fallback: `gemini-3-flash-preview`           |
| Conversation           | DB route (`model_routing`)       | Fallbacks currently zh=`gpt-4o`, te=`gemini` |
| Grammar evaluation     | DB route (`model_routing`)       | Claude: skip `response_format`               |
| Quiz/flashcard/summary | DB route (`model_routing`)       | Fallback: `gpt-4o-mini`                      |
| Code-switch            | DB route (`model_routing`)       | Fallbacks currently zh=`gpt-4o`, te=`gemini` |
| STT                    | `gpt-4o-transcribe`              | Pass File object, not Buffer                 |
| TTS                    | `gpt-4o-mini-tts` (voice: coral) | Auto-detects language for instructions       |

## COST TRACKING

- All AI calls auto-tracked via `onUsage` callback in `ChatOptions`
- Stored in `ai_usage_logs` table (model, tokens, cost, learner, task)
- Adding to new features: `onUsage: (u) => trackUsage({ learnerId, task: 'name', ...u }).catch((e) => console.error('Cost tracking:', e))`
- Admin dashboard shows: total/daily cost, cost by task, cost by user

## TESTING

Every new feature requires:

1. Unit test if pure logic (colocated `*.test.ts`)
2. API integration test in `api.integration.test.ts`
3. BDD behavioral test in `bdd.integration.test.ts` — must cover BOTH language pairs (zh/hi + te/th)
4. Regression test in `regression.integration.test.ts` for any bug fix

Test files: `srs.test.ts` (24), `cost-tracker.test.ts` (8), `schema-drift.test.ts` (3), `api.integration.test.ts` (28), `bdd.integration.test.ts` (45), `regression.integration.test.ts` (29) = **134 total**

## SELF-UPDATE RULE

**This file (AGENTS.md) and subdirectory AGENTS.md files must be updated whenever:**

1. A new page/route is added → update WHERE TO LOOK + routes/AGENTS.md
2. A new component is added → update components/AGENTS.md
3. A new API endpoint is added → update routes/AGENTS.md
4. A new server module is added → update server/AGENTS.md
5. A new store is added → update stores/AGENTS.md
6. A new anti-pattern is discovered → add to ANTI-PATTERNS section
7. A new guardrail is needed → add to MANDATORY GUARDRAILS section
8. AI model routing changes → update AI MODELS table
9. A new test pattern is established → update TESTING section
10. Deployment process changes → update DEPLOYMENT + COMMANDS sections
11. **After any major feature implementation, run `/init-deep` to regenerate all AGENTS.md files**
