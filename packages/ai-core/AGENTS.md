# AI Core (Shared Package)

Monorepo package (`@linguist/ai-core`) shared between main app and worker. Single source of truth for schema + constants.

## EXPORTS (`src/index.ts`)

| Export                      | Type                    | Notes                                                                                                    |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `MODEL_ROUTING`             | `Record<TaskType, ...>` | Hardcoded fallback — DB `model_routing` table overrides                                                  |
| `TaskType`                  | Type                    | 7 task types: lesson_generation, conversation, grammar_evaluation, flashcard, quiz, summary, code_switch |
| `AIJobType`                 | Type                    | 11 job types for async worker queue                                                                      |
| `CefrLevel`                 | Type                    | `'A1' \| 'A2' \| 'B1' \| 'B2' \| 'C1' \| 'C2'`                                                           |
| `ChatOptions`               | Interface               | temperature, max_tokens, stream, onUsage callback                                                        |
| `TranscriptionResult`       | Interface               | text + language                                                                                          |
| `STT_MODEL`                 | Const                   | `gpt-4o-transcribe`                                                                                      |
| `TTS_MODEL`                 | Const                   | `gpt-4o-mini-tts`                                                                                        |
| `TTS_VOICE`                 | Const                   | `coral`                                                                                                  |
| `MAX_NEW_VOCAB_PER_SESSION` | Const                   | A1:5, A2:7, B1:10, B2:12, C1:15, C2:20                                                                   |
| `SESSION_TIME_ALLOCATION`   | Const                   | vocab_tpr:25%, listening:15%, speaking:30%, srs:20%, cultural:10%                                        |
| `TTS_CACHE_TTL_SECONDS`     | Const                   | 7 days                                                                                                   |
| `GENAI_BASE_URL`            | Const                   | `https://api.openai.com/v1`                                                                              |

## SCHEMA (`src/schema.ts` — 11 tables)

| Table           | Key Columns                                                               | Relationships                        |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| `learners`      | id, name, targetLanguage, lessonLanguage, cefrLevel, supabaseUserId       | → vocabulary, lessons, conversations |
| `vocabulary`    | id, learnerId, word, romanization, cefrLevel, SM-2 fields, modalityScores | ← learners                           |
| `lessons`       | id, learnerId, cefrLevel, week, day, theme, plan (JSONB), status          | ← learners                           |
| `conversations` | id, learnerId, lessonId, scenario, messages (JSONB), analysis             | ← learners, → code_switches          |
| `code_switches` | id, conversationId, gapWord, targetEquiv, timesUsed, promotedToVocab      | ← conversations                      |
| `quiz_results`  | id, learnerId, lessonId, questions, answers, score, srsUpdates            | ← learners, ← lessons                |
| `ai_usage_logs` | id, learnerId, task, model, inputTokens, outputTokens, costUsd            | ← learners                           |
| `tutor_prompts` | id, lessonLanguage, sections (JSONB)                                      | Standalone                           |
| `model_routing` | id, language, task, model                                                 | Standalone                           |
| `ai_jobs`       | id, jobType, status, input, output, error, workerId, attempts             | Worker queue                         |
| `languages`     | code, name                                                                | Lookup table                         |

## RULES

- Schema defined ONCE here — app re-exports via `src/lib/server/schema.ts`, worker via `worker/src/schema.ts`
- NEVER define tables in app or worker directly
- `MODEL_ROUTING` is fallback only — DB `model_routing` table is source of truth
- After schema changes: run `npm run db:generate` then `npm run db:push` (or `db:migrate` for production)
- Both app and worker depend on `@linguist/ai-core: "*"` (workspace link)
