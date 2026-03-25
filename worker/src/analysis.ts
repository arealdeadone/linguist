import { chatJSON } from './ai';
import { trackUsage } from './cost-tracker';
import { getConversationById, saveAnalysis } from './data/conversations';
import { getLanguageNames } from './data/languages';
import { getLearnerById } from './data/learners';
import { getVocabByLearnerId, updateSM2, updateModalityScore } from './data/vocabulary';
import { review, nextReviewDate, type SM2Card, type ReviewQuality } from './srs';
import type { ConversationAnalysis } from './types';

export async function analyzeConversation(
	conversationId: string,
	learnerId: string
): Promise<ConversationAnalysis> {
	const conversation = await getConversationById(conversationId);
	if (!conversation) throw new Error('Conversation not found');

	const learner = await getLearnerById(learnerId);
	if (!learner) throw new Error('Learner not found');

	const targetLang = learner.targetLanguage;
	const languageNames = await getLanguageNames();
	const lessonLangName = languageNames[learner.lessonLanguage] ?? learner.lessonLanguage;
	const targetLangName = languageNames[targetLang] ?? targetLang;

	const messages = conversation.messages as Array<{ role: string; content: string }>;
	const transcript = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

	const analysis = await chatJSON<ConversationAnalysis>(
		[
			{
				role: 'system',
				content: `Analyze this ${targetLangName} conversation between a learner and tutor. Return JSON with:
{
  "words_used_correctly": ["word1", "word2"],
  "words_used_incorrectly": [{"word": "...", "error": "...", "correction": "..."}],
  "code_switches": [{"turn": 0, "learner_said": "...", "gap_word": "...", "target_equivalent": "...", "times_used": 1, "auto_promoted": false}],
  "new_patterns_demonstrated": ["pattern1"],
  "srs_updates": [{"word": "...", "quality": 0-5}],
  "suggested_focus_next_session": "string in ${lessonLangName}"
}
All feedback text must be in ${lessonLangName}.`
			},
			{ role: 'user', content: transcript }
		],
		'summary',
		targetLang,
		{
			temperature: 0.3,
			onUsage: (u) =>
				trackUsage({
					learnerId,
					task: 'summary',
					...u
				}).catch(console.error)
		}
	);

	const vocab = await getVocabByLearnerId(learnerId);
	const vocabMap = new Map(vocab.map((v) => [v.word, v]));

	if (analysis.srs_updates) {
		for (const update of analysis.srs_updates) {
			const vocabItem = vocabMap.get(update.word);
			if (!vocabItem) continue;
			const card: SM2Card = {
				repetition: vocabItem.sm2Repetition,
				interval: vocabItem.sm2Interval,
				ef: vocabItem.sm2Ef
			};
			const updated = review(card, update.quality as ReviewQuality);
			await updateSM2(vocabItem.id, {
				repetition: updated.repetition,
				interval: updated.interval,
				ef: updated.ef,
				nextReview: nextReviewDate(updated.interval)
			});
			await updateModalityScore(
				vocabItem.id,
				'contextual',
				update.quality >= 3 ? Math.min(5, update.quality) : Math.max(0, update.quality)
			).catch((e) => console.error('Modality update failed:', e));
		}
	}

	if (analysis.words_used_correctly) {
		for (const word of analysis.words_used_correctly) {
			const vocabItem = vocabMap.get(word);
			if (vocabItem) {
				await updateModalityScore(vocabItem.id, 'contextual', 5).catch((e) =>
					console.error('Modality update failed:', e)
				);
			}
		}
	}

	await saveAnalysis(conversationId, analysis as unknown as Record<string, unknown>);
	return analysis;
}
