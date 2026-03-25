import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getDueVocab,
	getVocabByLearnerId,
	updateSM2,
	getVocabById,
	updateModalityScore
} from '$lib/server/data/vocabulary';
import { review, nextReviewDate } from '$lib/server/srs';
import type { SM2Card, ReviewQuality } from '$lib/server/srs';

export const GET: RequestHandler = async ({ url }) => {
	const learnerId = url.searchParams.get('learnerId');
	if (!learnerId) return json({ error: 'learnerId required' }, { status: 400 });

	if (url.searchParams.get('all') === 'true') {
		const allVocab = await getVocabByLearnerId(learnerId);
		return json(allVocab);
	}

	const limit = parseInt(url.searchParams.get('limit') ?? '20');
	const dueCards = await getDueVocab(learnerId, limit);
	return json(dueCards);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { vocabId, quality, modality } = body;

	if (!vocabId || quality === undefined) {
		return json({ error: 'vocabId and quality required' }, { status: 400 });
	}

	if (quality < 0 || quality > 5) {
		return json({ error: 'quality must be 0-5' }, { status: 400 });
	}

	const vocab = await getVocabById(vocabId);
	if (!vocab) return json({ error: 'Vocabulary not found' }, { status: 404 });

	const card: SM2Card = {
		repetition: vocab.sm2Repetition,
		interval: vocab.sm2Interval,
		ef: vocab.sm2Ef
	};

	const updated = review(card, quality as ReviewQuality);
	const nextDate = nextReviewDate(updated.interval);

	const result = await updateSM2(vocabId, {
		repetition: updated.repetition,
		interval: updated.interval,
		ef: updated.ef,
		nextReview: nextDate
	});

	const scoreModality: 'listening' | 'speaking' | 'contextual' = modality ?? 'listening';
	const modalityValue = quality >= 3 ? Math.min(5, quality) : Math.max(0, quality);
	await updateModalityScore(vocabId, scoreModality, modalityValue).catch((e) =>
		console.error('Modality update failed:', e)
	);

	return json(result);
};
