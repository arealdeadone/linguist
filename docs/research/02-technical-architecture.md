# Technical Architecture

## Design Principle: Production-Ready from Day One

The app runs on OrbStack Kubernetes locally but is architected with standard cloud-native patterns so it can lift-and-shift to any managed Kubernetes cluster (EKS, GKE, AKS) with minimal changes — swap the ingress, point to a managed database, deploy.

## Tech Stack Decision

### Frontend Framework: SvelteKit (Recommended) or Next.js (Fallback)

**SvelteKit advantages for this project:**
- Smallest bundle (~42KB gzipped vs Next.js ~120KB) — fastest audio UI response
- Svelte 5 runes system gives fine-grained reactivity ideal for real-time speech feedback (tone indicators, waveforms, interim transcripts)
- `adapter-node` produces a standalone Node.js server — containerizes trivially with a multi-stage Dockerfile
- No React hydration overhead when toggling between lesson/conversation modes

**When to pick Next.js instead:**
- If the developer is React-native and wants the Vercel AI SDK (`useChat`, streaming RSC)
- The Vercel AI SDK is React-first and has no SvelteKit equivalent — streaming chat would need to be built manually in SvelteKit

**Not recommended:** Remix/React Router (no advantage for audio/speech use case)

### Backend: API Routes within the Framework

No separate backend service needed. SvelteKit API routes handle:
- Proxying calls to Agoda GenAI Gateway
- Audio file processing (receive MediaRecorder blobs, forward to STT)
- SRS scheduling logic
- Learner profile management

The app is a single deployable container that connects to external data stores.

### Database: PostgreSQL

- Industry standard relational database, runs as a container in K8s
- Full JSON/JSONB support for storing lesson plans, conversation logs, and structured AI outputs
- Proper indexing for SRS queries ("give me all vocab items due for review before date X for user Y")
- Drizzle ORM or Prisma for type-safe database access from TypeScript
- Trivial to swap to managed PostgreSQL (RDS, Cloud SQL, Supabase) when productionizing

### Cache: Redis

- Session state, hot learner profiles, SRS due-item cache
- Caches frequently accessed data: current lesson state, active conversation context, recently generated TTS audio URLs
- Pub/sub capability for future real-time features (live tutor notifications, progress events)
- Runs as a container, swaps to ElastiCache/Memorystore in production

### Audio Capture: MediaRecorder API (Browser)

