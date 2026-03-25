import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveQuizResult } from '$lib/server/data/quiz-results';
import { getVocabByLearnerId, updateSM2 } from '$lib/server/data/vocabulary';
import { review, nextReviewDate } from '$lib/server/srs';
import type { SM2Card, ReviewQuality } from '$lib/server/srs';

interface QuizAnswer {
	word?: string;
	correct?: boolean;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { learnerId, lessonId, quizType, questions, answers, score } = body;

	if (!learnerId || !quizType || !questions || !answers) {
		return json(
			{ error: 'learnerId, quizType, questions, and answers required' },
			{ status: 400 }
		);
	}

	const vocab = await getVocabByLearnerId(learnerId);
	const vocabMap = new Map(vocab.map((v) => [v.word, v]));
	const srsUpdates: Record<string, unknown>[] = [];

	if (Array.isArray(answers)) {
		for (const answerRaw of answers) {
			const answer = answerRaw as QuizAnswer;
			const word = answer.word;
			const correct = answer.correct;
			if (typeof word !== 'string' || typeof correct !== 'boolean') continue;

			const vocabItem = vocabMap.get(word);
			if (!vocabItem) continue;

			const quality: ReviewQuality = correct ? 4 : 1;
			const card: SM2Card = {
				repetition: vocabItem.sm2Repetition,
				interval: vocabItem.sm2Interval,
				ef: vocabItem.sm2Ef
			};
			const updated = review(card, quality);
			const nextDate = nextReviewDate(updated.interval);

			await updateSM2(vocabItem.id, {
				repetition: updated.repetition,
				interval: updated.interval,
				ef: updated.ef,
				nextReview: nextDate
			});

			srsUpdates.push({ word, quality, interval: updated.interval });
		}
	}

	const result = await saveQuizResult({
		learnerId,
		lessonId,
		quizType,
		questions,
		answers,
		score,
		srsUpdates: { updates: srsUpdates }
	});

	return json(result, { status: 201 });
};
