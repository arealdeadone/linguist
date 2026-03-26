# Routes

13 pages + 27 API endpoints + admin console. SvelteKit file-based routing.

## PAGES

| Route                  | Server Load                                     | Key Behavior                                                                |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `/`                    | Current learner dashboard                       | Requires Supabase Auth session, redirects to /login if not authenticated |
| `/dashboard`           | Aggregates vocab/lesson/quiz/conversation stats | CSS-only charts, mastery tiers                                              |
| `/learn`               | Lessons by learnerId                            | Generate + list lessons, status badges                                      |
| `/learn/[id]`          | Lesson by id + learnerId + allVocab             | Reads `?step=` for resume, clears param on mount                            |
| `/review`              | Due vocab + all vocab + counts                  | Audio from CDN (pre-generated), localized quality labels, "Practice All"    |
| `/write`               | Due vocab for writing                           | CharacterWriter (zh) or TextInput (te)                                      |
| `/converse`            | Learner + scenarios                             | Scenario selection → inline ConversationChat                                |
| `/login`               | Form actions (`login`, `logout`)                | Supabase email/password + hCaptcha for all users (admin + learners)         |
| `/admin`               | Stats + costs + learners                        | Dark theme, CSS bar charts, Supabase auth guard                             |
| `/admin/users`         | All learners + enriched stats                   | Add/reset/delete users                                                      |
| `/admin/lessons`       | Learner-scoped lesson management                | List/delete/regenerate lessons, generate new lesson                         |
| `/admin/language-test` | Client-side test runner                         | Runs STT↔TTS round-trip tests and can add viable language pairs             |

## API ENDPOINTS

| Endpoint                                              | Methods       | Notes                                                            |
| ----------------------------------------------------- | ------------- | ---------------------------------------------------------------- |
| `/api/health`                                         | GET           | Checks PostgreSQL + optional Redis + ai_jobs queue depth, returns 200/503 |
| `/api/jobs/[id]`                                      | GET           | Poll queued AI job status/output by ID                           |
| `/api/profile`                                        | GET           | Returns current learner profile (from Supabase session)          |
| `/api/profile/[id]`                                   | GET, PATCH    | Admin-accessible learner profile by ID                           |
| `/api/lessons`                                        | GET, POST     | POST generates via AI + pre-gens TTS/quiz + persists vocab       |
| `/api/lessons/[id]`                                   | GET, PATCH    | PATCH completed → also upserts vocab                             |
| `/api/srs`                                            | GET, POST     | GET supports `?all=true` for all vocab. POST accepts `modality`  |
| `/api/srs/stats`                                      | GET           | Card counts                                                      |
| `/api/quiz`                                           | POST          | Accepts `cefrLevel` for CEFR-adaptive quiz generation            |
| `/api/quiz/submit`                                    | POST          | Updates SRS scores per answer                                    |
| `/api/speech/tts`                                     | POST          | Redis-cached, auto-detects language for TTS instructions         |
| `/api/speech/stt`                                     | POST          | Pass `File` from formData directly — never Buffer→File           |
| `/api/speech/evaluate`                                | POST          | Returns score=-1 + systemError on AI failure                     |
| `/api/chat`                                           | POST          | JSON response (non-streaming): `{ response, conversationId }`   |
| `/api/chat/end`                                       | POST          | Marks conversation complete                                      |
| `/api/chat/analyze`                                   | POST          | Post-session analysis, updates SRS + modality                    |
| `/api/chat/code-switch`                               | POST          | Code-switch detection                                            |
| `/api/progression`                                    | GET, POST     | GET checks readiness, POST promotes level                        |
| `/admin/api/stats`                                    | GET           | Learner count, language pairs, costs                             |
| `/admin/api/costs`                                    | GET           | `?period=day\|week\|month`, `?groupBy=user\|task`                |
| `/admin/api/users`                                    | GET, POST     | List enriched users, create new                                  |
| `/admin/api/users/[id]`                               | DELETE, PATCH | Cascade delete, update CEFR level                                |
| `/admin/api/users/[id]/reset`                         | POST          | Reset progress to A1, keep profile                               |
| `/admin/api/users/[id]/lessons`                       | GET           | List learner lessons with per-lesson vocab count                 |
| `/admin/api/users/[id]/lessons/[lessonId]`            | DELETE        | Delete lesson + vocab unique to that lesson                      |
| `/admin/api/users/[id]/lessons/[lessonId]/regenerate` | POST          | Rebuild lesson with same week/day                                |
| `/admin/api/language-test`                            | POST          | Run language-pair viability test summary                         |
| `/admin/api/language-test/add-pair`                   | POST          | Add viable language pair into constants + generate tutor prompts |

## RULES

- All page server loads: `depends('data:learner')` for cache invalidation
- All POST/PATCH handlers: wrap in try/catch, return `json({ error }, { status })` on failure
- All learner API endpoints: derive `learnerId` from `event.locals.learnerId` (Supabase session), NEVER from query params or body
- STT endpoint: pass original `File` object to `transcribe()`, never convert Buffer→File
- Admin routes: protected by Supabase Auth in `hooks.server.ts` (checks `ADMIN_SUPABASE_USER_ID`)
- App routes: redirect to `/login` if no Supabase session
- Tests: use `X-Test-Learner-Id` header for auth bypass (only when `TEST_MODE=true`)