- Universal browser support (Baseline since April 2021)
- Format: `audio/webm;codecs=opus` — 10:1 compression vs WAV, ~50KB for 30s
- Works directly with OpenAI transcription endpoints
- No WebRTC needed (that's for peer-to-peer streaming, not AI backend communication)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  OrbStack Kubernetes Cluster (local machine)                        │
│                                                                     │
│  ┌──────────────────────────────────┐                               │
│  │  Ingress (nginx / traefik)       │  ← HTTPS termination          │
│  │  linguist.local / 192.168.x.x   │     self-signed cert or        │
│  └──────────────┬───────────────────┘     mDNS + real cert          │
│                 │                                                   │
│  ┌──────────────▼───────────────────┐                               │
│  │  linguist-app (Deployment)       │                               │
│  │  SvelteKit container             │                               │
│  │  ├── /                  UI       │                               │
│  │  ├── /api/lessons       CRUD     │                               │
│  │  ├── /api/chat          Stream   │                               │
│  │  ├── /api/speech/stt    STT      │                               │
│  │  ├── /api/speech/tts    TTS      │                               │
│  │  ├── /api/srs           SRS      │                               │
│  │  ├── /api/quiz          Quiz     │                               │
│  │  └── /api/profile       Users    │                               │
│  └──┬───────────┬───────────────────┘                               │
│     │           │                                                   │
│  ┌──▼────┐  ┌───▼──────┐   ┌──────────────────────────────────┐     │
│  │ Redis │  │PostgreSQL│   │  External: Agoda GenAI Gateway   │     │
│  │  :6379│  │    :5432 │   │  genai-gateway.agoda.is          │     │
│  │       │  │          │   │  ├─ gpt-4o-transcribe (STT)      │     │
│  │Cache: │  │ Tables:  │   │  ├─ gpt-4o-mini-tts (TTS)        │     │
│  │ -sess │  │ -learners│   │  ├─ Gemini 3 Flash (lessons)     │     │
│  │ -srs  │  │ -vocab   │   │  ├─ GPT-4o (conversation)        │     │
│  │ -audio│  │ -lessons │   │  ├─ GPT-4o-mini (drills)         │     │
│  │       │  │ -convos  │   │  └─ Claude Sonnet (evaluation)   │     │
│  │       │  │ -quizzes │   └──────────────────────────────────┘     │
│  │       │  │ -switches│                                            │
│  └───────┘  └──────────┘                                            │
│                                                                     │
│  LAN clients → https://linguist.local                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Kubernetes Manifests (Conceptual)

The deployment consists of 3 workloads + 1 ingress:

| Resource | Kind | Image | Notes |
|---|---|---|---|
| `linguist-app` | Deployment (1 replica) | Custom SvelteKit image | Connects to Postgres + Redis via K8s service DNS |
| `linguist-postgres` | StatefulSet (1 replica) | `postgres:17-alpine` | PersistentVolumeClaim for data durability |
| `linguist-redis` | Deployment (1 replica) | `redis:7-alpine` | Ephemeral OK (cache only), but PVC recommended |
| `linguist-ingress` | Ingress | — | HTTPS termination, routes to linguist-app service |

### Environment Variables (linguist-app)

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql://linguist:password@linguist-postgres:5432/linguist"
  - name: REDIS_URL
    value: "redis://linguist-redis:6379"
  - name: AGODA_GENAI_API_KEY
    valueFrom:
      secretKeyRef:
        name: linguist-secrets
        key: genai-api-key
  - name: GENAI_BASE_URL
    value: "https://genai-gateway.agoda.is/v1"
```

### Production Lift-and-Shift Checklist

When moving to a cloud cluster, change only:
1. `DATABASE_URL` → managed PostgreSQL (RDS, Cloud SQL)
2. `REDIS_URL` → managed Redis (ElastiCache, Memorystore)
3. Ingress → cloud load balancer with real TLS cert
4. `AGODA_GENAI_API_KEY` → cloud secret manager
5. Container registry → push image to ECR/GCR/ACR
6. Everything else stays identical

## PostgreSQL Schema Design

```sql
CREATE TABLE learners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    pin             TEXT,
    target_language TEXT NOT NULL,        -- 'zh' or 'te'
    lesson_language TEXT NOT NULL,        -- 'hi', 'th', 'en', etc. (user-configurable instruction language)
    cefr_level      TEXT NOT NULL DEFAULT 'A1',
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vocabulary (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID NOT NULL REFERENCES learners(id),
    word            TEXT NOT NULL,
    romanization    TEXT,                 -- pinyin for Chinese, transliteration for Telugu
    cefr_level      TEXT NOT NULL,
    sm2_repetition  INT DEFAULT 0,
    sm2_interval    INT DEFAULT 0,
    sm2_ef          REAL DEFAULT 2.5,
    next_review     TIMESTAMPTZ DEFAULT now(),
    modality_scores JSONB DEFAULT '{"listening": 0, "speaking": 0, "contextual": 0}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(learner_id, word)
);

CREATE INDEX idx_vocab_review ON vocabulary(learner_id, next_review);
CREATE INDEX idx_vocab_level ON vocabulary(learner_id, cefr_level);

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID NOT NULL REFERENCES learners(id),
    cefr_level      TEXT NOT NULL,
    week            INT,
    day             INT,
    theme           TEXT,
    plan            JSONB NOT NULL,       -- full lesson plan JSON
    status          TEXT DEFAULT 'pending', -- pending, in_progress, completed
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID NOT NULL REFERENCES learners(id),
    lesson_id       UUID REFERENCES lessons(id),
    scenario        TEXT,
    messages        JSONB NOT NULL DEFAULT '[]',
    analysis        JSONB,               -- post-session analysis
    srs_updates     JSONB,               -- quality scores per word
    created_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE code_switches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID NOT NULL REFERENCES learners(id),
    conversation_id UUID REFERENCES conversations(id),
    gap_word        TEXT NOT NULL,        -- L1 word used as gap-filler
    target_equiv    TEXT,                 -- target language equivalent
    times_used      INT DEFAULT 1,
    promoted_to_vocab BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(learner_id, gap_word)
);

