import type { PageServerLoad } from './$types';
import { getAllLearners } from '$lib/server/data/learners';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	const learners = await getAllLearners();
	return { learnerId, learners };
};
