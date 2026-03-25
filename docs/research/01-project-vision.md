# Linguist — Project Vision & Overview

## What Is This

An AI-powered Progressive Web App for language learning, self-hosted on a local machine and accessed over LAN. It leverages Generative AI to create personalized lesson plans, guide users through structured and conversational learning, and progress them from absolute beginner to native-level fluency.

## Target Languages (Initial)

- **Chinese Mandarin** — tonal language, simplified characters, pinyin romanization
- **Telugu** — Dravidian, agglutinative morphology, 52-character script

## Who It's For

- The creator (polyglot: Hindi, English, Telugu, Oriya, Punjabi, Thai intermediate, Japanese intermediate) learning Chinese **in Hindi**
- Someone the creator is teaching Telugu **in Thai**

## Lesson Language (Instruction Language)

The language used to teach/explain is **user-configurable**, not hardcoded to English. Initial pairings:

| Learner | Target Language | Lesson Language (instruction in) |
|---|---|---|
| Creator | Chinese Mandarin | Hindi |
| Other user | Telugu | Thai |

This means all AI-generated content (lesson explanations, grammar notes, conversation corrections, quiz instructions) must be produced in the learner's chosen lesson language. The system prompts, TTS voice selection, and UI copy must adapt accordingly.

## Core Philosophy (Creator's Language Learning Principles)

These are hard-won insights from learning 7+ languages. They override generic textbook approaches:

1. **Vocabulary before grammar** — Words unlock expression. Grammar structures emerge naturally from repeated exposure. Explicit grammar teaching comes later (B1+).
2. **No translation to a root language** — The mind should form direct visual/conceptual associations with the target language word. "吃饭" → image of eating, NOT "吃饭 → eat".
3. **Listening first, with action association (TPR)** — Hearing native speech while observing/imagining the action. This builds neural pathways between sound and meaning without L1 mediation.
4. **Native speech + colloquial phrases alongside textbook** — Real language includes slang, contractions, cultural phrases. Textbook-only creates a gap between what you learn and what natives say.
5. **Speaking is 100x harder than understanding** — The app must force production early, even if broken. Understanding is passive; speaking requires active recall.
6. **Mixed-language speaking is OK and encouraged** — Saying "我 want to 吃 noodles" is a valid step. The app should understand intent, model the correct form, and track which L1 gap-fillers become vocabulary targets.
7. **Writing comes later** — Not in early phases. For Chinese: recognize characters passively first, write at A2+. For Telugu: script after spoken foundation.

## Product Vision

### The Learning Journey: A1 → C2

The app structures the entire journey from "zero knowledge" to "people think you're a native speaker". This maps to the CEFR framework:

| Level | What the learner can do | App focus |
|---|---|---|
| A1 | Basic greetings, numbers, core objects | TPR vocab, listening to slow native speech, image association |
| A2 | Simple daily transactions, describe routine | Short dialogues, colloquial phrases, first speaking practice |
| B1 | Travel, opinions, simple narratives | Conversation practice, mixed topics, error correction begins |
| B2 | Abstract topics, nuanced expression | Native-speed content, debate, idioms |
| C1 | Professional fluency, subtle humor | Near-native conversation, cultural nuance |
| C2 | Native-equivalent | Literature, slang, regional variation, mastery |

### Core Features

1. **AI-Generated Lesson Plans** — Structured lessons calibrated to learner's current level (i+1). Each lesson includes vocabulary, listening, speaking activities, a colloquial phrase, and cultural context.
2. **Guided Lesson Flow** — Step-by-step lesson player with activities: listen, repeat, answer, converse. Lessons can be read, listened to, or spoken through.
3. **Conversation Mode** — Open-ended spoken or chat conversation with an AI tutor. The tutor has a persona, follows a scenario, and provides gentle error correction via recasting.
4. **Code-Switching Support** — Learner can respond in target language, a mix of target + lesson language, or admit they don't know. The app understands all three and responds appropriately. Code-switching detection must handle non-English lesson languages (e.g., Hindi words mixed into Chinese speech, Thai words mixed into Telugu speech).
5. **Spaced Repetition (SRS)** — SM-2 algorithm tracks every vocabulary item across modalities (listening recognition, speaking recall, contextual use). Due items are woven into lessons and conversations naturally.
6. **Revision & Quizzes** — Multiple choice, fill-in, matching, listening comprehension. Feeds SRS scores.
7. **Tone Teaching (Chinese)** — Dedicated tone drills, pitch contour visualization, and homophone-based error detection from transcriptions.
8. **Multi-User Support** — At minimum two users: the creator (learning Chinese) and someone being taught Telugu.

### Non-Functional Requirements

- **PWA** — Installable, works on any device with a modern browser
- **LAN-only hosting** — Runs on creator's machine, accessed over local network
- **No external auth** — Simple, maybe PIN-based user switching
- **Data persistence** — Learner progress, SRS state, conversation history stored locally
- **Cost-efficient** — Uses Agoda GenAI proxy (no personal API keys needed), routes to cheap models for routine tasks