CREATE INDEX idx_code_switch_frequency ON code_switches(learner_id, times_used DESC);

CREATE TABLE quiz_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID NOT NULL REFERENCES learners(id),
    lesson_id       UUID REFERENCES lessons(id),
    quiz_type       TEXT NOT NULL,        -- 'multiple_choice', 'fill_in', 'listening', 'matching'
    questions       JSONB NOT NULL,
    answers         JSONB NOT NULL,
    score           REAL,
    srs_updates     JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

## Redis Usage

| Key Pattern | Purpose | TTL |
|---|---|---|
| `session:{userId}` | Active session state (current lesson step, conversation context) | 24h |
| `srs:due:{userId}` | Cached list of vocab items due for review | 1h (invalidated on review completion) |
| `audio:tts:{hash}` | Cached TTS audio blobs for repeated phrases | 7d |
| `lesson:active:{userId}` | Current lesson plan being worked through | Until lesson completion |
| `convo:context:{conversationId}` | Conversation message history for AI context window | Session duration |

## PWA Configuration

### Manifest
```json
{
  "name": "Linguist",
  "short_name": "Linguist",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker Caching Strategy

Three distinct strategies layered together:

| Resource Type | Strategy | Rationale |
|---|---|---|
| App shell, JS, CSS | **Cache-first** | Static, changes only on deploy |
| Lesson JSON, vocabulary data | **Stale-while-revalidate** | Serve cached immediately, refresh in background |
| AI responses (chat, lesson generation) | **Network-only** | Must be fresh, never cache |
| Audio files (TTS output) | **On-demand cache** with LRU eviction | Large files, cache only when lesson is explicitly downloaded |

### HTTPS on LAN (Required)

PWAs require HTTPS for service workers and `getUserMedia` (microphone). On K8s, HTTPS terminates at the ingress:

1. **cert-manager + self-signed ClusterIssuer** (recommended) — automates cert generation for the ingress, devices trust the CA once
2. **Manual self-signed cert** as K8s TLS secret — simpler, less automated
3. **mDNS + real cert** — smoothest UX, use `linguist.local` via mDNS and a DNS challenge for real cert

## Key Technical Decisions

### State Management: Server-Side with PostgreSQL + Redis

Lesson state, SRS schedules, and learner profiles live in PostgreSQL. Hot/active state cached in Redis. The client is a thin UI layer. This means:
- Multi-user works naturally (each device hits the same server)
- No complex client-side state sync
- Survives browser clears, device switches
- Redis keeps conversation context and active lesson state fast

### Streaming AI Responses: Server-Sent Events (SSE)

For conversation mode, stream AI responses token-by-token via SSE:
```
Client → POST /api/chat (user message + context)
Server → SSE stream of AI response tokens
Client → Renders tokens as they arrive
```

### Audio Pipeline Flow

```
[Browser]                          [Server]                    [GenAI Gateway]
    │                                  │                              │
    ├─ MediaRecorder captures audio    │                              │
    ├─ POST /api/speech/stt {blob}  →  │                              │
    │                                  ├─ Forward to transcribe    →  │
    │                                  │  model: gpt-4o-transcribe    │
    │                                  │  language: zh/te             │
    │                                  ← transcript response ───────  │
    ← { transcript, confidence }  ──── │                              │
    │                                  │                              │
    ├─ POST /api/speech/tts {text}  →  │                              │
    │                                  ├─ Check Redis audio cache     │
    │                                  ├─ Cache miss → GenAI TTS   →  │
    │                                  │  model: gpt-4o-mini-tts      │
    │                                  │  voice: coral                │
    │                                  ← audio blob ────────────────  │
    │                                  ├─ Cache in Redis (7d TTL)     │
    ← audio/mp3 blob  ──────────────── │                              │
    ├─ Play audio via Web Audio API    │                              │
