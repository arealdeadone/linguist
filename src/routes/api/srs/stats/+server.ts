import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVocabCount, getDueCount } from '$lib/server/data/vocabulary';

export const GET: RequestHandler = async ({ url }) => {
	const learnerId = url.searchParams.get('learnerId');
	if (!learnerId) return json({ error: 'learnerId required' }, { status: 400 });

	const [totalCards, dueToday] = await Promise.all([getVocabCount(learnerId), getDueCount(learnerId)]);

	return json({
		total_cards: totalCards,
		due_today: dueToday
	});
};
