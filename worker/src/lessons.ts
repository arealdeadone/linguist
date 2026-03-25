import { chatJSON } from './ai';
import { trackUsage } from './cost-tracker';
import { getLanguageNames } from './data/languages';
import { getDueVocab, getVocabByLearnerId } from './data/vocabulary';
import { getLearnerById } from './data/learners';
import { MAX_NEW_VOCAB_PER_SESSION, SESSION_TIME_ALLOCATION, type CefrLevel } from '@linguist/ai-core';
import type { LessonPlan } from './types';

export async function generateLessonPlan(
	learnerId: string,
	week: number,
	day: number,
	theme?: string
): Promise<LessonPlan> {
	const learner = await getLearnerById(learnerId);
	if (!learner) throw new Error('Learner not found');

	const targetLang = learner.targetLanguage;
	const lessonLang = learner.lessonLanguage;
	const cefrLevel = learner.cefrLevel as CefrLevel;

	const knownVocab = await getVocabByLearnerId(learnerId);
	const knownWords = knownVocab.map((v) => v.word);
	const dueCards = await getDueVocab(learnerId, 5);
	const reviewWords = dueCards.map((c) => c.word);
	const maxNewVocab = MAX_NEW_VOCAB_PER_SESSION[cefrLevel] ?? 5;

	const langNames = await getLanguageNames();
	const targetLangName = langNames[targetLang] ?? targetLang;
	const lessonLangName = langNames[lessonLang] ?? lessonLang;

	const messages = [
		{
			role: 'system' as const,
			content: `You are an expert ${targetLangName} language tutor using Total Physical Response (TPR) methodology.

CRITICAL PEDAGOGY RULES:
1. ALL explanations, instructions, cultural notes, and descriptions MUST be in ${lessonLangName}. NEVER use English.
2. Vocabulary is taught via vivid scene descriptions and sensory associations, NOT translations.
3. Each vocabulary word MUST include:
   - "word": the ${targetLangName} word
   - "romanization": pronunciation guide
   - "meaning": a SHORT meaning/definition in ${lessonLangName} (NOT English)
   - "scene_description": a vivid 1-2 sentence scene in ${lessonLangName} that paints a picture of the word's meaning through action, sensation, or context. Use imagery the learner can visualize.

EXAMPLE for Chinese word 水 (water) with Hindi lesson language:
{
  "word": "水",
  "romanization": "shuǐ",
  "meaning": "पानी",
  "scene_description": "गर्मी के दिन में, एक ठंडा गिलास पानी - आप प्यासे हैं और पहला घूंट लेते हैं। ठंडक महसूस होती है।"
}

EXAMPLE for Telugu word నీళ్ళు (water) with Thai lesson language:
{
  "word": "నీళ్ళు",
  "romanization": "nīḷḷu",
  "meaning": "น้ำ",
  "scene_description": "วันร้อน คุณหยิบแก้วน้ำเย็น ยกขึ้นดื่ม รู้สึกเย็นชื่นใจ"
}

Generate a lesson plan as JSON:
{
  "id": "string (format: lang-level-weekN-dayN)",
  "cefr_level": "${cefrLevel}",
  "week": ${week},
  "day": ${day},
  "theme": "string (in ${lessonLangName})",
  "duration_minutes": number (25-40),
  "learning_objectives": ["string", ...] (in ${lessonLangName}),
  "vocabulary_targets": [
    { "word": "...", "romanization": "...", "meaning": "... (in ${lessonLangName})", "scene_description": "... (vivid scene in ${lessonLangName})" }
  ] (${maxNewVocab} new words),
  "review_words": ${JSON.stringify(reviewWords)},
  "activities": [
    {"type": "listening", "duration_min": number},
    {"type": "vocabulary_tpr", "duration_min": number},
    {"type": "speaking", "duration_min": number},
    {"type": "conversation", "duration_min": number},
    {"type": "srs_review", "duration_min": number},
    {"type": "quiz", "duration_min": number}
  ],

Time allocation per activity (must follow these ratios):
- vocabulary_tpr: ${Math.round(SESSION_TIME_ALLOCATION.vocabulary_tpr * 100)}% of session
- listening: ${Math.round(SESSION_TIME_ALLOCATION.listening * 100)}% of session
- speaking + conversation: ${Math.round(SESSION_TIME_ALLOCATION.speaking * 100)}% of session
- srs_review: ${Math.round(SESSION_TIME_ALLOCATION.srs_review * 100)}% of session
- cultural (included in listening or as quiz): ${Math.round(SESSION_TIME_ALLOCATION.cultural * 100)}% of session
  "colloquial_phrase": "string (${targetLangName} phrase with explanation in ${lessonLangName})",
  "cultural_note": "string (in ${lessonLangName})"
}

Rules:
- vocabulary_targets MUST NOT include words the learner already knows: ${JSON.stringify(knownWords.slice(-50))}
- Theme${theme ? `: ${theme}` : ' should be appropriate for the level and engaging'}
- i+1 comprehensible input: The learner knows ${knownWords.length} words. Any text content in the lesson (sentences, examples, cultural notes) must use ~90% known vocabulary and only ~10% new words. The new words should be deducible from context.
- scene_description must evoke physical actions, sensory details, or vivid mental images — NOT dictionary definitions
- meaning must be in ${lessonLangName}, NEVER in English`
		},
		{
			role: 'user' as const,
			content: `Generate a ${cefrLevel} lesson plan for week ${week}, day ${day}.${theme ? ` Theme: ${theme}` : ''} Remember: ALL text except ${targetLangName} words must be in ${lessonLangName}.`
		}
	];

	const plan = await chatJSON<LessonPlan>(messages, 'lesson_generation', targetLang, {
		temperature: 0.5,
		onUsage: (u) =>
			trackUsage({
				learnerId,
				task: 'lesson_generation',
				...u
			}).catch(console.error)
	});

	return plan;
}