```

TTS responses for common/repeated phrases are cached in Redis to avoid redundant API calls and reduce latency on repeated playback.

### Offline Capabilities

Since this is LAN-hosted and always-on, full offline isn't critical. However:
- Lessons already viewed are cached for review without network
- SRS review can work offline with cached vocabulary (sync on reconnect)
- Conversation mode requires network (needs AI)
- TTS audio for known phrases can be pre-cached

## Containerization

### Dockerfile (SvelteKit app — multi-stage)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "build"]
```

### Docker Compose (for local dev without K8s)

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://linguist:linguist@postgres:5432/linguist
      REDIS_URL: redis://redis:6379
      AGODA_GENAI_API_KEY: ${AGODA_GENAI_API_KEY}
      GENAI_BASE_URL: https://genai-gateway.agoda.is/v1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: linguist
      POSTGRES_USER: linguist
      POSTGRES_PASSWORD: linguist
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linguist"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## Directory Structure (Proposed)

```
linguist/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              Postgres connection (Drizzle ORM)
│   │   │   ├── schema.ts          Drizzle schema definitions
│   │   │   ├── redis.ts           Redis client
│   │   │   ├── srs.ts             SM-2 algorithm implementation
│   │   │   ├── ai.ts              GenAI Gateway client wrapper
│   │   │   ├── lessons.ts         Lesson generation + management
│   │   │   └── speech.ts          TTS/STT proxy logic
│   │   ├── components/
│   │   │   ├── LessonPlayer.svelte
│   │   │   ├── ConversationChat.svelte
│   │   │   ├── AudioRecorder.svelte
│   │   │   ├── ToneVisualizer.svelte
│   │   │   ├── QuizCard.svelte
│   │   │   └── SRSReviewBar.svelte
│   │   ├── stores/
│   │   │   ├── learner.ts         Current learner state
│   │   │   └── audio.ts           Recording/playback state
│   │   └── types/
│   │       ├── lesson.ts          Lesson plan schema
│   │       ├── vocabulary.ts      Vocab + SRS item schema
│   │       └── conversation.ts    Chat message types
│   ├── routes/
│   │   ├── +layout.svelte         App shell
│   │   ├── +page.svelte           Dashboard / home
│   │   ├── learn/
│   │   │   ├── [lessonId]/+page.svelte   Lesson player
│   │   │   └── +page.svelte              Lesson list
│   │   ├── converse/
│   │   │   └── +page.svelte       Conversation mode
│   │   ├── review/
│   │   │   └── +page.svelte       SRS review + quizzes
│   │   ├── tones/
│   │   │   └── +page.svelte       Chinese tone practice
│   │   └── api/
│   │       ├── lessons/+server.ts
│   │       ├── chat/+server.ts
│   │       ├── speech/
│   │       │   ├── tts/+server.ts
│   │       │   └── stt/+server.ts
│   │       ├── srs/+server.ts
│   │       ├── quiz/+server.ts
│   │       └── profile/+server.ts
│   └── app.html
├── static/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├─�� k8s/
│   ├── namespace.yaml
│   ├── app-deployment.yaml
│   ├── app-service.yaml
│   ├── postgres-statefulset.yaml
│   ├── postgres-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── ingress.yaml
│   └── secrets.yaml
├── docker-compose.yaml            Local dev without K8s
├── Dockerfile
├── drizzle.config.ts
├── docs/
│   └── research/
├── svelte.config.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```
