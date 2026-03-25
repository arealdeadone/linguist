# Prometheus Brief — Linguist

## Project Name
Linguist

## One-Line Summary
AI-powered PWA for language learning (Chinese Mandarin + Telugu), self-hosted on LAN, using Agoda's GenAI Gateway for all AI capabilities.

## Context Documents
Read these in order before generating plans:

1. `docs/research/01-project-vision.md` — Product vision, target users, core philosophy, feature list
2. `docs/research/02-technical-architecture.md` — Tech stack (SvelteKit, PostgreSQL, Redis, OrbStack K8s), system architecture, directory structure
3. `docs/research/03-pedagogy-curriculum.md` — Learning methodology (Krashen, TPR, SRS/SM-2), CEFR curriculum, lesson schema, conversation design, error correction, code-switching
4. `docs/research/04-speech-audio-pipeline.md` — Verified STT/TTS results, audio pipeline architecture, latency budget, tone teaching approach
5. `docs/research/05-model-strategy.md` — Agoda GenAI Gateway integration, model routing table, code examples, constraints
6. `docs/research/06-feasibility-risks.md` — Feature feasibility matrix, risk assessment, early validation items, build phases

## Key Constraints

- **AI Provider**: Agoda GenAI Gateway only (`genai-gateway.agoda.is`). No personal API keys. No Google Vertex AI.
- **Hosting**: Self-hosted on creator's local machine via OrbStack Kubernetes, LAN access only. Docker + K8s available. Architecture must be cloud-portable (lift-and-shift to EKS/GKE).
- **Target Languages**: Chinese Mandarin (tonal) and Telugu (agglutinative)
- **Lesson Languages**: User-configurable instruction language. Initial pairings: Chinese taught in Hindi, Telugu taught in Thai. NOT hardcoded to English.
- **Users**: 2 (creator learning Chinese in Hindi, someone else learning Telugu in Thai)
- **Audio**: All STT via `gpt-4o-transcribe`, all TTS via `gpt-4o-mini-tts` — both verified working through the proxy
- **Models available**: GPT-4o, GPT-4o-mini, Gemini 3 Flash, Claude Sonnet (via proxy)
- **No self-hosted AI services needed** — the proxy handles everything
- **Infrastructure**: PostgreSQL (data), Redis (cache/sessions), deployed on OrbStack K8s. Docker Compose available for dev without K8s.

## Verified Technical Facts

These are not assumptions — they've been tested:

1. ✅ `gpt-4o-mini-tts` generates natural Telugu and Chinese speech via proxy
2. ✅ `gpt-4o-transcribe` transcribes Telugu with perfect accuracy via proxy
3. ✅ `gpt-4o-transcribe` transcribes Chinese to Simplified Chinese via proxy
4. ❌ `whisper-1` does NOT support Telugu (hard rejection)
5. ⚠️ `gpt-4o-mini-transcribe` outputs Traditional Chinese (not Simplified)
6. ✅ Gemini models accessible via both OpenAI SDK and Google native `genai` client
7. ❌ Gemini native TTS (`responseModalities: [AUDIO]`) does NOT work through the gateway

## What Prometheus Should Plan

Generate a detailed, phased implementation plan that covers:

1. **Project scaffolding** — SvelteKit + TypeScript + PWA + Dockerfile + K8s manifests + docker-compose.yaml
2. **Infrastructure** — PostgreSQL schema + migrations (Drizzle ORM), Redis configuration, K8s manifests (app deployment, postgres statefulset, redis, ingress with TLS)
3. **Data model** — Full schema for learners, vocabulary (with SRS state), lessons, conversations, code-switch tracking (see SQL schema in 02-technical-architecture.md)
3. **Core engine** — SM-2 SRS implementation, CEFR progression gating, GenAI client wrapper with model routing
4. **Lesson system** — AI-powered lesson generation, lesson player UI, activity types
5. **Audio pipeline** — MediaRecorder capture, STT proxy, TTS proxy, audio playback
6. **Conversation system** — Streaming chat, tutor personas, error correction, code-switch handling, post-session analysis
7. **Quiz/review system** — Multiple quiz formats, SRS-integrated review
8. **Chinese tone features** — Homophone-based detection, optional pitch visualization
9. **PWA configuration** — Service worker, manifest, HTTPS on LAN, caching strategies
10. **Multi-user** — User profiles, switching, per-user progress

Plans should respect the build phase ordering in `06-feasibility-risks.md` and the pedagogical design in `03-pedagogy-curriculum.md`.

## Non-Goals (Do Not Plan)

- Mobile native apps (it's a PWA)
- Cloud deployment (LAN-only for now, but architecture must be cloud-portable)
- User authentication (no Okta, no OAuth — simple local user switching)
- Self-hosted ML models (the proxy handles everything)
- Handwriting recognition (writing mode uses structured input, not freeform stroke recognition)
- Social features, leaderboards, gamification streaks
