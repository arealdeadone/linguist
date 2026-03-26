import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVocabCount, getDueCount } from '$lib/server/data/vocabulary';

export const GET: RequestHandler = async ({ locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const [totalCards, dueToday] = await Promise.all([getVocabCount(learnerId), getDueCount(learnerId)]);

	return json({
		total_cards: totalCards,
		due_today: dueToday
	});
};
