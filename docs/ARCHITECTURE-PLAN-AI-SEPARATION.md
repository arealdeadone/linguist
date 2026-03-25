# Architecture Plan: AI Separation + Free Hosting

## Goal

Separate AI processing from the main app so the main app can be hosted for free on the open internet, while AI processing runs on the local OrbStack server via a queue/pub-sub model.

## Constraints

- **Zero hosting cost** — Supabase free tier for DB + auth, Vercel/Cloudflare free tier for app
- **AI stays local** — Agoda GenAI Gateway is only accessible from the local network
- **Acceptable latency** — async processing with delays is OK
- **No functionality loss** — every feature must work as before, just with async AI calls

## Architecture Overview

```
┌──────────────────────────────────┐     ┌──────────────────────────┐
│  Main App (Vercel/Cloudflare)    │     │  Local AI Worker         │
│  SvelteKit + Supabase DB         │     │  (OrbStack K8s)          │
│                                  │     │                          │
│  - All UI pages                  │     │  - Agoda GenAI Gateway   │
│  - Auth (Supabase)               │     │  - TTS / STT             │
│  - SRS algorithm (pure JS)       │     │  - Lesson generation     │
│  - Lesson player (pre-generated) │     │  - Quiz generation       │
│  - Review flashcards             │     │  - Pronunciation eval    │
│  - Cost tracking reads           │     │  - Conversation AI       │
│                                  │     │  - Code-switch detection │
│  Publishes AI requests to →      │     │  - Analysis              │
│  Supabase Realtime / DB queue    │◄───►│                          │
│                                  │     │  Polls queue, processes, │
│  Subscribes to results ←         │     │  writes results back     │
└──────────────────────────────────┘     └──────────────────────────┘
```

## Queue Mechanism: Supabase DB Queue

Use Supabase's `ai_jobs` table as a job queue (no external queue service needed):

```sql
CREATE TABLE ai_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID REFERENCES learners(id),
  job_type TEXT NOT NULL,  -- 'lesson_generation', 'quiz', 'tts', 'stt', 'evaluate', 'chat', 'analysis'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index for worker polling
CREATE INDEX idx_ai_jobs_pending ON ai_jobs(status, created_at) WHERE status = 'pending';
```

### Flow

1. **Main app** inserts a row with `status: 'pending'` + input data
2. **Local worker** polls for pending jobs every 2-5 seconds
3. Worker picks up job, sets `status: 'processing'` + `started_at`
4. Worker calls Agoda GenAI Gateway
5. Worker writes result: `status: 'completed'` + output data (or `status: 'failed'` + error)
6. **Main app** polls for completed jobs or uses Supabase Realtime to get notified

### Response Mechanism

Two options (can use both):

- **Polling**: Main app periodically checks job status (simpler, works everywhere)
- **Supabase Realtime**: Subscribe to changes on `ai_jobs` table (lower latency, uses WebSocket)

## What Moves Where

### Stays in Main App (no AI dependency)

- SRS algorithm (pure math)
- Vocabulary CRUD
- Lesson playback (pre-generated data)
- Quiz playback (pre-generated questions)
- Review flashcard UI
- User management
- Cost tracking reads
- Dashboard / progress stats

### Moves to Local Worker

- `chatJSON()` / `chat()` / `chatStream()` calls
- `synthesize()` (TTS)
- `transcribe()` (STT)
- `evaluatePronunciation()`
- `detectToneErrors()`
- `detectCodeSwitches()`
- `generateLessonPlan()`
- `analyzeConversation()`

### Changes in Main App

- Lesson generation: instead of calling AI directly, insert `ai_jobs` row and wait
- Quiz generation: same pattern
- Conversation: each message becomes a job (higher latency, show "AI is thinking...")
- TTS: pre-generate and cache audio URLs in DB, not on-demand
- STT: upload audio to Supabase Storage, worker processes, writes transcript back
- Pronunciation eval: same async pattern

## Migration Strategy (TDD)

### Phase 1: BDD Tests First

Write tests that verify current behavior works:

- Lesson generation produces valid plan with vocab
- Quiz generation produces questions
- TTS returns audio
- STT returns transcript
- Pronunciation eval returns score
- Conversation streams responses
- All tests for BOTH language pairs

### Phase 2: Abstract AI Layer

Create an `AIService` interface that the app calls:

```typescript
interface AIService {
	generateLesson(params): Promise<LessonPlan>;
	generateQuiz(params): Promise<QuizData>;
	synthesize(text): Promise<Buffer>;
	transcribe(audio): Promise<string>;
	evaluate(params): Promise<EvaluationResult>;
	chat(params): AsyncGenerator<string>;
}
```

- `LocalAIService` — current implementation (direct API calls)
- `QueueAIService` — new implementation (DB queue + polling)

### Phase 3: Implement Queue Service

- Create `ai_jobs` table in Supabase
- Implement `QueueAIService` that inserts jobs and polls for results
- Implement local worker that processes jobs

### Phase 4: Migrate DB to Supabase

- Point Drizzle at Supabase PostgreSQL
- Migrate schema with `drizzle-kit push`
- Seed data
- Verify all tests pass against Supabase DB

### Phase 5: Deploy Main App

- Deploy SvelteKit to Vercel (free tier) or Cloudflare Pages (free tier)
- Point at Supabase DB
- Start local worker on OrbStack
- Verify end-to-end flow

## Free Tier Limits

| Service           | Limit               | Our Usage                   |
| ----------------- | ------------------- | --------------------------- |
| Supabase DB       | 500MB               | ~10MB (2 users, small data) |
| Supabase Auth     | 50K MAUs            | 2 users                     |
| Supabase Realtime | 200 concurrent      | 2 users                     |
| Supabase Storage  | 1GB                 | Audio files only            |
| Vercel            | 100GB bandwidth     | Minimal                     |
| Cloudflare Pages  | Unlimited bandwidth | Alternative                 |

## Latency Impact

| Feature            | Current | With Queue              |
| ------------------ | ------- | ----------------------- |
| Lesson generation  | 3-5s    | 5-10s (+ polling)       |
| Quiz generation    | 2-4s    | 4-8s                    |
| TTS playback       | 1-2s    | Pre-cached (0s) or 3-5s |
| STT transcription  | 1-3s    | 3-6s                    |
| Pronunciation eval | 2-4s    | 4-8s                    |
| Conversation reply | 2-5s    | 5-10s                   |

All within acceptable range for a learning app. UI shows clear "Processing..." states.

## Implementation Order

1. Write BDD tests for all AI-dependent features
2. Create AIService interface + LocalAIService (no behavior change)
3. Create ai_jobs table + QueueAIService
4. Create local worker (Node.js process polling Supabase)
5. Migrate DB to Supabase
6. Deploy main app to Vercel/Cloudflare
7. Run all BDD tests against production
