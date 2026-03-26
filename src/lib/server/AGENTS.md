# Server Layer

Backend services for AI, database, SRS, speech, cost tracking, and lesson generation.

## WHERE TO LOOK

| Task                   | File                                             | Notes                                                             |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Get AI service         | `ai-service/index.ts` → `getAIService()`         | Returns LocalAIService or QueueAIService based on AI_MODE env     |
| Call LLM               | `ai.ts` → `chat()`, `chatJSON()`, `chatStream()` | Throws `AIError` on failure. Pass `onUsage` for cost tracking     |
| Route model            | `ai.ts` → `routeModel(task, lang)`               | DB-backed cache (`model_routing`) with hardcoded zh/te fallback   |
| Transcribe audio       | `ai.ts` → `transcribe(file, lang)`               | Pass original `File` from formData, never Buffer→File             |
| Generate speech        | `ai.ts` → `synthesize(text, instructions?)`      | Returns `Buffer`, cache via `redis.ts`                            |
| Pre-generate TTS CDN audio | `tts-storage.ts`                            | Dedupes by hash and uploads public MP3 to Supabase Storage        |
| Supabase admin client  | `supabase-admin.ts` → `getSupabaseAdmin()`       | Uses `SUPABASE_SECRET_KEY` for user management                    |
| Evaluate pronunciation | `pronunciation.ts`                               | Returns score=-1 + `systemError` on AI failure                    |
| Detect tone errors     | `tones.ts`                                       | Chinese only, graceful fallback                                   |
| Generate lesson        | `lessons.ts`                                     | Prompt includes i+1 ratio, time allocation, TPR rules             |
| Check progression      | `progression.ts`                                 | Thresholds per CEFR level                                         |
| Analyze conversation   | `analysis.ts`                                    | Updates SM-2 + modality scores + contextual usage                 |
| SM-2 review            | `srs.ts`                                         | Pure function, no DB. listening=3, speaking=4, contextual=5       |
| Build tutor prompt     | `prompts/tutor.ts`                               | DB-backed translated prompt sections with placeholder rendering   |
| Base tutor template    | `prompts/base-template.ts`                       | Canonical English template translated for new lesson languages    |
| Translate tutor prompt | `prompts/translate-prompt.ts`                    | GPT-4o translation preserving placeholders + language labels      |
| Test language pair     | `language-tester.ts`                             | TTS -> STT -> evaluation round-trip with viability recommendation |
| Track AI cost          | `cost-tracker.ts`                                | `trackUsage()` with per-model pricing for all 6 models            |
| DB queries             | `data/*.ts`                                      | 10 modules, includes `data/model-routing.ts` and tutor prompts    |
| Cache TTS              | `redis.ts`                                       | 7-day TTL, SHA-256 key                                            |
| File type detection    | `ai.ts`                                          | Uses `magic-bytes.js`, not hand-rolled                            |

## SCHEMA (11 tables — defined in packages/ai-core/src/schema.ts)

`learners` → `vocabulary` (1:many), `lessons` (1:many), `conversations` (1:many)
`conversations` → `code_switches` (1:many)
`quiz_results` ← `lessons` (optional FK)
`ai_usage_logs` ← `learners` (optional FK, for cost tracking)
`tutor_prompts` stores translated tutor prompt sections per lesson language
`model_routing` stores per-language model routing by AI task
`ai_jobs` queue table for async AI processing (worker polls this)
`languages` lookup table for supported language codes/names

Schema is defined ONCE in `packages/ai-core/src/schema.ts`. Both app (`src/lib/server/schema.ts`) and worker (`worker/src/schema.ts`) re-export from `@linguist/ai-core/schema`. NEVER define tables locally.

## CRITICAL RULES

- `chatJSON` with Claude: skip `response_format`, append JSON instruction
- Model routing source of truth is DB `model_routing`; hardcoded `MODEL_ROUTING` is fallback only
- `AIError` class: `isSystemFailure` flag distinguishes AI failure from user error
- `transcribe()`: pass original `File` from formData — never Buffer→File conversion
- `updateModalityScore()`: must be called after SRS review, speaking, and conversation analysis
- `upsertVocab()`: must be called on lesson generation AND lesson completion
- All LLM feedback text: must be in the learner's configured `lessonLanguage` — never assume or hardcode a specific language
- All AI calls: pass `onUsage` callback for cost tracking
