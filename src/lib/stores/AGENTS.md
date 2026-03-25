# Stores

6 Svelte 5 rune stores. All use `.svelte.ts` extension. NEVER use `writable`/`readable` from `svelte/store`.

## STORES

| Store               | State                                       | Key Functions                                                                    |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `learner.svelte.ts` | `activeLearner`                             | `getActiveLearner()`, `setActiveLearner()`, `loadLearner(id)`, `clearLearner()`  |
| `lesson.svelte.ts`  | `activeLesson`                              | `startLesson()`, `getCurrentActivity()`, `nextActivity()`, `getLessonProgress()` |
| `chat.svelte.ts`    | `messages`, `isStreaming`, `conversationId` | `sendMessage()`, `sendAudioMessage()`, `initiateConversation()`, `endSession()`  |
| `audio.svelte.ts`   | `isRecording`, `isPlaying`, `audioBlob`     | `startRecording()`, `stopRecording()`, `playTTS()`, `resetAudio()`               |
| `toast.svelte.ts`   | `toasts[]`                                  | `showToast(msg, type, duration?)` — types: error, success, info                  |
| `network.svelte.ts` | `isOnline`                                  | `getNetworkStatus()` — listens to online/offline events                          |

## RULES

- Export functions, not raw `$state` — consumers call `getX()` to read
- `showToast()` is the ONLY way to surface errors to users — import from `$lib/stores/toast.svelte`
- `loadLearner()` rehydrates from API — called in `+layout.svelte` on mount when cookie exists but store is empty
- `chat.svelte.ts` filters `[START]` messages from display — used for AI-initiated conversations
- `chat.svelte.ts` auto-plays TTS for every new assistant message via `lastAutoPlayedIndex` tracking
