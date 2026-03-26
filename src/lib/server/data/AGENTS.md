# Data Layer

11 Drizzle ORM query modules. Barrel export via `index.ts`. All queries use `db` from `../db.ts` (lazy Proxy).

## MODULES

| Module             | Key Functions                                                                                                                         | Notes                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `learners.ts`      | `getAllLearners()`, `getLearnerById()`, `getLearnerBySupabaseUserId()`, `createLearner()`, `updateLearner()`                          | Auth lookup via Supabase user ID               |
| `vocabulary.ts`    | `getVocabByLearnerId()`, `getDueVocab()`, `upsertVocab()`, `updateSM2()`, `updateModalityScore()`, `getVocabCount()`, `getDueCount()` | Upsert on (learnerId, word) unique index       |
| `lessons.ts`       | `createLesson()`, `getLessonById()`, `getLessonsByLearnerId()`, `updateLessonStatus()`, `getNextPendingLesson()`                      | Plan stored as JSONB                           |
| `conversations.ts` | `createConversation()`, `getConversationById()`, `appendMessage()`, `saveAnalysis()`, `completeConversation()`                        | Messages array as JSONB                        |
| `code-switches.ts` | `upsertCodeSwitch()`, `getFrequentSwitches()`, `promoteToVocab()`                                                                     | Auto-promote after 3 uses                      |
| `quiz-results.ts`  | `saveQuizResult()`, `getQuizResultById()`, `getQuizHistory()`                                                                         | Questions/answers/srsUpdates as JSONB          |
| `ai-usage.ts`      | `insertUsageLog()`, `getCostByPeriod()`, `getAllCostPeriods()`, `getCostByUser()`, `getCostByTask()`, `getTotalCost()`                | Admin cost analytics                           |
| `tutor-prompts.ts` | `getPromptForLanguage()`, `upsertPrompt()`                                                                                            | Translated prompt sections per lesson language |
| `model-routing.ts` | `getModelForTask()`, `getAllRoutesForLanguage()`, `upsertRouting()`, `upsertRoutingBatch()`                                           | DB overrides hardcoded fallback in ai-core     |
| `languages.ts`     | `getAllLanguages()`, `getLanguageName()`, `upsertLanguage()`, `getLanguageNames()`, `invalidateLanguageCache()`                       | In-memory cache for language names             |
| `ai-jobs.ts`       | `createJob()`, `claimNextJob()`, `completeJob()`, `failJob()`, `getJobById()`, `pollJobResult()`, `recoverStaleJobs()`                | CTE claim is worker-only (not Vercel)          |

## PATTERNS

- **Upsert**: `vocabulary.ts` and `code-switches.ts` use `onConflictDoUpdate` on unique indexes
- **JSONB**: lessons.plan, conversations.messages, quiz_results.questions — flexible nested data
- **Barrel export**: `index.ts` re-exports all modules — import from `$lib/server/data`
- **Caching**: `languages.ts` caches language names in memory, call `invalidateLanguageCache()` after mutation

## RULES

- Import from `$lib/server/data` (barrel), not individual files
- NEVER use `db.execute(sql\`...\`)` with parameters on Vercel — use Drizzle query builder instead
- `claimNextJob()` CTE is the exception — worker-only, never runs on Vercel
- `upsertVocab()` must be called on lesson generation AND lesson completion
- `updateModalityScore()` must be called after SRS review, speaking, and conversation analysis
- All cost queries support flexible grouping (`?period=day|week|month`, `?groupBy=user|task|model`)
