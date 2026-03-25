# Pedagogy & Curriculum Design

## Theoretical Foundations

### 1. Comprehensible Input (Stephen Krashen)

**i+1 principle**: Every piece of content the learner encounters must be ~90-98% understandable. The remaining 2-10% is the acquisition zone — the brain fills gaps through context, not translation.

| Comprehension Level | Result |
|---|---|
| < 90% | Noise — learner shuts down |
| 90–98% | **Acquisition zone** — optimal |
| 100% | No growth — too easy |

**App implementation**: The AI must know the learner's current vocabulary list and generate content where 90% of words are known, with 2-3 new words deducible from context. This is the single most important constraint on all content generation prompts.

### 2. Total Physical Response (TPR)

Associate words with physical actions/images, not translations. "水 (shuǐ)" → image of water + gesture of drinking, NOT "water = 水".

**App implementation**: Vocabulary is introduced via image + audio + vivid scene description. The system prompt explicitly forbids L1 translations and instead requires contextual demonstration.

### 3. Natural Order & Acquisition vs Learning

Krashen distinguishes between *acquisition* (subconscious, from meaningful interaction) and *learning* (conscious study of rules). Acquisition is what produces fluency.

**App implementation**: Two separate modes:
- **Immersion conversation** (acquisition) — freeform, no explicit grammar teaching
- **Grammar explainer** (learning) — available on demand at B1+, framed as "patterns you've already heard"

### 4. Affective Filter Hypothesis

Anxiety, low motivation, or low self-confidence raise the "affective filter" and block acquisition.

**App implementation**: No red X marks, no harsh scoring. Gentle recasting. Low-stakes conversation mode. Progress measured by mastery metrics, not completion metrics (anti-Duolingo streaks).

## SM-2 Spaced Repetition Algorithm

The backbone of the entire system. Every vocabulary item is tracked with SM-2 state.

### Algorithm

```
function review(card, quality):
    // quality: 0-5
    // 0-2 = failed recall → reset
    // 3 = correct but hard
    // 4 = correct with hesitation  
    // 5 = perfect

    if quality < 3:
        card.repetition = 0
        card.interval = 1
    else:
        if card.repetition == 0: card.interval = 1
        elif card.repetition == 1: card.interval = 6
        else: card.interval = round(card.interval * card.ef)
        card.repetition += 1

    // Update easiness factor
    card.ef = card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if card.ef < 1.3: card.ef = 1.3

    card.next_review = today + card.interval days
```

### Typical Interval Progression (EF=2.5)

```
Review 1 → 1 day
Review 2 → 6 days
Review 3 → 15 days
Review 4 → 37 days
Review 5 → 92 days
```

### Multi-Modal Quality Scoring

Standard SM-2 is card-based. For language learning, quality scores depend on the modality:

| Modality | Quality Score |
|---|---|
| Recognized word while listening | 3 (correct but passive) |
| Recalled word while speaking | 4 (active recall) |
| Used correctly in conversation | 5 (perfect, contextual) |
| Confused with similar word | 2 (reset interval) |
| Completely forgotten | 0 (full reset) |

### Vocabulary Item Schema

```json
{
  "word": "吃饭",
  "pinyin": "chīfàn",
  "cefr_level": "A1",
  "sm2": {
    "repetition": 3,
    "interval": 15,
    "ef": 2.6,
    "next_review": "2026-03-28"
  },
  "modality_scores": {
    "listening_recognition": 4,
    "speaking_recall": 3,
    "contextual_use": 2
  }
}
```

### SRS → AI Integration

The SRS scheduler tells the AI which words are due for review. The AI weaves them naturally into conversation rather than flashcard-style drilling:

```
Today's review words for this learner: [吃饭, 喝水, 你好].
Conduct a casual conversation about their day.
Naturally use each review word at least once.
Note when the learner uses them correctly/incorrectly.
After conversation, return: { "word": "吃饭", "quality": 4 }
```

