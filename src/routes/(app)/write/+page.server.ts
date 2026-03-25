import type { PageServerLoad } from './$types';
import { getDueVocab } from '$lib/server/data/vocabulary';
import { getLearnerById } from '$lib/server/data/learners';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	if (!learnerId) redirect(302, '/');
	const learner = await getLearnerById(learnerId);
	if (!learner) redirect(302, '/');
	const dueCards = await getDueVocab(learnerId, 20);
	return { learner, dueCards };
};
