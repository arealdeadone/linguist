# Components

15 Svelte 5 components. All use runes (`$state`, `$derived`, `$props`). No `$:` syntax.

## COMPONENTS

| Component             | Props                                                                               | Role                                                                    |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| LessonPlayer          | `plan, lessonId, learnerId, targetLanguage, lessonLanguage, allVocab, initialStep?` | Core lesson flow — all activity types inline including conversation     |
| ConversationChat      | `learnerId, scenario?, targetLanguage, onSessionEnd?`                               | SSE streaming chat with mic input, TTS auto-play                        |
| MultipleChoiceQuiz    | `questions, onComplete`                                                             | CEFR-adaptive: audio-first at A1, text at B1+                           |
| FillInBlankQuiz       | `questions, onComplete`                                                             | Sentence completion quiz for B2+                                        |
| SpeakingActivity      | `targetPhrase, romanization?, language, lessonLanguage, onComplete`                 | Record → STT → evaluate → feedback with system/user error distinction   |
| AudioPlayer           | `text, language?, size?`                                                            | TTS playback. Has `e.stopPropagation()` — safe inside clickable parents |
| AudioRecorder         | `onRecordingComplete, maxDurationMs?`                                               | MediaRecorder wrapper, auto-stop at max duration                        |
| PronunciationFeedback | `evaluation`                                                                        | Score (green/yellow/amber), feedback in lesson language, tone errors    |
| CharacterWriter       | `character, onComplete`                                                             | HanziWriter for Chinese stroke practice                                 |
| TextInput             | `expectedWord, romanization?, meaning?, onComplete`                                 | Writing practice — hides answer until submit                            |
| ConversationAnalysis  | `analysis, onDismiss`                                                               | Post-session: words correct/incorrect, code switches, focus suggestion  |
| QuizCard              | `isCorrect?, feedback?`                                                             | Quiz wrapper with amber "not quite 💡" feedback (affective filter)      |
| LevelUpCeremony       | `currentLevel, nextLevel, onDismiss`                                                | CSS confetti animation overlay                                          |
| Toast                 | (none)                                                                              | Renders from `toast.svelte.ts` store, fixed top-center                  |
| Skeleton              | `width?, height?, rounded?`                                                         | Loading placeholder                                                     |

## PEDAGOGY RULES FOR COMPONENTS

- Quiz feedback: amber 💡 "Not quite" — NEVER red X (affective filter)
- Quiz options at A1: meanings in lesson language + AudioPlayer on each
- Quiz options at B1+: target-language words with AudioPlayer
- Conversation: embedded INLINE in lesson with lesson vocab as context, NOT a separate page
- SpeakingActivity errors: 🎤 user error (no speech) vs ⚠️ system error (AI failure)
- Review words: look up from `allVocab` (full learner vocab), NEVER from `vocabulary_targets`