## CEFR Curriculum Structure

### Level Breakdown

| Level | Vocabulary | Duration (est.) | App Focus |
|---|---|---|---|
| **A1** | 400-500 words | 2-3 months | TPR vocab, listening to slow native speech, image association, tone foundation (Chinese) |
| **A2** | 1,500-2,000 | 3-4 months | Short dialogues, colloquial phrases, first speaking practice, passive character recognition |
| **B1** | 3,000-4,000 | 4-6 months | Conversation practice, mixed topics, error correction begins, writing introduced, grammar patterns explained |
| **B2** | 6,000-8,000 | 6-9 months | Abstract topics, native-speed content, debate, idioms |
| **C1** | 12,000+ | 9-12 months | Professional fluency, cultural nuance, humor |
| **C2** | 20,000+ | Open-ended | Literature, slang, regional variation |

### Progression Gates

```
A1 → A2: 80% of A1 core vocab retained in SRS + can complete 3 basic dialogues
A2 → B1: Can sustain 5-minute conversation on familiar topic + 80% A2 vocab retained
B1 → B2: Can understand 70% of native-speed audio without scaffolding
B2 → C1: Can discuss abstract topics with <5% grammar errors
```

### Mandarin-Specific Curriculum Ordering

```
Week 1-4 (A1):
  - 50 high-frequency nouns (food, body, family, numbers)
  - Tones via listening — minimize pinyin crutch after week 2
  - Greetings + basic phrases (colloquial, not textbook)
  - Characters: recognize 20 most common (not write yet)

Week 5-12 (A1→A2):
  - 200 more words (verbs, adjectives)
  - Simple sentence patterns emerge naturally from input
  - First speaking: broken sentences OK, encouraged
  - Native audio clips: slow, then normal speed

Month 4-6 (A2):
  - Grammar patterns introduced as "things you've already heard"
  - Colloquial contractions
  - Writing introduced: characters for known words only
```

### Telugu-Specific Notes

- Agglutinative morphology: words built by stacking suffixes → **vocab-first is even more critical** since roots are the foundation
- Introduce verb roots before conjugations
- Colloquial Telugu differs significantly from formal/written — teach spoken first
- Script (Telugu script) comes after spoken foundation

## Lesson Plan Structure

### Lesson Schema

```json
{
  "id": "mandarin-a1-week2-day3",
  "cefr_level": "A1",
  "week": 2,
  "day": 3,
  "theme": "food and eating",
  "duration_minutes": 35,
  "learning_objectives": [
    "Recognize and use 5 food vocabulary words",
    "Understand the sentence pattern: 我想吃___",
    "Listen to and repeat a native speaker ordering food"
  ],
  "vocabulary_targets": ["米饭", "面条", "饺子", "好吃", "想"],
  "review_words": ["你好", "谢谢", "多少钱"],
  "activities": [
    { "type": "listening", "duration_min": 5 },
    { "type": "vocabulary_tpr", "duration_min": 10 },
    { "type": "conversation", "duration_min": 15 },
    { "type": "srs_review", "duration_min": 5 }
  ],
  "colloquial_phrase": "好吃死了！(hǎo chī sǐ le) — So delicious!",
  "cultural_note": "In China, asking '吃了吗?' is a common greeting"
}
```

### Lesson Sequencing Rules

1. New vocab load: max 5-7 words per session at A1, 10-12 at B1
2. Spaced repetition integration: 30% of each session = SRS review
3. Theme cycling: rotate themes every 3 lessons, revisit every 2 weeks
4. Skill rotation: listening → speaking → reading → (writing at B1+)
5. Colloquial phrase: one per lesson, always from real native usage
6. Grammar emergence: never teach rules explicitly until B1 — instead: "You've heard this pattern 20 times — here's why it works"
7. Difficulty ramp: each lesson introduces content at i+1, never i+3

