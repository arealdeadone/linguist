import type { PageServerLoad } from './$types';
import { getLessonsByLearnerId } from '$lib/server/data/lessons';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	if (!learnerId) redirect(302, '/');
	const lessons = await getLessonsByLearnerId(learnerId);
	return { lessons, learnerId };
};
