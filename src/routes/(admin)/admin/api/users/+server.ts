import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllLearners, createLearner } from '$lib/server/data/learners';
import { getVocabCount, getDueCount } from '$lib/server/data/vocabulary';

export const GET: RequestHandler = async () => {
	const learners = await getAllLearners();
	const enriched = await Promise.all(
		learners.map(async (l) => {
			const [vocabCount, dueCount] = await Promise.all([getVocabCount(l.id), getDueCount(l.id)]);
			return { ...l, vocabCount, dueCount };
		})
	);
	return json(enriched);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, pin, targetLanguage, lessonLanguage } = body;
	if (!name || !targetLanguage || !lessonLanguage) {
		return json({ error: 'name, targetLanguage, and lessonLanguage required' }, { status: 400 });
	}
	const learner = await createLearner({ name, pin, targetLanguage, lessonLanguage });
	return json(learner, { status: 201 });
};