### Session Time Allocation

| Activity | % of Session | Purpose |
|---|---|---|
| New vocabulary (TPR) | 25% | Introduce 3-5 new words via context, images, audio |
| Listening | 15% | Native audio with scaffolding |
| Speaking/Conversation | 30% | Production practice, the core learning moment |
| SRS Review | 20% | Review due items, update scores |
| Cultural/Colloquial | 10% | One phrase or cultural note |

## Conversation Design

### AI Tutor System Prompt Architecture

Every conversation session needs:
1. Tutor persona + language target
2. Learner profile (CEFR level, known vocab, weak areas)
3. Session goal (scenario-based)
4. Behavioral rules (correction policy, language mixing policy)
5. Output format (structured JSON for post-session analysis)

### Error Correction Strategy (Research-Backed)

| Strategy | When to Use | Example |
|---|---|---|
| **Recast** (80% of corrections) | Minor errors, flow matters | Repeat their sentence correctly: "Oh, you want 两碗面!" |
| **Explicit correction** | Repeated error, learner is ready | "The measure word for noodles is 碗, not 个" |
| **Elicitation** | Learner is close | "How do you say that with the right measure word?" |
| **Metalinguistic clue** | Grammar pattern | "Remember, time words come before the verb in Mandarin" |
| **Clarification request** | Comprehension failure | "Sorry, I didn't quite understand — can you say that again?" |

Critical rules:
- Maximum 1 correction per conversation turn
- Prioritize: meaning-blocking errors > pronunciation > grammar > style
- Never correct if the learner's meaning was clear and conversation flowed
- Never correct mid-sentence — wait for a pause point

### Post-Session Analysis

After every conversation, the AI generates:
```json
{
  "words_used_correctly": ["吃饭", "你好"],
  "words_used_incorrectly": [{"word": "想", "error": "tone", "correction": "xiǎng not xiāng"}],
  "code_switches": [{"english_word": "want to", "target_equivalent": "想", "times_used": 2}],
  "new_patterns_demonstrated": ["我想___"],
  "srs_updates": [
    {"word": "吃饭", "quality": 5},
    {"word": "想", "quality": 2}
  ],
  "suggested_focus_next_session": "Third tone practice, especially on 想"
}
```

## Code-Switching Handling

When a learner mixes languages (e.g., "我 want to 吃 noodles"), the system:

1. **Always understands the intended meaning** — never pretends confusion
2. **Responds in the target language** — models the correct form naturally
3. **Tracks gap-fillers** — logs which L1 words were used instead of target language
4. **Auto-promotes to vocabulary targets** — when a gap-filler is used 3+ times, it becomes a vocabulary target in the next lesson
5. **Never penalizes** — code-switching is diagnostic data, not an error

### Code-Switch Tracking Schema

```json
{
  "session_id": "abc123",
  "code_switch_log": [
    {
      "turn": 3,
      "learner_said": "我 want to go 市场",
      "gap_word": "want to",
      "target_equivalent": "想去",
      "times_used_as_gap": 3,
      "priority": "high",
      "auto_added_to_next_lesson": true
    }
  ]
}
```

## Lessons from Existing Apps

| App | What Works | What Doesn't | Takeaway for Linguist |
|---|---|---|---|
| **Duolingo Max** | Contextual AI conversation, post-conversation feedback | Gamification creates completion bias (optimize streaks, not retention). Grammar-first. No native speech pipeline | Conversation as primary mode, not bonus. Mastery metrics over streaks |
| **Pimsleur** | Audio-first, speaking from lesson 1, graduated interval recall | Linear non-adaptive, no conversation AI, expensive | Audio-first is proven. Embed SRS in lesson flow |
| **Speak App** | Real-time pronunciation feedback, low-anxiety practice | Pronunciation quality varies, no curriculum progression | Pronunciation feedback is table stakes. Clear CEFR progression needed |
