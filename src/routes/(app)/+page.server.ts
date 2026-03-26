import type { PageServerLoad } from './$types';
import { getLearnerById } from '$lib/server/data/learners';

export const load: PageServerLoad = async ({ parent, depends, locals }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	if (!learnerId) return { learner: null };

	const learner = await getLearnerById(learnerId);
	if (!learner) {
		console.error('Home load failed: learner profile missing for authenticated session', {
			learnerId,
			userId: locals.user?.id ?? null
		});
		return { learner: null };
	}

	return { learnerId, learner };
};
