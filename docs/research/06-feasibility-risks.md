# Feasibility Matrix & Risk Assessment

## Feature Feasibility Matrix

| # | Feature | Feasibility | Difficulty | Confidence | Notes |
|---|---|---|---|---|---|
| 1 | AI-generated lesson plans | ✅ Very achievable | Low | High | LLM generates structured JSON, well-understood pattern |
| 2 | Guided lesson flow (read/listen/speak) | ✅ Very achievable | Low-Medium | High | State machine + activity player, standard UI |
| 3 | SRS (spaced repetition) engine | ✅ Very achievable | Low | High | SM-2 is a well-documented algorithm, ~50 lines of code |
| 4 | Quizzes and revision | ✅ Very achievable | Low | High | LLM generates quiz content, multiple formats |
| 5 | Text-to-Speech (Chinese) | ✅ Verified working | Low | High | gpt-4o-mini-tts via proxy, tested |
| 6 | Text-to-Speech (Telugu) | ✅ Verified working | Low | High | gpt-4o-mini-tts via proxy, tested |
| 7 | Speech-to-Text (Chinese) | ✅ Verified working | Low | High | gpt-4o-transcribe, Simplified Chinese output |
| 8 | Speech-to-Text (Telugu) | ✅ Verified working | Low | High | gpt-4o-transcribe, perfect accuracy in tests |
| 9 | Chat conversation with AI tutor | ✅ Very achievable | Medium | High | Streaming chat via SSE, system prompt engineering |
| 10 | Spoken conversation (full loop) | ✅ Achievable | Medium | High | STT → LLM → TTS pipeline, ~3.5-6s round-trip |
| 11 | Code-switching support | ✅ Very achievable | Medium | High | LLMs handle mixed-language input well natively |
| 12 | Error correction (grammar/vocab) | ✅ Very achievable | Medium | High | LLM-based evaluation of transcriptions |
| 13 | CEFR progression tracking | ✅ Very achievable | Medium | High | Data model + gating logic, LLM calibrates content |
| 14 | Multi-user support | ✅ Achievable | Low-Medium | High | PostgreSQL per-user profiles, simple user switching |
| 15 | Chinese tone detection (homophone-based) | ✅ Achievable | Medium | Medium-High | Compare STT output to expected text, LLM flags mismatches |
| 16 | Chinese tone visualization (pitch contour) | ⚠️ Achievable but complex | High | Medium | Requires librosa/parselmouth, audio processing backend |
| 17 | Real-time tone feedback (<500ms) | ⚠️ Experimental | Very High | Low | No turnkey solution exists, significant engineering |
| 18 | PWA installable + service worker | ✅ Very achievable | Low-Medium | High | Standard PWA patterns |
| 19 | HTTPS on LAN | ✅ Achievable | Low | High | Self-signed cert, one-time setup |
| 20 | Offline lesson review | ✅ Achievable | Medium | High | Cache-first for viewed lessons |
| 21 | Writing lessons (characters/script) | ✅ Achievable | Medium | High | Later phase, canvas-based stroke input |
| 22 | Novice → C2 full journey | ✅ Structurally achievable | Low (curriculum design) | High | CEFR framework + AI-generated content scales naturally |

## Risk Assessment

### High Impact Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **LLM teaches incorrect Chinese tones via TTS** | Medium | High | Layer 1: Use gpt-4o-mini-tts with explicit pronunciation instructions. Layer 2: Consider Azure Neural TTS (zh-CN-XiaoxiaoNeural) as alternative if OpenAI quality insufficient for tone teaching. Validate TTS output for tone-critical lessons manually during curriculum authoring |
| **Telugu content quality from LLMs has errors** | Medium | High | Use Gemini (best for Telugu). Build manual correction UI for lesson content. Flag AI-generated content for review. As a Telugu speaker, the creator can validate |
| **GenAI Gateway unreachable from home network** | Low-Medium | Critical | Verify VPN access to `genai-gateway.agoda.is` early. Fallback: use personal OpenAI API key for development/testing |
| **Real human speech STT quality differs from TTS-generated test audio** | Medium | Medium | Our tests used TTS-generated audio (clean). Real learner speech will be noisier, accented, hesitant. Test with real human recordings early in development. gpt-4o-transcribe is robust, but validate |
| **Cost overrun on API usage** | Low | Medium | Implement hard token budget per session. Route aggressively to GPT-4o-mini for routine tasks. Monitor usage via gateway's audit trail |

### Medium Impact Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Model names change in gateway catalog** | Medium | Low | Abstract model names behind config. Check catalog periodically |
| **Conversation mode produces culturally inappropriate content** | Low | Medium | System prompts constrain behavior. Test with diverse scenarios |
| **SRS algorithm needs tuning for language learning** | Medium | Low | SM-2 is well-proven. Multi-modal scoring may need calibration — start with standard and iterate |
| **Chinese character rendering issues in different browsers** | Low | Low | Use standard Unicode, test across browsers. CJK fonts are widely supported |
| **Service worker caching conflicts with fresh AI content** | Low | Medium | Clear strategy: never cache AI responses, cache-first for static assets only |

### Low Impact / Accepted Risks

| Risk | Notes |
|---|---|
| Browser compatibility for MediaRecorder | Baseline since 2021, universal support |
| PostgreSQL/Redis complexity for personal app | Mitigated by OrbStack K8s — zero-ops locally, production-ready by default |
| Svelte ecosystem smaller than React | Acceptable for personal project, core functionality well-supported |

## What to Validate Early (Before Major Development)

1. **VPN access to GenAI Gateway from home network** — blocker if this doesn't work
2. **TTS tone quality for Chinese** — listen to generated audio for tone-critical words (mā/má/mǎ/mà). If insufficient, evaluate Azure Neural TTS as alternative
3. **STT accuracy on real human speech** — record yourself speaking broken Mandarin/Telugu, transcribe via gpt-4o-transcribe, assess quality
4. **Gemini quality for Telugu lesson generation** — generate 3-5 sample lessons, have a Telugu speaker verify accuracy
5. **Conversation round-trip latency** — build a minimal STT → LLM → TTS loop, measure end-to-end time on LAN

## Build Phases (Recommended)

### Phase 1: Foundation (Week 1-3)
- SvelteKit scaffold with PWA manifest + service worker
- Dockerized infrastructure: PostgreSQL + Redis on OrbStack K8s
- Database schema (Drizzle ORM migrations for learners, vocabulary, lessons)
- GenAI Gateway client wrapper (model routing, error handling)
- SM-2 SRS engine
- K8s ingress with HTTPS termination for LAN access

### Phase 2: Lesson Engine (Week 3-6)
- Lesson plan generator (Gemini → structured JSON)
- Lesson player UI (activity stepper: listen, vocab, quiz, converse)
- Basic quiz system (multiple choice, fill-in, matching)
- TTS integration (play lesson audio)

### Phase 3: Speech Pipeline (Week 6-10)
- Audio recorder component (MediaRecorder)
- STT integration (gpt-4o-transcribe)
- LLM-based pronunciation/grammar evaluation
- Chinese tone detection Layer 1 (homophone-based)
- Speaking activities in lessons

### Phase 4: Conversation Mode (Week 10-14)
- Streaming conversation UI
- Tutor persona system prompts
- Code-switch detection and handling
- Post-session analysis (words used, errors, SRS updates)
- Scenario variety

### Phase 5: Polish & Advanced (Week 14+)
- Chinese tone visualization (pitch contour, if pursuing)
- Writing mode (character/script input)
- Multi-user support
- Revision dashboards
- Offline lesson caching
- UX refinement based on actual usage
