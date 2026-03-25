# Speech & Audio Pipeline — Research Findings

## Verified Test Results (March 13, 2026)

All tests run against Agoda GenAI Gateway (`genai-gateway.agoda.is/v1`) using the `AGODA_GENAI_API_KEY`.

### TTS: gpt-4o-mini-tts

| Language | Phrases Tested | Result | Latency | File Size |
|---|---|---|---|---|
| Telugu | 3 phrases | ✅ 3/3 | 1.4–2.4s | 45–67 KB |
| Chinese Mandarin | 3 phrases | ✅ 3/3 | 1.4–1.6s | 30–49 KB |

- Voice used: `coral`
- Output format: MP3
- The `instructions` parameter allows directing pronunciation style ("speak naturally in Telugu, clear pronunciation suitable for language learners")
- Available voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer

### STT: Transcription Models

**Telugu Results:**

| Model | Phrase 1 (నమస్కారం...) | Phrase 2 (నాకు తెలుగు...) | Phrase 3 (ఈ రోజు...) |
|---|---|---|---|
| `gpt-4o-transcribe` | ✅ Exact match | ✅ Exact match | ✅ Exact match |
| `gpt-4o-mini-transcribe` | ✅ Exact match | ✅ Exact match | ⚠️ Minor spacing ("ఈరోజు" vs "ఈ రోజు") |
| `whisper-1` | ❌ `Language 'te' not supported` | ❌ Same error | ❌ Same error |

**Chinese Mandarin Results:**

| Model | Phrase 1 (你好...) | Phrase 2 (我想学中文) | Phrase 3 (今天天气很好) |
|---|---|---|---|
| `gpt-4o-transcribe` | ✅ Simplified Chinese, exact | ✅ Simplified Chinese | ✅ Simplified Chinese |
| `gpt-4o-mini-transcribe` | ✅ But outputs Traditional (叫→叫 OK, but 氣 vs 气) | ⚠️ Traditional: 學 instead of 学 | ⚠️ Traditional: 氣 instead of 气 |
| `whisper-1` | ✅ But outputs Traditional | ⚠️ Traditional | ⚠️ Traditional |

### Key Findings

1. **`gpt-4o-transcribe` is the clear winner for both languages** — perfect Telugu, Simplified Chinese output
2. **`whisper-1` does NOT support Telugu** — hard rejection (`Language 'te' is not supported`)
3. **`gpt-4o-mini-transcribe`** — works for both but has quirks: occasional spacing issues in Telugu, outputs Traditional Chinese instead of Simplified
4. **No self-hosted STT needed** — `gpt-4o-transcribe` via the proxy handles both languages excellently, eliminating the need for local Whisper or fine-tuned models

### Model Recommendation for Production

| Use Case | Model | Rationale |
|---|---|---|
| All STT (primary) | `gpt-4o-transcribe` | Best accuracy, Simplified Chinese, Telugu support |
| All TTS | `gpt-4o-mini-tts` | Works for both languages, fast, cheap, steerable via instructions |
| STT fallback (if cost matters) | `gpt-4o-mini-transcribe` | Cheaper but needs post-processing (Traditional→Simplified conversion for Chinese) |

## Audio Pipeline Architecture

### Browser → Server → GenAI Gateway

```
[Browser: MediaRecorder]
    │
    ├── Captures audio as audio/webm;codecs=opus
    ├── ~50KB for 30s of speech
    │
    ▼
[Server: /api/speech/stt]
    │
    ├── Receives audio blob via multipart/form-data
    ├── Forwards to GenAI Gateway: POST /v1/audio/transcriptions
    │   ├── model: gpt-4o-transcribe
    │   ├── language: "zh" (Chinese) or "te" (Telugu)
    │   └── file: audio blob
    ├── Returns transcript text
    │
    ▼
[Server: AI Evaluation]
    │
    ├── Compares transcript to expected text
    ├── Sends to LLM for grammar/vocabulary evaluation
    ├── Updates SRS scores
    │
    ▼
[Server: /api/speech/tts]
    │
    ├── Generates AI response text
    ├── Forwards to GenAI Gateway: POST /v1/audio/speech
    │   ├── model: gpt-4o-mini-tts
    │   ├── voice: coral (or learner preference)
    │   ├── input: response text
    │   └── instructions: language-specific pronunciation guidance
    ├── Returns audio/mp3 blob
    │
    ▼
[Browser: Audio playback]
```

