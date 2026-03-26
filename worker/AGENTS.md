# AI Worker

Standalone Node.js process that polls `ai_jobs` table and processes AI tasks. Deployed to OrbStack K8s, separate from main Vercel app.

## STRUCTURE

```
worker/
├── src/
│   ├── index.ts              # Entry point: starts poller, handles SIGTERM/SIGINT
│   ├── config.ts             # Env config (poll interval, concurrency, stale timeout)
│   ├── poller.ts             # CTE-based job claiming + stale recovery loop
│   ├── processor.ts          # Job type dispatcher (11 job types → LocalAIService)
│   ├── local-ai-service.ts   # AIService implementation (mirrors app's local.ts)
│   ├── ai.ts                 # Core AI client (chat, chatJSON, transcribe, synthesize)
│   ├── db.ts                 # Direct Drizzle connection (NOT lazy Proxy — worker is persistent)
│   ├── redis.ts              # Redis TTS cache
│   ├── schema.ts             # Re-export from @linguist/ai-core/schema
│   ├── types.ts              # Worker-specific type definitions
│   ├── data/                 # 9 Drizzle query modules (no ai-jobs — poller handles directly)
│   ├── prompts/              # Tutor prompt generation + translation
│   ├── srs.ts, tones.ts, pronunciation.ts, lessons.ts, analysis.ts, code-switch-detector.ts
│   └── language-tester.ts    # STT↔TTS round-trip viability testing
├── Dockerfile                # 3-stage node:22-alpine build
├── package.json              # @linguist/worker, depends on @linguist/ai-core
└── tsconfig.json
```

## JOB FLOW

1. **Poller** (`poller.ts`) runs every `POLL_INTERVAL_MS` (default 2s)
2. Claims pending job via CTE: `SELECT ... FOR UPDATE SKIP LOCKED` → sets `status='processing'`
3. **Processor** (`processor.ts`) dispatches to `LocalAIService` method by job type
4. On success: `status='completed'`, output stored as JSONB
5. On failure: `status='failed'`, error message stored
6. **Stale recovery**: every 30 polls, resets jobs stuck in `processing` > `STALE_JOB_MINUTES`

## JOB TYPES (11)

| Type                 | Processor Function         | Input → Output                                    |
| -------------------- | -------------------------- | ------------------------------------------------- |
| `lesson_generation`  | `processLessonGeneration`  | learnerId, week, day → LessonPlan                 |
| `quiz`               | `processQuizGeneration`    | learnerId, quizType, cefrLevel → quiz questions   |
| `tts`                | `processTTS`               | text → base64 audio                               |
| `stt`                | `processSTT`               | base64 audio, language → text                     |
| `pronunciation_eval` | `processPronunciation`     | transcript, expected, language → score + feedback |
| `tone_detection`     | `processToneDetection`     | transcript, expected → tone errors                |
| `conversation`       | `processConversation`      | learnerId, message, scenario → response           |
| `analysis`           | `processAnalysis`          | conversationId, learnerId → analysis + SRS        |
| `code_switch`        | `processCodeSwitch`        | message, languages → detected switches            |
| `prompt_translation` | `processPromptTranslation` | targetLanguageCode/Name → translated sections     |
| `language_test`      | `processLanguageTest`      | target/source languages → viability report        |

## CONFIG (env vars)

| Variable              | Default                     | Notes               |
| --------------------- | --------------------------- | ------------------- |
| `DATABASE_URL`        | (required)                  | Supabase pooler URL |
| `REDIS_URL`           | (required)                  | Redis for TTS cache |
| `GENAI_API_KEY`       | (required)                  | AI Gateway key      |
| `GENAI_BASE_URL`      | `https://api.openai.com/v1` | AI Gateway base URL |
| `POLL_INTERVAL_MS`    | `2000`                      | Poll frequency      |
| `MAX_CONCURRENT_JOBS` | `3`                         | Parallel job limit  |
| `STALE_JOB_MINUTES`   | `5`                         | Recovery threshold  |

## COMMANDS

```bash
npm run dev    # tsx watch src/index.ts (hot reload)
npm run start  # tsx src/index.ts (production)
npm run check  # tsc --noEmit
```

## RULES

- Worker uses **direct DB connection** (NOT lazy Proxy) — it's a persistent process, not serverless
- `db.execute(sql\`...\`)`with CTE is fine here — worker doesn't use Supabase pooler's`prepare: false`
- Schema re-exported from `@linguist/ai-core/schema` — NEVER define tables locally
- TTS/STT pass audio as base64 strings through ai_jobs JSONB (not binary)
- Worker mirrors app's LocalAIService — changes to app AI logic should be reflected here
- Cost tracking via `onUsage` callback in every AI call — same as app
