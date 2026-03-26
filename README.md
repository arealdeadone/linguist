# Linguist — AI Language Tutor

SvelteKit 5 PWA for learning Chinese Mandarin (via Hindi) and Telugu (via Thai) through AI-powered lessons, conversation practice, and spaced repetition.

## Architecture

```
┌──────────────────────────────────┐     ┌──────────────────────────┐
│  Main App (Vercel)               │     │  AI Worker (Local K8s)   │
│  SvelteKit + Supabase DB + Auth  │     │  OrbStack               │
│                                  │     │                          │
│  - All UI pages                  │     │  - Agoda GenAI Gateway   │
│  - Supabase Auth (all users)     │     │  - TTS / STT             │
│  - SRS algorithm                 │     │  - Lesson generation     │
│  - Lesson/quiz playback          │     │  - Conversation AI       │
│  - Review flashcards             │     │  - Pronunciation eval    │
│                                  │     │                          │
│  AI requests → ai_jobs table ────│─────│→ Worker polls & processes│
│  Polls for results ← ───────────│─────│← Writes results back     │
└──────────────────────────────────┘     └──────────────────────────┘
```

- **Main app** runs on Vercel (free tier) with Supabase PostgreSQL + Auth
- **AI worker** runs on local OrbStack K8s, polls the `ai_jobs` table, calls Agoda GenAI Gateway
- In **local mode** (`AI_MODE=local`), the app calls AI directly — no worker needed

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5 runes, Tailwind CSS
- **Backend**: Drizzle ORM, PostgreSQL 17, Redis 7
- **Auth**: Supabase Auth (email/password)
- **AI**: Agoda GenAI Gateway (GPT-4o, Claude, Gemini)
- **Deployment**: Vercel (app) + OrbStack K8s (worker)
- **Monorepo**: `packages/ai-core/` shared between app and worker

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for local PostgreSQL + Redis)
- A Supabase project (free tier)

### Local Development

```bash
# 1. Clone and install
git clone git@github.com:arealdeadone/linguist.git
cd linguist
npm install

# 2. Configure environment
cp .env.vercel .env.local  # Then edit with your values:
#   DATABASE_URL=postgresql://linguist:linguist@localhost:5433/linguist
#   REDIS_URL=redis://localhost:6379
#   AI_MODE=local
#   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
#   SUPABASE_SECRET_KEY=your-sb-secret-key
#   ADMIN_SUPABASE_USER_ID=your-admin-user-id
#   AGODA_GENAI_API_KEY=your-key

# 3. Start services
npm run docker:up       # PostgreSQL + Redis
npm run db:push         # Create tables
npm run db:seed         # Seed data (first time only)

# 4. Run
npm run dev             # http://localhost:5173
```

### Vercel Deployment (Split Architecture)

The main app runs on Vercel, AI processing on a local worker.

**App (Vercel):**
- Connect GitHub repo at https://vercel.com/new
- Set env vars: `DATABASE_URL` (Supabase pooler), `AI_MODE=queue`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_SUPABASE_USER_ID`

**Worker (Local K8s):**
```bash
# Build worker image
docker build -f worker/Dockerfile -t linguist-worker:latest .

# Create K8s secrets (with Supabase DB URL + GenAI key)
kubectl create secret generic linguist-worker-secrets -n linguist \
  --from-literal=DATABASE_URL='your-supabase-pooler-url' \
  --from-literal=REDIS_URL='redis://redis:6379' \
  --from-literal=AGODA_GENAI_API_KEY='your-key' \
  --from-literal=GENAI_BASE_URL='https://genai-gateway.agoda.is/v1'

# Deploy
kubectl apply -k k8s/
```

### Local K8s (Everything Local)

```bash
npm run k8s:deploy      # Builds + deploys everything to OrbStack K8s
# Access at http://<LAN_IP>:30000
```

## Commands

```bash
npm run dev             # Dev server
npm run build           # Production build
npm run check           # TypeScript + Svelte type check
npm run test -- --run   # All tests (131 unit + integration + BDD)
npm run docker:up       # Start PostgreSQL + Redis
npm run db:push         # Apply Drizzle schema
npm run db:seed         # Seed database
npm run k8s:deploy      # Build + deploy to K8s
```

## Project Structure

```
linguist/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte 5 components
│   │   ├── server/         # AI, SRS, pronunciation, DB, Redis
│   │   │   ├── ai-service/ # AIService interface + LocalAIService + QueueAIService
│   │   │   ├── data/       # Drizzle ORM query modules
│   │   │   └── prompts/    # Tutor system prompts
│   │   ├── stores/         # Svelte 5 rune stores
│   │   └── types/          # TypeScript types
│   ├── routes/             # Pages + API endpoints + admin console
│   └── hooks.server.ts     # Supabase Auth + route protection
├── packages/ai-core/       # Shared constants between app and worker
├── worker/                 # Standalone AI job processor
├── k8s/                    # Kubernetes manifests
└── scripts/                # Deploy + seed scripts
```

## Pedagogy

Based on SLA research (see `docs/research/`):

- **i+1 principle** — 90% known vocab, 10% new per lesson
- **TPR** — vocabulary via scene descriptions + audio
- **SM-2 spaced repetition** — multi-modal (listening, speaking, contextual)
- **Error correction** — max 1 per turn, 80% recast / 20% explicit
- **Affective filter** — no harsh scoring, gentle amber feedback

## License

Private project.
