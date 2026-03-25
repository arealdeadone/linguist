import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getScenarios } from '$lib/data/scenarios';
import { getLearnerById } from '$lib/server/data/learners';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	if (!learnerId) redirect(302, '/');

	const learner = await getLearnerById(learnerId);
	if (!learner) redirect(302, '/');

	const scenarios = getScenarios(
		learner.cefrLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
		learner.targetLanguage as 'zh' | 'te'
	);

	return {
		learner: {
			id: learner.id,
			name: learner.name,
			targetLanguage: learner.targetLanguage,
			lessonLanguage: learner.lessonLanguage,
			cefrLevel: learner.cefrLevel
		},
		scenarios
	};
};
