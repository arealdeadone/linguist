# Model Strategy & Agoda GenAI Gateway Integration

## Gateway Overview

The **GenAI Gateway** (formerly "OpenAI Proxy") is Agoda's unified reverse proxy for multiple AI providers. Single API key, single base URL, access to OpenAI, Anthropic Claude, Google Gemini, and more.

### Endpoints

| Endpoint | Purpose | Client |
|---|---|---|
| `https://genai-gateway.agoda.is/v1` | OpenAI-compatible API (chat, audio, embeddings) | OpenAI SDK |
| `https://genai-gateway.agoda.is/gemini` | Google-native Gemini API (batch, video, file processing) | `google-genai` SDK |

Both endpoints use the same API key from `AGODA_GENAI_API_KEY`.

### Authentication

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["AGODA_GENAI_API_KEY"],
    base_url="https://genai-gateway.agoda.is/v1"
)
```

```python
from google import genai

client = genai.Client(
    api_key=os.environ["AGODA_GENAI_API_KEY"],
    http_options={"base_url": "https://genai-gateway.agoda.is/gemini"}
)
```

### Confirmed Available Providers

| Provider | Models Confirmed | Access Path |
|---|---|---|
| **OpenAI** | GPT-4o, GPT-4o-mini, gpt-4.1, o1/o3/o4-mini, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-mini-tts, whisper-1 | `/v1` |
| **Google Gemini** | gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3-flash-preview | `/v1` (OpenAI-compat) or `/gemini` (native) |
| **Anthropic Claude** | Claude models via Bedrock | `/v1` |

Full live catalog: Model Catalog at `docs.agodadev.io/pages/llmops/openai-proxy/`

### Confirmed Audio Endpoints

| Endpoint | Models | Status |
|---|---|---|
| `/v1/audio/transcriptions` | gpt-4o-transcribe, gpt-4o-mini-transcribe, whisper-1 | ✅ Verified working |
| `/v1/audio/speech` | gpt-4o-mini-tts | ✅ Verified working (in production at Agoda — TravelBrief uses it) |
| Gemini native TTS (`responseModalities: [AUDIO]`) | gemini-2.5-flash-preview-tts | ❌ NOT compatible with gateway's OpenAI protocol |

### What Is NOT Available

- Google Vertex AI models (explicitly excluded per user constraint)
- Gemini native audio TTS via `responseModalities: [AUDIO]` (protocol incompatibility with gateway)
- GPT-4o Realtime API (WebSocket-based) — proxy support varies, needs verification

## Model Capabilities for Language Tutoring

### Chinese Mandarin

| Model | Chinese Quality | Best For |
|---|---|---|
| **Gemini 3 Flash** | Excellent (score 93-94 on multilingual benchmarks) | Lesson generation, conversation — fast and cheap |
| **Claude Sonnet** | Excellent (score 92-94) | Grammar evaluation, structured feedback |
| **GPT-4o** | Excellent (COMET 0.814 for translation) | Conversation, colloquial Chinese |
| **GPT-4o-mini** | Good | Flashcards, drills, simple quiz generation |

GPT-4o is slightly better at colloquial Chinese (uses natural phrasing like "App" instead of formal "应用程序"). Claude has better long-form consistency. Gemini is the best value (fast, cheap, high quality).

### Telugu

| Model | Telugu Quality | Notes |
|---|---|---|
| **Gemini** | Best available | Outperforms GPT on grammar, vocabulary, cultural nuance, creative tasks (study: Kishore & Shaik, 2024) |
| **GPT-4o** | Good | Better at factual recall, weaker on grammar |
| **Claude Sonnet** | Good | Comparable to GPT-4o |
| **GPT-4o-mini** | Acceptable | OK for simple drills, not for complex content |

**Critical finding**: Gemini is the best model for Telugu, and you HAVE access to it via the proxy. This was previously a concern.

## Task-to-Model Routing Strategy

### Routing Table

| Task | Model | Rationale | Cost Tier |
|---|---|---|---|
| Lesson plan generation | Gemini 3 Flash | Best multilingual quality, cheap, fast | $ |
| Conversation practice (Chinese) | GPT-4o or Gemini 3 Flash | Test both, pick based on naturalness | $$ |
| Conversation practice (Telugu) | Gemini 3 Flash | Best Telugu capabilities | $ |
| Grammar/error evaluation | Claude Sonnet | Superior instruction-following, consistent structured output | $$$ |
| Flashcards / vocabulary drills | GPT-4o-mini | 20x cheaper than GPT-4o, sufficient for simple tasks | $ |
| Quiz generation | GPT-4o-mini | Simple structured output | $ |
| Session summaries | GPT-4o-mini | Routine summarization | $ |
| Code-switch analysis | Gemini 3 Flash or GPT-4o | Needs strong multilingual understanding | $$ |
| STT (all languages) | gpt-4o-transcribe | Best accuracy for both Chinese and Telugu | Per-audio |
| TTS (all languages) | gpt-4o-mini-tts | Verified working, steerable, cheap | Per-character |

### Routing Logic

```typescript
function selectModel(task: TaskType, language: Language): string {
  const routingTable: Record<TaskType, Record<Language, string>> = {
    lesson_generation:  { zh: "gemini-3-flash-preview", te: "gemini-3-flash-preview" },
    conversation:       { zh: "gpt-4o",                 te: "gemini-3-flash-preview" },
    grammar_evaluation: { zh: "claude-sonnet",           te: "claude-sonnet" },
    flashcard:          { zh: "gpt-4o-mini",             te: "gpt-4o-mini" },
    quiz:               { zh: "gpt-4o-mini",             te: "gpt-4o-mini" },
    summary:            { zh: "gpt-4o-mini",             te: "gpt-4o-mini" },
    code_switch:        { zh: "gpt-4o",                  te: "gemini-3-flash-preview" },
  };
  return routingTable[task][language];
}
```

### Cost Estimation (Personal Use)

Assuming ~1 hour of active use per day:
- ~5-10 lesson generations/day → Gemini Flash → negligible cost
- ~50-100 conversation turns/day → GPT-4o/Gemini → ~$0.50-1.00/day
- ~20-30 drills/quizzes/day → GPT-4o-mini → ~$0.02/day
- ~15 minutes of audio STT → gpt-4o-transcribe → ~$0.10/day
- ~15 minutes of TTS → gpt-4o-mini-tts → ~$0.05/day

**Estimated total: $5-20/month** with intelligent routing.

## Integration Patterns

### OpenAI SDK (Primary)

Used for: chat completions, audio transcription, TTS, Gemini via OpenAI-compat

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["AGODA_GENAI_API_KEY"],
    base_url="https://genai-gateway.agoda.is/v1"
)

# Chat (works with GPT, Claude, Gemini models)
response = client.chat.completions.create(
    model="gemini-3-flash-preview",
    messages=[{"role": "user", "content": "Generate a lesson plan..."}]
)

# STT
transcript = client.audio.transcriptions.create(
    model="gpt-4o-transcribe",
    file=audio_file,
    language="zh"
)

# TTS
audio = client.audio.speech.create(
    model="gpt-4o-mini-tts",
    voice="coral",
    input="你好，你叫什么名字？",
    instructions="Speak naturally in Mandarin Chinese"
)
```