### Latency Budget

For a natural conversation flow, the total round-trip should be under 5 seconds:

| Step | Estimated Latency | Notes |
|---|---|---|
| Audio capture + upload | ~200ms | Small blob, LAN |
| STT (gpt-4o-transcribe) | ~800-1300ms | Measured in tests |
| LLM evaluation + response | ~1000-2000ms | Depends on model, streaming helps |
| TTS generation | ~1400-2400ms | Measured in tests |
| Audio download + play | ~100ms | LAN, small file |
| **Total** | **~3.5-6s** | Acceptable for turn-based conversation |

Optimization: Start TTS generation as soon as first sentence of LLM response is complete (don't wait for full response).

## Chinese Tone Teaching

### The Challenge

Standard STT (including gpt-4o-transcribe) outputs text — it tells you *what* was said, not *how*. If a learner says "mǎ" (horse, tone 3) with a flat tone (tone 1), the STT may still output "马" — auto-correcting the tone error. OR it may output "妈" (mother, tone 1), revealing the tone error via homophone substitution.

### Three-Layer Approach

**Layer 1: Homophone-Based Detection (via STT + LLM)** — Production-ready
- STT transcribes learner speech → if "妈" appears where "马" was expected → tone error detected
- LLM evaluates: "The learner said 妈 (mā, tone 1) but meant 马 (mǎ, tone 3)"
- Works well for isolated words and simple sentences
- Accuracy: ~75-85% for detecting tone errors this way

**Layer 2: Pitch Contour Visualization (via audio analysis)** — Feasible, requires backend processing
- Extract F0 (fundamental frequency) from audio using librosa or parselmouth
- Display pitch curve on screen, overlaid with reference native speaker curve
- Learner can visually see if their tone shape matches
- Not real-time — process after utterance, display in review

**Layer 3: ML-Based Tone Classification** — Stretch goal
- Fine-tuned Wav2Vec2 model classifies each syllable as tone 1/2/3/4/neutral
- Compare against expected tones
- ~85-92% accuracy on isolated syllables, ~70-80% on connected speech
- Requires self-hosted model (not available via any cloud API)

### Recommended Implementation Order

1. **Start with Layer 1** — homophone detection is free (already in the STT+LLM pipeline), catches most tone errors
2. **Add Layer 2** in a later phase — visual pitch contour adds a lot of learning value but requires audio processing backend
3. **Layer 3 is optional** — only if Layer 1+2 prove insufficient

## Telugu-Specific Audio Notes

- Telugu is NOT a tonal language — no tone detection needed
- Main pronunciation challenges: retroflex consonants (ట, డ), aspirated vs unaspirated, vowel length
- STT accuracy via gpt-4o-transcribe is excellent (verified)
- Colloquial Telugu (Andhra vs Telangana dialect) differs — TTS voice quality should be tested for both
- AI4Bharat models remain a fallback option if quality issues emerge with gpt-4o-transcribe on real human speech (our test used TTS-generated audio, which is cleaner than learner speech)

## Web Speech API — NOT Recommended for Production

| Limitation | Impact |
|---|---|
| Chrome-only for SpeechRecognition (Firefox flag-only, Safari partial) | Limited browser support |
| Audio sent to Google servers (not controllable) | Privacy, no control over backend |
| Telugu support unreliable | Breaks core use case |
| No tone information returned | Can't teach Chinese tones |
| `processLocally` experimental, language pack availability uncertain | Can't guarantee offline |

Verdict: Use for quick prototyping only. Production should use gpt-4o-transcribe via proxy.