### Google Native Client (For Gemini-Specific Features)

Used for: batch processing, file uploads, Gemini-only features

```python
from google import genai

client = genai.Client(
    api_key=os.environ["AGODA_GENAI_API_KEY"],
    http_options={"base_url": "https://genai-gateway.agoda.is/gemini"}
)
```

### Streaming Chat (For Conversation Mode)

```typescript
// SvelteKit API route: src/routes/api/chat/+server.ts
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: conversationHistory,
  stream: true,
});

// Stream via SSE to client
return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) controller.enqueue(new TextEncoder().encode(content));
      }
      controller.close();
    }
  }),
  { headers: { "Content-Type": "text/event-stream" } }
);
```

## Key Constraints & Gotchas

1. **Gemini TTS via native audio modality does NOT work through the gateway** — use gpt-4o-mini-tts instead
2. **whisper-1 does NOT support Telugu** — always use gpt-4o-transcribe for Telugu STT
3. **gpt-4o-mini-transcribe outputs Traditional Chinese** — use gpt-4o-transcribe if Simplified is needed
4. **Confirm Realtime API availability** — WebSocket-based gpt-4o-realtime may not be proxied. For conversation, use the STT → LLM → TTS pipeline instead
5. **Check model names in the catalog** — exact model identifiers may change (e.g., `gemini-3-flash-preview` vs `gemini-3-flash`)
6. **VPN may be required** — if accessing from home, verify `genai-gateway.agoda.is` is reachable

## Lesson Language Support (Non-English Instruction)

Lesson content is delivered in the learner's chosen lesson language, NOT English. Initial pairings:
- Chinese Mandarin taught **in Hindi** (`hi`)
- Telugu taught **in Thai** (`th`)

### Implications for AI Pipeline

| Component | Impact |
|---|---|
| **Lesson generation prompts** | System prompts must instruct the LLM to generate explanations, instructions, and cultural context in Hindi or Thai |
| **Conversation tutor** | Error corrections and recasting must be in the lesson language (e.g., Hindi explanations of Chinese grammar) |
| **TTS for instructions** | TTS must generate Hindi and Thai audio for lesson explanations (in addition to target language audio for vocabulary/phrases) |
| **STT for code-switching** | Must detect Hindi words mixed into Chinese speech, or Thai words mixed into Telugu speech |
| **Quiz/review UI** | Quiz prompts and feedback rendered in the lesson language |
| **Model selection** | Gemini excels at Hindi; verify Thai quality. GPT-4o is strong for both |

### Verified: Hindi & Thai Audio Quality (March 23, 2026)

Tested 5 phrases each for Hindi and Thai via `gpt-4o-mini-tts` (TTS) and both transcription models (STT).

**Hindi Results:**

| Model | Result | Notes |
|---|---|---|
| `gpt-4o-mini-tts` | ✅ 5/5 perfect | 0.89–3.55s, 37–55 KB |
| `gpt-4o-transcribe` | ✅ 5/5 correct | Adds purna viram (।) — cosmetic only, trivially strippable |
| `gpt-4o-mini-transcribe` | ✅ 5/5 correct | Same punctuation behavior |

**Thai Results:**

| Model | Result | Notes |
|---|---|---|
| `gpt-4o-mini-tts` | ✅ 5/5 perfect | 1.35–1.79s, 39–58 KB |
| `gpt-4o-transcribe` | ⚠️ 4/5 correct | Misheard กรุณา as ครูนา on one phrase. Others exact or near-exact |
| `gpt-4o-mini-transcribe` | ⚠️ 3/5 correct | Additional errors: ฉัน→ซัน, spacing issues |

**Conclusion:** Hindi is production-ready for both TTS and STT. Thai TTS is excellent; Thai STT via `gpt-4o-transcribe` is good (4/5) and acceptable for lesson language use — Thai is the instruction language, not the target language being graded, so occasional STT quirks have minimal impact. Use `gpt-4o-transcribe` for all languages.
